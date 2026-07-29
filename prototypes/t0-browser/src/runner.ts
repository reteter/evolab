import {
  createInitialPopulation,
  createNextPopulation,
  createTerrain,
  hashEvolution,
  rankResults,
  summarizeGeneration,
  type EvolutionResult,
  type GenerationSummary,
  type Genome,
  type RunConfig,
  type RunMode,
  type Terrain,
  type TraceFrame,
  type TrialEndReason,
  type TrialResult,
  type TrialSnapshot
} from "./domain";
import type { PhysicsAdapter, TrialWorld } from "./physics";

export const FIXED_DELTA_SECONDS = 1 / 60;

export interface AdapterBenchmark {
  adapterId: PhysicsAdapter["id"];
  adapterLabel: string;
  initializationMs: number;
  headlessMs: number;
  renderedMs: number;
  physicsSteps: number;
  stepsPerSecond: number;
  repeatedHash: string;
  renderedHash: string;
  repeatable: boolean;
  renderInvariant: boolean;
  invalidStates: number;
  bestDistance: number;
  lastGenerationAverage: number;
  bestTrace: TraceFrame[];
  bestGenome: Genome;
  terrain: Terrain;
}

export interface LiveState {
  status: "idle" | "loading" | "running" | "paused" | "stopped" | "error";
  adapterId: PhysicsAdapter["id"];
  mode: RunMode;
  generation: number;
  candidate: number;
  populationSize: number;
  alive: number;
  currentDistance: number;
  bestDistance: number;
  averageDistance: number;
  snapshot: TrialSnapshot | null;
  terrain: Terrain | null;
  genome: Genome | null;
  message: string;
}

interface EvolutionRunOptions {
  renderStep?: (snapshot: TrialSnapshot, terrain: Terrain, genome: Genome) => void;
}

export async function benchmarkAdapter(
  adapter: PhysicsAdapter,
  config: RunConfig,
  generations: number,
  renderStep: (snapshot: TrialSnapshot, terrain: Terrain, genome: Genome) => void
): Promise<AdapterBenchmark> {
  const initializationMs = await adapter.initialize();

  const firstStartedAt = performance.now();
  const first = runEvolution(adapter, config, generations);
  const headlessMs = performance.now() - firstStartedAt;

  const repeated = runEvolution(adapter, config, generations);

  const renderedStartedAt = performance.now();
  const rendered = runEvolution(adapter, config, generations, { renderStep });
  const renderedMs = performance.now() - renderedStartedAt;

  return {
    adapterId: adapter.id,
    adapterLabel: adapter.label,
    initializationMs,
    headlessMs,
    renderedMs,
    physicsSteps: first.totalSteps,
    stepsPerSecond: first.totalSteps / Math.max(headlessMs / 1_000, 0.001),
    repeatedHash: repeated.outcomeHash,
    renderedHash: rendered.outcomeHash,
    repeatable: first.outcomeHash === repeated.outcomeHash,
    renderInvariant: first.outcomeHash === rendered.outcomeHash,
    invalidStates: first.summaries.reduce(
      (sum, summary) => sum + summary.invalidCount,
      0
    ),
    bestDistance: first.best.maxDistance,
    lastGenerationAverage: first.summaries.at(-1)?.averageDistance ?? 0,
    bestTrace: first.best.trace,
    bestGenome: first.best.genome,
    terrain: createTerrain(config.seed)
  };
}

export function runEvolution(
  adapter: PhysicsAdapter,
  config: RunConfig,
  generations: number,
  options: EvolutionRunOptions = {}
): EvolutionResult & { totalSteps: number } {
  const terrain = createTerrain(config.seed);
  let population = createInitialPopulation(config);
  const summaries: GenerationSummary[] = [];
  let overallBest: TrialResult | null = null;
  let totalSteps = 0;

  for (let generation = 1; generation <= generations; generation += 1) {
    const results = population.map((genome) => {
      const evaluation = new TrialEvaluation(
        adapter.createTrial(genome, terrain),
        genome,
        terrain,
        config
      );
      while (!evaluation.done) {
        const snapshot = evaluation.advance();
        options.renderStep?.(snapshot, terrain, genome);
      }
      const result = evaluation.result();
      totalSteps += result.ticks;
      if (overallBest === null || result.maxDistance > overallBest.maxDistance) {
        overallBest = result;
      }
      return result;
    });

    summaries.push(summarizeGeneration(generation, results));
    population = createNextPopulation(results, config, generation + 1);
  }

  if (overallBest === null) {
    throw new Error("Scenariusz nie utworzył żadnej próby.");
  }

  return {
    adapterId: adapter.id,
    summaries,
    finalPopulation: population,
    best: overallBest,
    outcomeHash: hashEvolution(summaries, population),
    totalSteps
  };
}

