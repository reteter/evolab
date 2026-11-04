import {
  createInitialPopulation,
  createNextPopulation,
  summarizeGeneration,
  validateRunConfig
} from "../domain/evolution";
import { createTerrain } from "../domain/world";
import {
  createManifest,
  CONCURRENT_TRIALS,
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
import type { SimulationExecutor } from "../simulation/simulation-executor";
import { LocalSimulationExecutor } from "../simulation/local-simulation-executor";
import { RunLog } from "./run-log";
import type { RunCheckpoint } from "../storage/indexed-db";

export type RunStatus =
  | "idle"
  | "running"
  | "paused"
  | "replay"
  | "stopped"
  | "error";

export interface RunViewState {
  runId: string | null;
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
  activeTrials: readonly LiveTrial[];
  history: readonly GenerationSummary[];
  bestRecord: BestRecord | null;
  message: string;
}

export interface LiveTrial {
  genome: Genome;
  snapshot: TrialSnapshot;
  distance: number;
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

  private onCheckpoint?: (runId: string, checkpoint: RunCheckpoint) => Promise<void>;
  private readonly executor: SimulationExecutor;

  constructor(
    simulationOrExecutor: SimulationPort | SimulationExecutor,
    private readonly scheduler: RunScheduler = browserScheduler,
    options?: {
      onCheckpoint?: (runId: string, checkpoint: RunCheckpoint) => Promise<void>;
    }
  ) {
    if ("evaluatePopulation" in simulationOrExecutor) {
      this.executor = simulationOrExecutor;
    } else {
      this.executor = new LocalSimulationExecutor(simulationOrExecutor);
    }
    this.onCheckpoint = options?.onCheckpoint;
  }

  setCheckpointHandler(handler: (runId: string, checkpoint: RunCheckpoint) => Promise<void>): void {
    this.onCheckpoint = handler;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): RunViewState {
    return this.state;
  }

  async start(config: RunConfig, runId: string = crypto.randomUUID()): Promise<void> {
    const issues = validateRunConfig(config);
    if (issues.length > 0) {
      throw new Error(issues.join(" "));
    }

    const currentToken = ++this.token;
    this.stopRequested = false;
    this.paused = false;
    this.replayReturnStatus = null;

    const frozenConfig = Object.freeze({ ...config });
    const terrain = createTerrain(
      frozenConfig.seed,
      frozenConfig.terrainProfile,
      frozenConfig.difficulty
    );
    const manifest = createManifest(frozenConfig);
    const log = new RunLog();
    const population = createInitialPopulation(frozenConfig);
    const generation = 1;

    this.state = {
      ...initialState(),
      runId,
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

    if (this.onCheckpoint) {
      await this.onCheckpoint(runId, {
        completedGenerations: 0,
        nextPopulation: population,
        history: [...log.getSummaries()],
        samplingStride: log.getSamplingStride(),
        bestRecord: log.getBestRecord(),
        config: frozenConfig,
        manifest,
        updatedAt: Date.now()
      });
    }

    await this.runLoop(runId, frozenConfig, terrain, manifest, log, population, generation, currentToken);
  }

  async resumeCheckpoint(
    runId: string,
    checkpoint: RunCheckpoint
  ): Promise<void> {
    const issues = validateRunConfig(checkpoint.config);
    if (issues.length > 0) {
      throw new Error(issues.join(" "));
    }

    const currentToken = ++this.token;
    this.stopRequested = false;
    this.paused = false;
    this.replayReturnStatus = null;

    const frozenConfig = Object.freeze({ ...checkpoint.config });
    const terrain = createTerrain(
      frozenConfig.seed,
      frozenConfig.terrainProfile,
      frozenConfig.difficulty
    );
    const manifest = createManifest(frozenConfig);
    const log = new RunLog();
    log.restore(checkpoint.history, checkpoint.samplingStride, checkpoint.bestRecord);

    const generation = checkpoint.completedGenerations + 1;
    const population = checkpoint.nextPopulation;

    this.state = {
      ...initialState(),
      runId,
      status: "running",
      mode: this.state.mode,
      manifest,
      terrain,
      generation,
      completedGenerations: checkpoint.completedGenerations,
      populationSize: frozenConfig.populationSize,
      remainingTrials: population.length,
      history: log.getSummaries(),
      bestRecord: log.getBestRecord(),
      overallBest: log.getBestRecord()?.result.maxDistance ?? 0,
      message: `Pokolenie ${generation} ruszyło`
    };
    this.emit();

    await this.runLoop(runId, frozenConfig, terrain, manifest, log, population, generation, currentToken);
  }

  private async runLoop(
    runId: string,
    frozenConfig: RunConfig,
    terrain: Terrain,
    manifest: RunManifest,
    log: RunLog,
    initialPop: Genome[],
    initialGen: number,
    currentToken: number
  ): Promise<void> {
    let population = initialPop;
    let generation = initialGen;

    try {
      while (!this.stopRequested && currentToken === this.token) {
        const results = await this.evaluatePopulation(
          population, terrain, generation, log, currentToken
        );

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

        const nextPopulation = createNextPopulation(results, frozenConfig, generation + 1);

        if (this.onCheckpoint && currentToken === this.token && !this.stopRequested) {
          await this.onCheckpoint(runId, {
            completedGenerations: generation,
            nextPopulation,
            history: [...log.getSummaries()],
            samplingStride: log.getSamplingStride(),
            bestRecord: log.getBestRecord(),
            config: frozenConfig,
            manifest,
            updatedAt: Date.now()
          });
        }

        generation += 1;
        population = nextPopulation;
        this.state = {
          ...this.state,
          generation,
          candidateIndex: 0,
          remainingTrials: population.length,
          generationBest: 0,
          generationAverage: 0,
          currentDistance: 0,
          currentGenome: null,
          currentSnapshot: null,
          activeTrials: [],
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

  pause(): Promise<void> | void {
    if (this.state.status !== "running") {
      return;
    }
    this.paused = true;
    this.state = { ...this.state, status: "paused", message: "Pauza" };
    this.emit();
    return this.executor.pause(this.token);
  }

  resume(): void {
    if (this.state.status !== "paused") {
      return;
    }
    this.paused = false;
    this.executor.resume(this.token);
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
    this.executor.terminate();
    this.state = {
      ...this.state,
      status: "stopped",
      remainingTrials: 0,
      activeTrials: [],
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
    this.executor.setMode(mode, this.token);
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
      void this.executor.pause(this.token);
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
      this.executor.resume(this.token);
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

  private async evaluatePopulation(
    population: Genome[],
    terrain: Terrain,
    generation: number,
    log: RunLog,
    currentToken: number
  ): Promise<TrialResult[]> {
    const results: TrialResult[] = [];
    const activeMap = new Map<string, LiveTrial>();
    let lastFinished: TrialResult | null = null;
    let lastEmitTime = 0;

    const publish = (force = false) => {
      if (currentToken !== this.token || this.stopRequested) return;

      const now = this.scheduler.now();
      const mode = this.state.mode;

      if (!force) {
        if (mode === "headless" && now - lastEmitTime < 200) {
          return;
        }
        if (mode !== "headless" && now - lastEmitTime < 15) {
          return;
        }
      }
      lastEmitTime = now;

      const trials = Array.from(activeMap.values());
      const leader = trials.reduce<LiveTrial | null>(
        (best, trial) => (best === null || trial.distance > best.distance ? trial : best),
        null
      );
      const partial = summarizeGeneration(generation, results);

      this.state = {
        ...this.state,
        generation,
        candidateIndex: results.length,
        remainingTrials: population.length - results.length,
        activeTrials: trials,
        currentGenome: leader?.genome ?? lastFinished?.genome ?? null,
        currentSnapshot: leader?.snapshot ?? lastFinished?.trace.at(-1) ?? null,
        currentDistance: leader?.distance ?? lastFinished?.maxDistance ?? 0,
        generationBest: partial.bestDistance,
        generationAverage: partial.averageDistance,
        overallBest: log.getBestRecord()?.result.maxDistance ?? 0,
        bestRecord: log.getBestRecord(),
        message: `${trials.length} na trasie · ${results.length}/${population.length} ocenionych`
      };
      this.emit();
    };

    const observer = {
      onSnapshot: (genome: Genome, snapshot: TrialSnapshot, distance: number) => {
        if (currentToken !== this.token || this.stopRequested) return;
        activeMap.set(genome.id, { genome, snapshot, distance });
        publish();
      },
      onResult: (result: TrialResult) => {
        if (currentToken !== this.token || this.stopRequested) return;
        results.push(result);
        log.considerResult(generation, result);
        lastFinished = result;
        activeMap.delete(result.genome.id);
        publish(true);
      }
    };

    const finalResults = await this.executor.evaluatePopulation({
      population,
      terrain,
      generation,
      mode: this.state.mode,
      runToken: currentToken,
      observer,
      shouldStop: () => this.stopRequested || currentToken !== this.token,
      isPaused: () => this.paused || this.state.status === "replay"
    });

    if (currentToken !== this.token || this.stopRequested) {
      return [];
    }

    return finalResults;
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
    runId: null,
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
    activeTrials: [],
    history: [],
    bestRecord: null,
    message: "Gotowy do nowego przebiegu"
  };
}
