import {
  createInitialPopulation,
  createNextPopulation,
  rankResults,
  summarizeGeneration,
  validateRunConfig
} from "../domain/evolution";
import { createTerrain } from "../domain/world";
import {
  createManifest,
  type BestRecord,
  type GenerationSummary,
  type Genome,
  type RunConfig,
  type RunManifest,
  type RunMode,
  type Terrain,
  type TrialResult,
  type TrialSnapshot
} from "../domain/types";
import type { SimulationPort } from "../simulation/simulation-port";
import { RunLog } from "./run-log";
import { TrialEvaluation } from "./trial-evaluation";

export type RunStatus =
  | "idle"
  | "running"
  | "paused"
  | "replay"
  | "stopped"
  | "error";

export interface RunViewState {
  status: RunStatus;
  mode: RunMode;
  manifest: RunManifest | null;
  terrain: Terrain | null;
  generation: number;
  completedGenerations: number;
  candidateIndex: number;
  populationSize: number;
  remainingTrials: number;
  currentDistance: number;
  generationBest: number;
  generationAverage: number;
  overallBest: number;
  currentGenome: Genome | null;
  currentSnapshot: TrialSnapshot | null;
  history: readonly GenerationSummary[];
  bestRecord: BestRecord | null;
  message: string;
}

export interface RunScheduler {
  now(): number;
  nextFrame(): Promise<void>;
  nextTask(): Promise<void>;
}

type StateListener = (state: RunViewState) => void;

export class RunController {
  private readonly listeners = new Set<StateListener>();
  private state: RunViewState = initialState();
  private token = 0;
  private stopRequested = false;
  private paused = false;
  private replayReturnStatus: Exclude<RunStatus, "replay" | "error" | "idle"> | null =
    null;