export class LiveRunController {
  private mode: RunMode = "normal";
  private stopRequested = false;
  private paused = false;
  private token = 0;
  private state: LiveState = {
    status: "idle",
    adapterId: "rapier",
    mode: "normal",
    generation: 0,
    candidate: 0,
    populationSize: 0,
    alive: 0,
    currentDistance: 0,
    bestDistance: 0,
    averageDistance: 0,
    snapshot: null,
    terrain: null,
    genome: null,
    message: "Gotowy"
  };

  constructor(private readonly onState: (state: LiveState) => void) {}

  async start(adapter: PhysicsAdapter, config: RunConfig): Promise<void> {
    const currentToken = ++this.token;
    this.stopRequested = false;
    this.paused = false;
    this.state = {
      ...this.state,
      status: "loading",
      adapterId: adapter.id,
      mode: this.mode,
      generation: 1,
      candidate: 0,
      populationSize: config.populationSize,
      alive: config.populationSize,
      currentDistance: 0,
      bestDistance: 0,
      averageDistance: 0,
      snapshot: null,
      terrain: createTerrain(config.seed),
      genome: null,
      message: `Ładowanie ${adapter.label}`
    };
    this.emit();

    try {
      await adapter.initialize();
      if (currentToken !== this.token || this.stopRequested) {
        return;
      }

      const terrain = this.state.terrain as Terrain;
      let population = createInitialPopulation(config);
      let generation = 1;
      let overallBest = 0;

      this.state.status = "running";
      this.state.message = "Przebieg aktywny";
      this.emit();

      while (!this.stopRequested && currentToken === this.token) {
        const results: TrialResult[] = [];
        for (let index = 0; index < population.length; index += 1) {
          if (this.stopRequested || currentToken !== this.token) {
            break;
          }

          const genome = population[index];
          const evaluation = new TrialEvaluation(
            adapter.createTrial(genome, terrain),
            genome,
            terrain,
            config
          );
          this.state = {
            ...this.state,
            generation,
            candidate: index + 1,
            alive: population.length - index,
            genome,
            currentDistance: 0,
            snapshot: evaluation.snapshot(),
            message: `${genome.id}: próba`
          };
          this.emit();

          while (!evaluation.done && !this.stopRequested && currentToken === this.token) {
            if (this.paused) {
              await nextFrame();
              continue;
            }

            const batchSize = this.mode === "normal" ? 2 : this.mode === "fast" ? 32 : 240;
            for (let step = 0; step < batchSize && !evaluation.done; step += 1) {
              evaluation.advance();
            }

            const snapshot = evaluation.snapshot();
            this.state = {
              ...this.state,
              status: "running",
              mode: this.mode,
              currentDistance: Math.max(0, snapshot.chassis.x),
              snapshot,
              message: this.mode === "headless" ? "Próba bez renderowania" : "Próba aktywna"
            };
            this.emit();
            await nextFrame();
          }

          if (!evaluation.done) {
            evaluation.dispose();
            break;
          }

          const result = evaluation.result();
          results.push(result);
          overallBest = Math.max(overallBest, result.maxDistance);
          this.state = {
            ...this.state,
            bestDistance: overallBest,
            currentDistance: result.maxDistance,
            alive: population.length - index - 1
          };
          this.emit();
        }

        if (results.length !== population.length) {
          break;
        }

        const ranked = rankResults(results);
        const average =
          ranked.reduce((sum, result) => sum + result.maxDistance, 0) / ranked.length;
        this.state = {
          ...this.state,
          bestDistance: overallBest,
          averageDistance: average,
          message: `Pokolenie ${generation} zakończone`
        };
        this.emit();
        population = createNextPopulation(results, config, generation + 1);
        generation += 1;
        await nextFrame();
      }

      if (currentToken === this.token) {
        this.state = {
          ...this.state,
          status: "stopped",
          alive: 0,
          message: "Przebieg zatrzymany"
        };
        this.emit();
      }
    } catch (error) {
      if (currentToken === this.token) {
        this.state = {
          ...this.state,
          status: "error",
          message: error instanceof Error ? error.message : "Nieznany błąd"
        };
        this.emit();
      }
    }
  }

