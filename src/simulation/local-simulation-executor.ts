import { CONCURRENT_TRIALS, type Genome, type RunMode, type Terrain, type TrialResult } from "../domain/types";
import { TrialEvaluation } from "../run/trial-evaluation";
import type { SimulationPort } from "./simulation-port";
import type { EvaluationObserver, SimulationExecutor } from "./simulation-executor";

export class LocalSimulationExecutor implements SimulationExecutor {
  private paused = false;

  constructor(private readonly simulation: SimulationPort) {}

  setMode(_mode: RunMode, _runToken: number): void {
    // tryb lokalny uwzględnia tryb w pętli ewaluacji
  }

  pause(_runToken: number): void {
    this.paused = true;
  }

  resume(_runToken: number): void {
    this.paused = false;
  }

  terminate(): void {
    this.paused = false;
  }

  async evaluatePopulation(params: {
    population: Genome[];
    terrain: Terrain;
    generation: number;
    mode: RunMode;
    runToken: number;
    observer: EvaluationObserver;
    shouldStop: () => boolean;
    isPaused: () => boolean;
  }): Promise<TrialResult[]> {
    const { population, terrain, observer, shouldStop, isPaused } = params;
    const results: TrialResult[] = [];
    const active: { genome: Genome; evaluation: TrialEvaluation }[] = [];
    let nextIndex = 0;

    const fillSlots = () => {
      while (active.length < CONCURRENT_TRIALS && nextIndex < population.length) {
        const genome = population[nextIndex++]!;
        const evaluation = new TrialEvaluation(
          this.simulation.createTrial(genome, terrain),
          genome,
          terrain
        );
        active.push({ genome, evaluation });
        observer.onSnapshot(genome, evaluation.snapshot(), evaluation.distance);
      }
    };

    fillSlots();

    try {
      while (results.length < population.length && !shouldStop()) {
        if (isPaused() || this.paused) {
          await new Promise((resolve) => setTimeout(resolve, 16));
          continue;
        }

        const mode = params.mode;
        const stepCount = mode === "normal" ? 1 : mode === "fast" ? 10 : 4_096;
        const startedAt = performance.now();

        for (let step = 0; step < stepCount; step += 1) {
          for (let index = active.length - 1; index >= 0; index -= 1) {
            const trial = active[index]!;
            trial.evaluation.advance();
            if (trial.evaluation.done) {
              const res = trial.evaluation.result();
              results.push(res);
              observer.onResult(res);
              active.splice(index, 1);
            }
          }
          fillSlots();
          if (active.length === 0 || (mode === "headless" && performance.now() - startedAt >= 8)) {
            break;
          }
        }

        for (const trial of active) {
          observer.onSnapshot(trial.genome, trial.evaluation.snapshot(), trial.evaluation.distance);
        }

        await new Promise((resolve) => setTimeout(resolve, mode === "headless" ? 0 : 16));
      }
    } finally {
      for (const trial of active) {
        trial.evaluation.dispose();
      }
    }

    return results;
  }
}
