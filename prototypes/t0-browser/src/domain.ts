export type AdapterId = "rapier" | "planck";
export type RunMode = "normal" | "fast" | "headless";

export interface Point {
  x: number;
  y: number;
}

export interface Terrain {
  points: Point[];
  startY: number;
  endX: number;
}

export interface Genome {
  id: string;
  width: number;
  height: number;
  roofScale: number;
  rearInset: number;
  frontInset: number;
  rearWheelRadius: number;
  frontWheelRadius: number;
  motorSpeed: number;
  motorTorque: number;
}

export interface RunConfig {
  adapterId: AdapterId;
  seed: string;
  populationSize: number;
  mutationRate: number;
  mutationStrength: number;
  eliteCount: number;
  maxSteps: number;
  stagnationSteps: number;
  traceEvery: number;
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

export interface TraceFrame extends TrialSnapshot {}

export type TrialEndReason = "stagnation" | "fell" | "finished" | "step-limit" | "invalid";

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
  ranking: string[];
}

export interface EvolutionResult {
  adapterId: AdapterId;
  summaries: GenerationSummary[];
  finalPopulation: Genome[];
  best: TrialResult;
  outcomeHash: string;
}

interface GeneRange {
  key: Exclude<keyof Genome, "id">;
  min: number;
  max: number;
}

const GENE_RANGES: GeneRange[] = [
  { key: "width", min: 1.25, max: 2.1 },
  { key: "height", min: 0.65, max: 1.15 },
  { key: "roofScale", min: 0.72, max: 1.05 },
  { key: "rearInset", min: 0.48, max: 0.82 },
  { key: "frontInset", min: 0.48, max: 0.82 },
  { key: "rearWheelRadius", min: 0.38, max: 0.72 },
  { key: "frontWheelRadius", min: 0.38, max: 0.72 },
  { key: "motorSpeed", min: 8, max: 16 },
  { key: "motorTorque", min: 24, max: 64 }
];

export const DEFAULT_CONFIG: RunConfig = {
  adapterId: "rapier",
  seed: "evolution-lab-t0",
  populationSize: 10,
  mutationRate: 0.2,
  mutationStrength: 0.16,
  eliteCount: 1,
  maxSteps: 1_200,
  stagnationSteps: 240,
  traceEvery: 4
};

export function createRng(seedText: string): () => number {
  let seed = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }

  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createTerrain(seed: string): Terrain {
  const rng = createRng(`${seed}:world:v1`);
  const points: Point[] = [];
  const segmentLength = 3;
  let height = 0;
  let slope = 0;

  for (let index = 0; index < 58; index += 1) {
    const x = -12 + index * segmentLength;
    if (x > 9) {
      const targetSlope = (rng() - 0.5) * 0.42;
      slope = clamp(slope * 0.65 + targetSlope * 0.35, -0.18, 0.18);
      height = clamp(height + slope * segmentLength, -2.4, 4.8);
    }
    points.push({ x, y: height });
  }

  return {
    points,
    startY: interpolateTerrainHeight(points, 0),
    endX: points.at(-1)?.x ?? 0
  };
}

export function interpolateTerrainHeight(points: Point[], x: number): number {
  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];
    if (x >= left.x && x <= right.x) {
      const amount = (x - left.x) / (right.x - left.x);
      return left.y + (right.y - left.y) * amount;
    }
  }
  return points.at(-1)?.y ?? 0;
}

export function createInitialPopulation(config: RunConfig): Genome[] {
  const rng = createRng(`${config.seed}:population:v1`);
  return Array.from({ length: config.populationSize }, (_, index) =>
    randomGenome(rng, `g1-p${index + 1}`)
  );
}

export function vehicleShape(genome: Genome): {
  vertices: Point[];
  rearAnchor: Point;
  frontAnchor: Point;
} {
  const width = genome.width;
  const height = genome.height;
  return {
    vertices: [
      { x: -width * 0.96, y: -height * 0.42 },
      { x: width * 0.78, y: -height * 0.5 },
      { x: width, y: -height * 0.04 },
      { x: width * 0.58 * genome.roofScale, y: height * 0.58 },
      { x: -width * 0.56 * genome.roofScale, y: height * 0.62 },
      { x: -width, y: height * 0.04 }
    ],
    rearAnchor: {
      x: -width * genome.rearInset,
      y: -height * 0.48
    },
    frontAnchor: {
      x: width * genome.frontInset,
      y: -height * 0.48
    }
  };
}

