import type {
  Genome,
  RunMode,
  Terrain,
  TrialResult,
  TrialSnapshot
} from "../domain/types";

export interface EvaluationObserver {
  onSnapshot(genome: Genome, snapshot: TrialSnapshot, distance: number): void;
  onResult(result: TrialResult): void;
}

export interface SimulationExecutor {
  evaluatePopulation(params: {
    population: Genome[];
    terrain: Terrain;
    generation: number;
    mode: RunMode;
    runToken: number;
    observer: EvaluationObserver;
    shouldStop: () => boolean;
    isPaused: () => boolean;
  }): Promise<TrialResult[]>;

  setMode(mode: RunMode, runToken: number): void;
  pause(runToken: number): Promise<void> | void;
  resume(runToken: number): Promise<void> | void;
  terminate(): void;
}
