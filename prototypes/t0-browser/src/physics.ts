import type { Genome, Terrain, TrialSnapshot } from "./domain";

export interface TrialWorld {
  step(fixedDeltaSeconds: number): TrialSnapshot;
  snapshot(): TrialSnapshot;
  dispose(): void;
}

export interface PhysicsAdapter {
  readonly id: "rapier" | "planck";
  readonly label: string;
  initialize(): Promise<number>;
  createTrial(genome: Genome, terrain: Terrain): TrialWorld;
}