export function rankResults(results: TrialResult[]): TrialResult[] {
  return [...results].sort((left, right) => {
    const distanceDifference = right.maxDistance - left.maxDistance;
    if (Math.abs(distanceDifference) > 1e-9) {
      return distanceDifference;
    }
    const speedDifference = right.averageSpeed - left.averageSpeed;
    if (Math.abs(speedDifference) > 1e-9) {
      return speedDifference;
    }
    return left.genome.id.localeCompare(right.genome.id);
  });
}

export function createNextPopulation(
  results: TrialResult[],
  config: RunConfig,
  nextGeneration: number
): Genome[] {
  const ranked = rankResults(results);
  const rng = createRng(`${config.seed}:evolution:v1:g${nextGeneration}`);
  const next: Genome[] = ranked.slice(0, config.eliteCount).map((result, index) => ({
    ...result.genome,
    id: `g${nextGeneration}-e${index + 1}`
  }));

  while (next.length < config.populationSize) {
    const first = selectRankBiased(ranked, rng).genome;
    let second = selectRankBiased(ranked, rng).genome;
    if (ranked.length > 1) {
      for (let retry = 0; retry < 4 && second.id === first.id; retry += 1) {
        second = selectRankBiased(ranked, rng).genome;
      }
    }
    const child = crossover(first, second, rng, `g${nextGeneration}-p${next.length + 1}`);
    next.push(mutate(child, config, rng));
  }

  return next;
}

export function summarizeGeneration(
  generation: number,
  results: TrialResult[]
): GenerationSummary {
  const ranked = rankResults(results);
  const total = ranked.reduce((sum, result) => sum + result.maxDistance, 0);
  return {
    generation,
    bestDistance: ranked[0]?.maxDistance ?? 0,
    averageDistance: ranked.length === 0 ? 0 : total / ranked.length,
    invalidCount: ranked.filter((result) => result.reason === "invalid").length,
    ranking: ranked.map((result) => result.genome.id)
  };
}

export function hashEvolution(
  summaries: GenerationSummary[],
  population: Genome[]
): string {
  const canonical = JSON.stringify({
    summaries: summaries.map((summary) => ({
      generation: summary.generation,
      bestDistance: rounded(summary.bestDistance),
      averageDistance: rounded(summary.averageDistance),
      invalidCount: summary.invalidCount,
      ranking: summary.ranking
    })),
    population: population.map((genome) =>
      Object.fromEntries(
        Object.entries(genome).map(([key, value]) => [
          key,
          typeof value === "number" ? rounded(value) : value
        ])
      )
    )
  });

  let hash = 2166136261;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function randomGenome(rng: () => number, id: string): Genome {
  const genes = Object.fromEntries(
    GENE_RANGES.map((range) => [range.key, range.min + rng() * (range.max - range.min)])
  ) as Omit<Genome, "id">;
  return { id, ...genes };
}

function selectRankBiased(results: TrialResult[], rng: () => number): TrialResult {
  const index = Math.min(results.length - 1, Math.floor(rng() ** 2 * results.length));
  return results[index];
}

function crossover(
  first: Genome,
  second: Genome,
  rng: () => number,
  id: string
): Genome {
  const child = { id } as Genome;
  for (const range of GENE_RANGES) {
    child[range.key] = rng() < 0.5 ? first[range.key] : second[range.key];
  }
  return child;
}

function mutate(genome: Genome, config: RunConfig, rng: () => number): Genome {
  const mutated = { ...genome };
  for (const range of GENE_RANGES) {
    if (rng() >= config.mutationRate) {
      continue;
    }
    const span = range.max - range.min;
    const delta = (rng() * 2 - 1) * span * config.mutationStrength;
    mutated[range.key] = clamp(mutated[range.key] + delta, range.min, range.max);
  }
  return mutated;
}

function rounded(value: number): number {
  return Number(value.toFixed(6));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
