export const APP_BUILD_ID = "0.3.0";
export const CONCURRENT_TRIALS = 4;
export const FIXED_DELTA_SECONDS = 1 / 60;
export const MAX_TRIAL_STEPS = 1_200;
export const STAGNATION_STEPS = 240;
export const TRACE_EVERY_STEPS = 4;
export const FINISH_LINE_OFFSET_X = 8;

export type RunMode = "normal" | "fast" | "headless";

export type TerrainProfile = "smooth" | "steep-hills" | "bumpy";

export type TrainingMode = "single" | "triple";

export const TRIPLE_TRACK_PROFILES: readonly TerrainProfile[] = [
  "smooth",
  "steep-hills",
  "bumpy"
];

export type WheelCountMode = "2" | "2-3" | "2-4";

export type PopulationSource = "random" | "garage";

export interface GarageFounderInfo {
  id: string;
  name: string;
  genome: Genome;
}

export interface RunConfig {
  seed: string;
  populationSize: number;
  mutationRate: number;
  mutationStrength: number;
  eliteCount: number;
  terrainProfile: TerrainProfile;
  difficulty: number;
  wheelCountMode: WheelCountMode;
  trainingMode?: TrainingMode;
  populationSource?: PopulationSource;
  garageFounders?: GarageFounderInfo[];
}

export interface RunManifest {
  schemaVersion: 1;
  buildId: string;
  physics: "planck@1.5.0";
  rng: "mulberry32-fnv1a@1";
  world: "terrain-profiles@1";
  evolution: "rank-uniform-triangular@3";
  scoringVersion?: "multi-track-harmonic-progress@1";
  trackProfiles?: readonly TerrainProfile[];
  fixedDeltaSeconds: number;
  maxTrialSteps: number;
  stagnationSteps: number;
  traceEverySteps: number;
  config: RunConfig;
}

export interface VehicleGenes {
  // Nadwozie i balast
  width: number;
  height: number;
  roofScale: number;
  noseScale: number;
  tailScale: number;
  floorTilt: number;
  roofOffset: number;
  chassisDensity: number;
  ballastMass: number;
  ballastOffset: number;
  motorSpeed: number;
  motorTorque: number;

  // Aktywna liczba kół
  wheelCount: number;

  // Flaga zachowania dawnych wysokości mocowań dla zmigrowanych pojazdów v1 (1 dla starych, 0 dla nowych)
  legacyAnchors: number;

  // Slot 0
  wheel0Radius: number;
  wheel0MountX: number;
  wheel0Density: number;
  wheel0Grip: number;
  wheel0RideHeight: number;
  wheel0SpringFrequency: number;
  wheel0SpringDamping: number;
  wheel0DriveShare: number;
  wheel0SpeedRatio: number;

  // Slot 1
  wheel1Radius: number;
  wheel1MountX: number;
  wheel1Density: number;
  wheel1Grip: number;
  wheel1RideHeight: number;
  wheel1SpringFrequency: number;
  wheel1SpringDamping: number;
  wheel1DriveShare: number;
  wheel1SpeedRatio: number;

  // Slot 2
  wheel2Radius: number;
  wheel2MountX: number;
  wheel2Density: number;
  wheel2Grip: number;
  wheel2RideHeight: number;
  wheel2SpringFrequency: number;
  wheel2SpringDamping: number;
  wheel2DriveShare: number;
  wheel2SpeedRatio: number;

  // Slot 3
  wheel3Radius: number;
  wheel3MountX: number;
  wheel3Density: number;
  wheel3Grip: number;
  wheel3RideHeight: number;
  wheel3SpringFrequency: number;
  wheel3SpringDamping: number;
  wheel3DriveShare: number;
  wheel3SpeedRatio: number;
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
  wheels: Pose[];
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

export interface TrackTrialSummary {
  profile: TerrainProfile;
  result: TrialResult;
  progressPercent: number; // 0–100
}

export interface EvaluatedIndividual {
  genome: Genome;
  score: number; // 0–100 pkt for triple, or meters for single
  averageSpeed: number;
  trackResults: readonly TrackTrialSummary[];
}

export interface BestRecord {
  generation: number;
  result: TrialResult;
  score?: number;
  trackResults?: readonly TrackTrialSummary[];
}

export function createManifest(config: RunConfig): RunManifest {
  const trainingMode = config.trainingMode ?? "single";
  const trackProfiles =
    trainingMode === "triple" ? TRIPLE_TRACK_PROFILES : [config.terrainProfile];

  return {
    schemaVersion: 1,
    buildId: APP_BUILD_ID,
    physics: "planck@1.5.0",
    rng: "mulberry32-fnv1a@1",
    world: "terrain-profiles@1",
    evolution: "rank-uniform-triangular@3",
    scoringVersion:
      trainingMode === "triple"
        ? "multi-track-harmonic-progress@1"
        : undefined,
    trackProfiles,
    fixedDeltaSeconds: FIXED_DELTA_SECONDS,
    maxTrialSteps: MAX_TRIAL_STEPS,
    stagnationSteps: STAGNATION_STEPS,
    traceEverySteps: TRACE_EVERY_STEPS,
    config: {
      ...config,
      trainingMode,
      populationSource: config.populationSource ?? "random"
    }
  };
}