  pause(): void {
    if (this.state.status !== "running") {
      return;
    }
    this.paused = true;
    this.state = {
      ...this.state,
      status: "paused",
      message: "Pauza"
    };
    this.emit();
  }

  resume(): void {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    this.state = {
      ...this.state,
      status: "running",
      message: "Przebieg wznowiony"
    };
    this.emit();
  }

  stop(): void {
    this.stopRequested = true;
    this.paused = false;
  }

  setMode(mode: RunMode): void {
    this.mode = mode;
    this.state = {
      ...this.state,
      mode,
      message: `Tryb: ${mode}`
    };
    this.emit();
  }

  getState(): LiveState {
    return this.state;
  }

  private emit(): void {
    this.onState({ ...this.state });
  }
}

class TrialEvaluation {
  private readonly trace: TraceFrame[] = [];
  private latest: TrialSnapshot;
  private maxDistance = 0;
  private lastProgressTick = 0;
  private endReason: TrialEndReason | null = null;
  private disposed = false;

  constructor(
    private readonly world: TrialWorld,
    private readonly genome: Genome,
    private readonly terrain: Terrain,
    private readonly config: RunConfig
  ) {
    this.latest = world.snapshot();
    this.captureTrace(this.latest);
  }

  get done(): boolean {
    return this.endReason !== null;
  }

  advance(): TrialSnapshot {
    if (this.done) {
      return this.latest;
    }

    this.latest = this.world.step(FIXED_DELTA_SECONDS);
    const distance = Math.max(0, this.latest.chassis.x);
    if (distance > this.maxDistance + 0.02) {
      this.maxDistance = distance;
      this.lastProgressTick = this.latest.tick;
    }

    if (this.latest.tick % this.config.traceEvery === 0) {
      this.captureTrace(this.latest);
    }

    this.endReason = this.resolveEndReason();
    if (this.endReason !== null) {
      this.captureTrace(this.latest);
      this.dispose();
    }
    return this.latest;
  }

  snapshot(): TrialSnapshot {
    return this.latest;
  }

  result(): TrialResult {
    if (this.endReason === null) {
      throw new Error(`Próba ${this.genome.id} jeszcze trwa.`);
    }
    return {
      genome: this.genome,
      maxDistance: this.maxDistance,
      averageSpeed:
        this.latest.tick === 0
          ? 0
          : this.maxDistance / (this.latest.tick * FIXED_DELTA_SECONDS),
      ticks: this.latest.tick,
      reason: this.endReason,
      trace: this.trace
    };
  }

  dispose(): void {
    if (!this.disposed) {
      this.world.dispose();
      this.disposed = true;
    }
  }

  private resolveEndReason(): TrialEndReason | null {
    if (!this.latest.finite) {
      return "invalid";
    }
    if (this.latest.chassis.y < -8) {
      return "fell";
    }
    if (this.latest.chassis.x >= this.terrain.endX - 6) {
      return "finished";
    }
    if (
      this.latest.tick >= 120 &&
      this.latest.tick - this.lastProgressTick >= this.config.stagnationSteps
    ) {
      return "stagnation";
    }
    if (this.latest.tick >= this.config.maxSteps) {
      return "step-limit";
    }
    return null;
  }

  private captureTrace(snapshot: TrialSnapshot): void {
    const last = this.trace.at(-1);
    if (last?.tick === snapshot.tick) {
      return;
    }
    this.trace.push(structuredClone(snapshot));
  }
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}