  constructor(
    private readonly simulation: SimulationPort,
    private readonly scheduler: RunScheduler = browserScheduler
  ) {}

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): RunViewState {
    return this.state;
  }

  async start(config: RunConfig): Promise<void> {
    const issues = validateRunConfig(config);
    if (issues.length > 0) {
      throw new Error(issues.join(" "));
    }

    const currentToken = ++this.token;
    this.stopRequested = false;
    this.paused = false;
    this.replayReturnStatus = null;

    const frozenConfig = Object.freeze({ ...config });
    const terrain = createTerrain(frozenConfig.seed);
    const manifest = createManifest(frozenConfig);
    const log = new RunLog();
    let population = createInitialPopulation(frozenConfig);
    let generation = 1;

    this.state = {
      ...initialState(),
      status: "running",
      mode: this.state.mode,
      manifest,
      terrain,
      generation,
      populationSize: frozenConfig.populationSize,
      remainingTrials: frozenConfig.populationSize,
      message: "Pierwsze pokolenie ruszyło"
    };
    this.emit();

    try {
      while (!this.stopRequested && currentToken === this.token) {
        const results: TrialResult[] = [];

        for (let index = 0; index < population.length; index += 1) {
          if (this.stopRequested || currentToken !== this.token) {
            break;
          }

          const genome = population[index];
          if (genome === undefined) {
            throw new Error("Brak pojazdu w populacji.");
          }

          const evaluation = new TrialEvaluation(
            this.simulation.createTrial(genome, terrain),
            genome,
            terrain
          );
          this.state = {
            ...this.state,
            generation,
            candidateIndex: index + 1,
            remainingTrials: population.length - index,
            currentGenome: genome,
            currentSnapshot: evaluation.snapshot(),
            currentDistance: 0,
            message: `${genome.id} na trasie`
          };
          this.emit();

          try {
            await this.runTrial(evaluation, currentToken);
          } finally {
            evaluation.dispose();
          }

          if (!evaluation.done || this.stopRequested || currentToken !== this.token) {
            break;
          }

          const result = evaluation.result();
          results.push(result);
          log.considerResult(generation, result);
          const partial = summarizeGeneration(generation, results);
          this.state = {
            ...this.state,
            remainingTrials: population.length - index - 1,
            currentDistance: result.maxDistance,
            generationBest: partial.bestDistance,
            generationAverage: partial.averageDistance,
            overallBest: log.getBestRecord()?.result.maxDistance ?? 0,
            bestRecord: log.getBestRecord(),
            message: `${result.genome.id}: ${formatDistance(result.maxDistance)}`
          };
          this.emit();
        }

        if (results.length !== population.length) {
          break;
        }

        const summary = summarizeGeneration(generation, results);
        log.recordGeneration(summary);
        this.state = {
          ...this.state,
          completedGenerations: generation,
          history: log.getSummaries(),
          bestRecord: log.getBestRecord(),
          generationBest: summary.bestDistance,
          generationAverage: summary.averageDistance,
          overallBest: log.getBestRecord()?.result.maxDistance ?? 0,
          remainingTrials: 0,
          message: `Pokolenie ${generation} ukończone`
        };
        this.emit();

        population = createNextPopulation(results, frozenConfig, generation + 1);
        generation += 1;
        this.state = {
          ...this.state,
          generation,
          candidateIndex: 0,
          remainingTrials: population.length,
          generationBest: 0,
          generationAverage: 0,
          currentDistance: 0,
          message: `Pokolenie ${generation}`
        };
        this.emit();
        await this.scheduler.nextTask();
      }
    } catch (error) {
      if (currentToken === this.token && !this.stopRequested) {
        this.state = {
          ...this.state,
          status: "error",
          message: error instanceof Error ? error.message : "Nieznany błąd przebiegu"
        };
        this.emit();
      }
      return;
    }

    if (currentToken === this.token && this.state.status !== "error") {
      this.state = {
        ...this.state,
        status: "stopped",
        remainingTrials: 0,
        message: "Przebieg zatrzymany"
      };
      this.emit();
    }
  }

  pause(): void {
    if (this.state.status !== "running") {
      return;
    }
    this.paused = true;
    this.state = { ...this.state, status: "paused", message: "Pauza" };
    this.emit();
  }

  resume(): void {
    if (this.state.status !== "paused") {
      return;
    }
    this.paused = false;
    this.state = { ...this.state, status: "running", message: "Przebieg wznowiony" };
    this.emit();
  }

  stop(): void {
    if (this.state.status === "idle" || this.state.status === "stopped") {
      return;
    }
    this.stopRequested = true;
    this.paused = false;
    this.replayReturnStatus = null;
    this.state = {
      ...this.state,
      status: "stopped",
      remainingTrials: 0,
      message: "Przebieg zatrzymany"
    };
    this.emit();
  }

  setMode(mode: RunMode): void {
    this.state = {
      ...this.state,
      mode,
      message:
        mode === "normal"
          ? "Tempo obserwacji"
          : mode === "fast"
            ? "Przyspieszona obserwacja"
            : "Liczenie bez obrazu"
    };
    this.emit();
  }

  enterReplay(): BestRecord | null {
    const bestRecord = this.state.bestRecord;
    if (
      bestRecord === null ||
      this.state.status === "idle" ||
      this.state.status === "error" ||
      this.state.status === "replay"
    ) {
      return null;
    }

    this.replayReturnStatus = this.state.status;
    if (this.state.status === "running") {
      this.paused = true;
    }
    this.state = {
      ...this.state,
      status: "replay",
      message: `Replay ${bestRecord.result.genome.id}`
    };
    this.emit();
    return bestRecord;
  }

  exitReplay(): void {
    if (this.state.status !== "replay") {
      return;
    }

    const target = this.replayReturnStatus ?? "paused";
    this.replayReturnStatus = null;
    if (target === "running" && !this.stopRequested) {
      this.paused = false;
      this.state = { ...this.state, status: "running", message: "Przebieg wznowiony" };
    } else if (target === "paused") {
      this.paused = true;
      this.state = { ...this.state, status: "paused", message: "Pauza" };
    } else {
      this.paused = false;
      this.state = { ...this.state, status: "stopped", message: "Przebieg zatrzymany" };
    }
    this.emit();
  }

  private async runTrial(
    evaluation: TrialEvaluation,
    currentToken: number
  ): Promise<void> {
    let lastHeadlessEmit = this.scheduler.now();

    while (!evaluation.done && !this.stopRequested && currentToken === this.token) {
      if (this.paused || this.state.status === "replay") {
        await this.scheduler.nextFrame();
        continue;
      }

      const mode = this.state.mode;
      if (mode === "normal") {
        evaluation.advance();
      } else if (mode === "fast") {
        for (let step = 0; step < 10 && !evaluation.done; step += 1) {
          evaluation.advance();
        }
      } else {
        const startedAt = this.scheduler.now();
        for (let step = 0; step < 4_096 && !evaluation.done; step += 1) {
          evaluation.advance();
          if (this.scheduler.now() - startedAt >= 8) {
            break;
          }
        }
      }

      const shouldEmit =
        mode !== "headless" ||
        evaluation.done ||
        this.scheduler.now() - lastHeadlessEmit >= 40;
      if (shouldEmit) {
        this.state = {
          ...this.state,
          currentSnapshot: evaluation.snapshot(),
          currentDistance: evaluation.distance
        };
        this.emit();
        lastHeadlessEmit = this.scheduler.now();
      }

      if (!evaluation.done) {
        if (mode === "headless") {
          await this.scheduler.nextTask();
        } else {
          await this.scheduler.nextFrame();
        }
      }
    }
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

export const browserScheduler: RunScheduler = {
  now: () => performance.now(),
  nextFrame: () =>
    new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    }),
  nextTask: () =>
    new Promise((resolve) => {
      setTimeout(resolve, 0);
    })
};

function initialState(): RunViewState {
  return {
    status: "idle",
    mode: "normal",
    manifest: null,
    terrain: null,
    generation: 0,
    completedGenerations: 0,
    candidateIndex: 0,
    populationSize: 0,
    remainingTrials: 0,
    currentDistance: 0,
    generationBest: 0,
    generationAverage: 0,
    overallBest: 0,
    currentGenome: null,
    currentSnapshot: null,
    history: [],
    bestRecord: null,
    message: "Gotowy do nowego przebiegu"
  };
}

function formatDistance(value: number): string {
  return `${value.toFixed(1)} m`;
}
