import {
  createInitialPopulation,
  createNextPopulation,
  createNextPopulationFromEvaluated,
  evaluateMultiTrackIndividual,
  rankEvaluatedIndividuals,
  summarizeGeneration,
  summarizeMultiTrackGeneration,
  validateRunConfig
} from "../domain/evolution";
import { createTerrain } from "../domain/world";
import { deriveSeed } from "../domain/rng";
import {
  createManifest,
  CONCURRENT_TRIALS,
  TRIPLE_TRACK_PROFILES,
  type BestRecord,
  type EvaluatedIndividual,
  type GenerationSummary,
  type Genome,
  type RunConfig,
  type RunManifest,
  type RunMode,
  type Terrain,
  type TerrainProfile,
  type TrackTrialSummary,
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
  currentTrackProfile?: TerrainProfile;
  currentTrackIndex?: number;
  totalTracks?: number;
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
    const isTriple = frozenConfig.trainingMode === "triple";

    const initialTerrain = isTriple
      ? createTerrain(
          deriveSeed(frozenConfig.seed, "track", TRIPLE_TRACK_PROFILES[0]!),
          TRIPLE_TRACK_PROFILES[0]!,
          frozenConfig.difficulty
        )
      : createTerrain(
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
      terrain: initialTerrain,
      currentTrackProfile: isTriple ? TRIPLE_TRACK_PROFILES[0] : frozenConfig.terrainProfile,
      currentTrackIndex: isTriple ? 1 : 1,
      totalTracks: isTriple ? 3 : 1,
      generation,
      populationSize: frozenConfig.populationSize,
      remainingTrials: frozenConfig.populationSize * (isTriple ? 3 : 1),
      message: isTriple
        ? "Pokolenie 1 · Trasa 1/3 (Łagodny)"
        : "Pierwsze pokolenie ruszyło"
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

    await this.runLoop(runId, frozenConfig, initialTerrain, manifest, log, population, generation, currentToken);
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
    const isTriple = frozenConfig.trainingMode === "triple";

    const initialTerrain = isTriple
      ? createTerrain(
          deriveSeed(frozenConfig.seed, "track", TRIPLE_TRACK_PROFILES[0]!),
          TRIPLE_TRACK_PROFILES[0]!,
          frozenConfig.difficulty
        )
      : createTerrain(
          frozenConfig.seed,
          frozenConfig.terrainProfile,
          frozenConfig.difficulty
        );

    const manifest = createManifest(frozenConfig);
    const log = new RunLog();
    log.restore(checkpoint.history, checkpoint.samplingStride, checkpoint.bestRecord);

    const generation = checkpoint.completedGenerations + 1;
    const population = checkpoint.nextPopulation;

    const bestScoreOrDistance = isTriple
      ? log.getBestRecord()?.score ?? 0
      : log.getBestRecord()?.result.maxDistance ?? 0;

    this.state = {
      ...initialState(),
      runId,
      status: "running",
      mode: this.state.mode,
      manifest,
      terrain: initialTerrain,
      currentTrackProfile: isTriple ? TRIPLE_TRACK_PROFILES[0] : frozenConfig.terrainProfile,
      currentTrackIndex: isTriple ? 1 : 1,
      totalTracks: isTriple ? 3 : 1,
      generation,
      completedGenerations: checkpoint.completedGenerations,
      populationSize: frozenConfig.populationSize,
      remainingTrials: population.length * (isTriple ? 3 : 1),
      history: log.getSummaries(),
      bestRecord: log.getBestRecord(),
      overallBest: bestScoreOrDistance,
      message: isTriple
        ? `Pokolenie ${generation} · Trasa 1/3 (Łagodny)`
        : `Pokolenie ${generation} ruszyło`
    };
    this.emit();

    await this.runLoop(runId, frozenConfig, initialTerrain, manifest, log, population, generation, currentToken);
  }

  private async runLoop(
    runId: string,
    frozenConfig: RunConfig,
    initialTerrain: Terrain,
    manifest: RunManifest,
    log: RunLog,
    initialPop: Genome[],
    initialGen: number,
    currentToken: number
  ): Promise<void> {
    let population = initialPop;
    let generation = initialGen;
    const isTriple = frozenConfig.trainingMode === "triple";

    try {
      while (!this.stopRequested && currentToken === this.token) {
        if (!isTriple) {
          // SINGLE TRACK RUN
          const results = await this.evaluatePopulation(
            population, initialTerrain, generation, log, currentToken, 1, 1
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
        } else {
          // TRIPLE TRACK RUN: 3 phases
          const multiTrackResultsByGenome = new Map<string, { profile: TerrainProfile; result: TrialResult; terrain: Terrain }[]>();
          for (const genome of population) {
            multiTrackResultsByGenome.set(genome.id, []);
          }

          let aborted = false;

          for (let phase = 0; phase < TRIPLE_TRACK_PROFILES.length; phase++) {
            if (this.stopRequested || currentToken !== this.token) {
              aborted = true;
              break;
            }

            const profile = TRIPLE_TRACK_PROFILES[phase]!;
            const trackTerrain = createTerrain(
              deriveSeed(frozenConfig.seed, "track", profile),
              profile,
              frozenConfig.difficulty
            );

            this.state = {
              ...this.state,
              terrain: trackTerrain,
              currentTrackProfile: profile,
              currentTrackIndex: phase + 1,
              totalTracks: 3,
              activeTrials: [],
              currentSnapshot: null,
              currentGenome: null,
              currentDistance: 0,
              candidateIndex: 0,
              remainingTrials: (3 - phase) * population.length,
              message: `Pokolenie ${generation} · Trasa ${phase + 1}/3 (${profileLabelPl(profile)})`
            };
            this.emit();

            const phaseResults = await this.evaluatePopulation(
              population, trackTerrain, generation, log, currentToken, phase + 1, 3
            );

            if (phaseResults.length !== population.length) {
              aborted = true;
              break;
            }

            for (const res of phaseResults) {
              multiTrackResultsByGenome.get(res.genome.id)!.push({
                profile,
                result: res,
                terrain: trackTerrain
              });
            }
          }

          if (aborted) {
            break;
          }

          // Complete multi-track evaluation
          const evaluatedIndividuals: EvaluatedIndividual[] = population.map((genome) => {
            const trackResults = multiTrackResultsByGenome.get(genome.id)!;
            return evaluateMultiTrackIndividual(genome, trackResults);
          });

          const ranked = rankEvaluatedIndividuals(evaluatedIndividuals);
          for (const ind of ranked) {
            log.considerMultiTrackIndividual(generation, ind);
          }

          const summary = summarizeMultiTrackGeneration(generation, ranked);
          log.recordGeneration(summary);

          const bestRecord = log.getBestRecord();

          this.state = {
            ...this.state,
            completedGenerations: generation,
            history: log.getSummaries(),
            bestRecord,
            generationBest: summary.bestDistance, // holds score
            generationAverage: summary.averageDistance, // holds avg score
            overallBest: bestRecord?.score ?? 0,
            remainingTrials: 0,
            message: `Pokolenie ${generation} ukończone`
          };
          this.emit();

          const nextPopulation = createNextPopulationFromEvaluated(ranked, frozenConfig, generation + 1);

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

          const firstTrack = TRIPLE_TRACK_PROFILES[0]!;
          const nextTerrain = createTerrain(
            deriveSeed(frozenConfig.seed, "track", firstTrack),
            firstTrack,
            frozenConfig.difficulty
          );

          this.state = {
            ...this.state,
            terrain: nextTerrain,
            currentTrackProfile: firstTrack,
            currentTrackIndex: 1,
            totalTracks: 3,
            generation,
            candidateIndex: 0,
            remainingTrials: population.length * 3,
            generationBest: 0,
            generationAverage: 0,
            currentDistance: 0,
            currentGenome: null,
            currentSnapshot: null,
            activeTrials: [],
            message: `Pokolenie ${generation} · Trasa 1/3 (Łagodny)`
          };
          this.emit();
        }

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

  enterReplay(selectedProfile?: TerrainProfile): { bestRecord: BestRecord; trackSummary: TrackTrialSummary | null; terrain: Terrain } | null {
    const bestRecord = this.state.bestRecord;
    if (
      bestRecord === null ||
      this.state.status === "idle" ||
      this.state.status === "error" ||
      this.state.status === "replay"
    ) {
      return null;
    }

    const config = this.state.manifest?.config;
    if (!config) {
      return null;
    }

    const isTriple = config.trainingMode === "triple";
    const profile = isTriple
      ? (selectedProfile ?? TRIPLE_TRACK_PROFILES[0]!)
      : config.terrainProfile;

    const terrain = isTriple
      ? createTerrain(deriveSeed(config.seed, "track", profile), profile, config.difficulty)
      : createTerrain(config.seed, config.terrainProfile, config.difficulty);

    const trackSummary = bestRecord.trackResults?.find((t) => t.profile === profile) ?? null;

    this.replayReturnStatus = this.state.status;
    if (this.state.status === "running") {
      this.paused = true;
      void this.executor.pause(this.token);
    }
    this.state = {
      ...this.state,
      status: "replay",
      message: `Replay ${bestRecord.result.genome.id} (${profileLabelPl(profile)})`
    };
    this.emit();
    return { bestRecord, trackSummary, terrain };
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
      this.emit();
      this.executor.resume(this.token);
      return;
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
    currentToken: number,
    phaseNumber = 1,
    totalPhases = 1
  ): Promise<TrialResult[]> {
    const results: TrialResult[] = [];
    const activeMap = new Map<string, LiveTrial>();
    let lastFinished: TrialResult | null = null;
    let lastEmitTime = 0;
    const isTriple = totalPhases > 1;

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

      // Remaining trials calculation across phases
      const trialsRemainingInPhase = population.length - results.length;
      const totalRemainingTrials = isTriple
        ? (totalPhases - phaseNumber) * population.length + trialsRemainingInPhase
        : trialsRemainingInPhase;

      const overallBestVal = isTriple
        ? log.getBestRecord()?.score ?? 0
        : log.getBestRecord()?.result.maxDistance ?? 0;

      const phasePrefix = isTriple
        ? `Trasa ${phaseNumber}/${totalPhases} (${profileLabelPl(terrain.profile)}) · `
        : "";

      this.state = {
        ...this.state,
        terrain,
        generation,
        currentTrackProfile: terrain.profile,
        currentTrackIndex: phaseNumber,
        totalTracks: totalPhases,
        candidateIndex: results.length,
        remainingTrials: totalRemainingTrials,
        activeTrials: trials,
        currentGenome: leader?.genome ?? lastFinished?.genome ?? null,
        currentSnapshot: leader?.snapshot ?? lastFinished?.trace.at(-1) ?? null,
        currentDistance: leader?.distance ?? lastFinished?.maxDistance ?? 0,
        // In triple track mode, intra-generation best & average score are only ready after all 3 tracks are done
        generationBest: isTriple ? this.state.generationBest : partial.bestDistance,
        generationAverage: isTriple ? this.state.generationAverage : partial.averageDistance,
        overallBest: overallBestVal,
        bestRecord: log.getBestRecord(),
        message: `${phasePrefix}${trials.length} na trasie · ${results.length}/${population.length} ocenionych`
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
        if (!isTriple) {
          log.considerResult(generation, result);
        }
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

function profileLabelPl(profile: TerrainProfile): string {
  switch (profile) {
    case "smooth":
      return "Łagodny";
    case "steep-hills":
      return "Strome wzgórza";
    case "bumpy":
      return "Wyboisty";
  }
}

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
