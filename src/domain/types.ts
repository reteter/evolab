export const APP_BUILD_ID = "0.2.0";
export const CONCURRENT_TRIALS = 4;
export const FIXED_DELTA_SECONDS = 1 / 60;
export const MAX_TRIAL_STEPS = 1_200;
export const STAGNATION_STEPS = 240;
export const TRACE_EVERY_STEPS = 4;

export type RunMode = "normal" | "fast" | "headless";

export type TerrainProfile = "smooth" | "steep-hills" | "bumpy";

export interface RunConfig {
  seed: string;
  populationSize: number;
  mutationRate: number;
  mutationStrength: number;
  eliteCount: number;
  terrainProfile: TerrainProfile;
  difficulty: number;
}

export interface RunManifest {
  schemaVersion: 1;
  buildId: string;
  physics: "planck@1.5.0";
  rng: "mulberry32-fnv1a@1";
  world: "terrain-profiles@1";
  evolution: "rank-uniform-triangular@2";
  fixedDeltaSeconds: number;
  maxTrialSteps: number;
  stagnationSteps: number;
  traceEverySteps: number;
  config: RunConfig;
}

export interface VehicleGenes {
  width: number;
  height: number;
  roofScale: number;
  noseScale: number;
  tailScale: number;
  floorTilt: number;
  rearInset: number;
  frontInset: number;
  rearWheelRadius: number;
  frontWheelRadius: number;
  motorSpeed: number;
  motorTorque: number;
  roofOffset: number;
  chassisDensity: number;
  rearWheelDensity: number;
  frontWheelDensity: number;
  rearWheelGrip: number;
  frontWheelGrip: number;
  rearRideHeight: number;
  frontRideHeight: number;
  rearSpringFrequency: number;
  frontSpringFrequency: number;
  rearSpringDamping: number;
  frontSpringDamping: number;
  driveBalance: number;
  frontSpeedRatio: number;
  ballastMass: number;
  ballastOffset: number;
}

export type VehicleGeneKey = keyof VehicleGenes;

export type GenomeLineage =
  | { kind: "founder" }
  | { kind: "elite"; sourceId: string }
  | { kind: "offspring"; parentIds: [string, string] };

export interface Genome {
  id: string;
  generation: number;
  genes: VehicleGenes;
  lineage: GenomeLineage;
}

export interface Point {
  x: number;
  y: number;
}

export interface Terrain {
  seed: string;
  profile: TerrainProfile;
  difficulty: number;
  points: Point[];
  startY: number;
  endX: number;
}

export interface Pose {
  x: number;
  y: number;
  angle: number;
}

export interface TrialSnapshot {
  tick: number;
  chassis: Pose;
  wheels: [Pose, Pose];
  finite: boolean;
}

export interface TraceFrame extends TrialSnapshot {
  distance: number;
}

export type TrialEndReason =
  | "stagnation"
  | "fell"
  | "finished"
  | "step-limit"
  | "invalid";

export interface TrialResult {
  genome: Genome;
  maxDistance: number;
  averageSpeed: number;
  ticks: number;
  reason: TrialEndReason;
  trace: TraceFrame[];
}

export interface GenerationSummary {
  generation: number;
  bestDistance: number;
  averageDistance: number;
  invalidCount: number;
  bestGenomeId: string;
  completedTrials: number;
}

export interface BestRecord {
  generation: number;
  result: TrialResult;
}

export function createManifest(config: RunConfig): RunManifest {
  return {
    schemaVersion: 1,
    buildId: APP_BUILD_ID,
    physics: "planck@1.5.0",
    rng: "mulberry32-fnv1a@1",
    world: "terrain-profiles@1",
    evolution: "rank-uniform-triangular@2",
    fixedDeltaSeconds: FIXED_DELTA_SECONDS,
    maxTrialSteps: MAX_TRIAL_STEPS,
    stagnationSteps: STAGNATION_STEPS,
    traceEverySteps: TRACE_EVERY_STEPS,
    config: { ...config }
  };
}
