import type { Genome, Terrain, TrialSnapshot } from "../domain/types";

export interface TrialWorld {
  step(fixedDeltaSeconds: number): TrialSnapshot;
  snapshot(): TrialSnapshot;
  dispose(): void;
}

export interface SimulationPort {
  readonly id: "planck";
  readonly label: string;
  createTrial(genome: Genome, terrain: Terrain): TrialWorld;
}
