import { createRng, deriveSeed, randomBetween, type RandomSource } from "./rng";
import type {
  EvaluatedIndividual,
  GenerationSummary,
  Genome,
  RunConfig,
  Terrain,
  TerrainProfile,
  TrackTrialSummary,
  TrainingMode,
  TrialResult,
  VehicleGeneKey,
  VehicleGenes,
  WheelCountMode
} from "./types";
import { getTrackFinishDistance } from "./world";

export interface GeneRange {
  key: VehicleGeneKey;
  label: string;
  minimum: number;
  maximum: number;
}

export const BODY_GENE_RANGES: readonly GeneRange[] = [
  { key: "width", label: "Szerokość korpusu", minimum: 1.05, maximum: 2.6 },
  { key: "height", label: "Wysokość korpusu", minimum: 0.55, maximum: 1.45 },
  { key: "roofScale", label: "Szerokość dachu", minimum: 0.6, maximum: 1.1 },
  { key: "noseScale", label: "Długość przodu", minimum: 0.9, maximum: 1.08 },
  { key: "tailScale", label: "Długość tyłu", minimum: 0.9, maximum: 1.08 },
  { key: "floorTilt", label: "Nachylenie podwozia", minimum: -0.08, maximum: 0.08 },
  { key: "roofOffset", label: "Przesunięcie dachu", minimum: -0.18, maximum: 0.18 },
  { key: "chassisDensity", label: "Gęstość korpusu", minimum: 0.45, maximum: 1.6 },
  { key: "ballastMass", label: "Masa balastu", minimum: 0, maximum: 2.8 },
  { key: "ballastOffset", label: "Położenie balastu", minimum: -0.65, maximum: 0.65 },
  { key: "motorSpeed", label: "Obroty napędu", minimum: 8, maximum: 22 },
  { key: "motorTorque", label: "Moment napędu", minimum: 28, maximum: 100 }
];

export function getWheelSlotGeneRanges(slotIndex: number): readonly GeneRange[] {
  const slotNum = slotIndex + 1;
  const prefix = `wheel${slotIndex}` as const;
  return [
    { key: `${prefix}Radius` as VehicleGeneKey, label: `Koło ${slotNum} · Promień`, minimum: 0.28, maximum: 1 },
    { key: `${prefix}MountX` as VehicleGeneKey, label: `Koło ${slotNum} · Położenie mocowania`, minimum: -0.9, maximum: 0.9 },
    { key: `${prefix}Density` as VehicleGeneKey, label: `Koło ${slotNum} · Gęstość`, minimum: 0.55, maximum: 1.6 },
    { key: `${prefix}Grip` as VehicleGeneKey, label: `Koło ${slotNum} · Przyczepność`, minimum: 0.5, maximum: 2 },
    { key: `${prefix}RideHeight` as VehicleGeneKey, label: `Koło ${slotNum} · Prześwit`, minimum: 0.08, maximum: 0.55 },
    { key: `${prefix}SpringFrequency` as VehicleGeneKey, label: `Koło ${slotNum} · Sprężyna (Hz)`, minimum: 2.5, maximum: 7 },
    { key: `${prefix}SpringDamping` as VehicleGeneKey, label: `Koło ${slotNum} · Tłumienie`, minimum: 0.35, maximum: 0.95 },
    { key: `${prefix}DriveShare` as VehicleGeneKey, label: `Koło ${slotNum} · Udział w napędzie`, minimum: 0, maximum: 1 },
    { key: `${prefix}SpeedRatio` as VehicleGeneKey, label: `Koło ${slotNum} · Względne obroty`, minimum: 0.65, maximum: 1.3 }
  ];
}

export const CONTINUOUS_GENE_RANGES: readonly GeneRange[] = [
  ...BODY_GENE_RANGES,
  ...getWheelSlotGeneRanges(0),
  ...getWheelSlotGeneRanges(1),
  ...getWheelSlotGeneRanges(2),
  ...getWheelSlotGeneRanges(3)
];

export const GENE_RANGES: readonly GeneRange[] = CONTINUOUS_GENE_RANGES;

export const DEFAULT_RUN_CONFIG: RunConfig = {
  seed: "evolab-42",
  populationSize: 20,
  mutationRate: 0.18,
  mutationStrength: 0.14,
  eliteCount: 1,
  terrainProfile: "smooth",
  difficulty: 3,
  wheelCountMode: "2-4",
  trainingMode: "single"
};

export function allowedWheelCounts(mode: WheelCountMode): readonly number[] {
  switch (mode) {
    case "2":
      return [2];
    case "2-3":
      return [2, 3];
    case "2-4":
    default:
      return [2, 3, 4];
  }
}

export function validateRunConfig(config: RunConfig): string[] {
  const issues: string[] = [];
  if (config.seed.trim().length < 1 || config.seed.length > 80) {
    issues.push("Seed musi mieć od 1 do 80 znaków.");
  }
  if (!Number.isInteger(config.populationSize) || config.populationSize < 4 || config.populationSize > 80) {
    issues.push("Populacja musi być liczbą całkowitą od 4 do 80.");
  }
  if (
    !Number.isFinite(config.mutationRate) ||
    config.mutationRate < 0 ||
    config.mutationRate > 1
  ) {
    issues.push("Częstość mutacji musi mieścić się między 0% a 100%.");
  }
  if (
    !Number.isFinite(config.mutationStrength) ||
    config.mutationStrength < 0 ||
    config.mutationStrength > 0.5
  ) {
    issues.push("Siła mutacji musi mieścić się między 0% a 50%.");
  }
  if (
    !Number.isInteger(config.eliteCount) ||
    config.eliteCount < 0 ||
    config.eliteCount >= config.populationSize
  ) {
    issues.push("Liczba elit musi być nieujemna i mniejsza od populacji.");
  }
  if (
    config.terrainProfile !== "smooth" &&
    config.terrainProfile !== "steep-hills" &&
    config.terrainProfile !== "bumpy"
  ) {
    issues.push("Nieprawidłowy profil terenu.");
  }
  if (
    !Number.isInteger(config.difficulty) ||
    config.difficulty < 1 ||
    config.difficulty > 5
  ) {
    issues.push("Trudność musi być liczbą całkowitą od 1 do 5.");
  }
  if (
    config.wheelCountMode !== "2" &&
    config.wheelCountMode !== "2-3" &&
    config.wheelCountMode !== "2-4"
  ) {
    issues.push("Nieprawidłowy tryb liczby kół.");
  }
  if (
    config.trainingMode !== undefined &&
    config.trainingMode !== "single" &&
    config.trainingMode !== "triple"
  ) {
    issues.push("Nieprawidłowy tryb treningu.");
  }
  return issues;
}

export function createInitialPopulation(config: RunConfig): Genome[] {
  return Array.from({ length: config.populationSize }, (_, index) => ({
    id: genomeId(1, index + 1),
    generation: 1,
    genes: randomGenes(
      createRng(deriveSeed(config.seed, "population-init", 1, index + 1)),
      config.wheelCountMode
    ),
    lineage: { kind: "founder" }
  }));
}

export function calculateTrackProgress(result: TrialResult, terrain: Terrain, startX = 0): number {
  if (result.reason === "finished") {
    return 100;
  }
  const finishDistance = getTrackFinishDistance(terrain, startX);
  return clamp((result.maxDistance / finishDistance) * 100, 0, 100);
}

export function evaluateMultiTrackIndividual(
  genome: Genome,
  trackResults: readonly { profile: TerrainProfile; result: TrialResult; terrain: Terrain }[]
): EvaluatedIndividual {
  const summaries: TrackTrialSummary[] = trackResults.map(({ profile, result, terrain }) => {
    const progressPercent = calculateTrackProgress(result, terrain);
    return {
      profile,
      result,
      progressPercent
    };
  });

  const progresses = summaries.map((s) => s.progressPercent);
  const avgProgress = progresses.reduce((a, b) => a + b, 0) / (progresses.length || 1);
  const minProgress = Math.min(...progresses);
  const score = 0.5 * avgProgress + 0.5 * minProgress;

  const totalSpeed = summaries.reduce((sum, s) => sum + s.result.averageSpeed, 0);
  const averageSpeed = totalSpeed / (summaries.length || 1);

  return {
    genome,
    score,
    averageSpeed,
    trackResults: summaries
  };
}

export function rankEvaluatedIndividuals(
  individuals: readonly EvaluatedIndividual[]
): EvaluatedIndividual[] {
  return [...individuals].sort((left, right) => {
    const scoreDifference = right.score - left.score;
    if (Math.abs(scoreDifference) > 1e-9) {
      return scoreDifference;
    }
    const speedDifference = right.averageSpeed - left.averageSpeed;
    if (Math.abs(speedDifference) > 1e-9) {
      return speedDifference;
    }
    return left.genome.id.localeCompare(right.genome.id);
  });
}

export function rankResults(results: readonly TrialResult[]): TrialResult[] {
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

export function createNextPopulationFromEvaluated(
  ranked: readonly EvaluatedIndividual[],
  config: RunConfig,
  generation: number
): Genome[] {
  if (ranked.length !== config.populationSize) {
    throw new Error("Nie można utworzyć pokolenia z niepełnej populacji.");
  }

  const next: Genome[] = ranked
    .slice(0, config.eliteCount)
    .map((individual, index) => ({
      id: genomeId(generation, index + 1),
      generation,
      genes: { ...individual.genome.genes },
      lineage: { kind: "elite", sourceId: individual.genome.id }
    }));

  while (next.length < config.populationSize) {
    const childIndex = next.length + 1;
    const selectionRandom = createRng(
      deriveSeed(config.seed, "parent-selection", generation, childIndex)
    );
    const first = selectRankBiasedItem(ranked, selectionRandom);
    const second = selectDistinctParentItem(ranked, first, selectionRandom);
    const crossed = crossoverGenes(
      first.genome.genes,
      second.genome.genes,
      createRng(deriveSeed(config.seed, "crossover", generation, childIndex))
    );
    const genes = mutateGenes(
      crossed,
      config,
      createRng(deriveSeed(config.seed, "mutation", generation, childIndex))
    );
    next.push({
      id: genomeId(generation, childIndex),
      generation,
      genes,
      lineage: {
        kind: "offspring",
        parentIds: [first.genome.id, second.genome.id]
      }
    });
  }

  return next;
}

export function createNextPopulation(
  results: readonly TrialResult[],
  config: RunConfig,
  generation: number
): Genome[] {
  if (results.length !== config.populationSize) {
    throw new Error("Nie można utworzyć pokolenia z niepełnej populacji.");
  }

  const ranked = rankResults(results);
  const next: Genome[] = ranked
    .slice(0, config.eliteCount)
    .map((result, index) => ({
      id: genomeId(generation, index + 1),
      generation,
      genes: { ...result.genome.genes },
      lineage: { kind: "elite", sourceId: result.genome.id }
    }));

  while (next.length < config.populationSize) {
    const childIndex = next.length + 1;
    const selectionRandom = createRng(
      deriveSeed(config.seed, "parent-selection", generation, childIndex)
    );
    const first = selectRankBiased(ranked, selectionRandom);
    const second = selectDistinctParent(ranked, first, selectionRandom);
    const crossed = crossoverGenes(
      first.genome.genes,
      second.genome.genes,
      createRng(deriveSeed(config.seed, "crossover", generation, childIndex))
    );
    const genes = mutateGenes(
      crossed,
      config,
      createRng(deriveSeed(config.seed, "mutation", generation, childIndex))
    );
    next.push({
      id: genomeId(generation, childIndex),
      generation,
      genes,
      lineage: {
        kind: "offspring",
        parentIds: [first.genome.id, second.genome.id]
      }
    });
  }

  return next;
}

export function summarizeGeneration(
  generation: number,
  results: readonly TrialResult[]
): GenerationSummary {
  const ranked = rankResults(results);
  const best = ranked[0];
  const total = ranked.reduce((sum, result) => sum + result.maxDistance, 0);
  return {
    generation,
    bestDistance: best?.maxDistance ?? 0,
    averageDistance: ranked.length === 0 ? 0 : total / ranked.length,
    invalidCount: ranked.filter((result) => result.reason === "invalid").length,
    bestGenomeId: best?.genome.id ?? "—",
    completedTrials: ranked.length
  };
}

export function summarizeMultiTrackGeneration(
  generation: number,
  ranked: readonly EvaluatedIndividual[]
): GenerationSummary {
  const best = ranked[0];
  const total = ranked.reduce((sum, ind) => sum + ind.score, 0);
  const invalidCount = ranked.filter((ind) =>
    ind.trackResults.some((t) => t.result.reason === "invalid")
  ).length;

  return {
    generation,
    bestDistance: best?.score ?? 0, // Score points stored in bestDistance for summary
    averageDistance: ranked.length === 0 ? 0 : total / ranked.length,
    invalidCount,
    bestGenomeId: best?.genome.id ?? "—",
    completedTrials: ranked.length
  };
}

export function hashEvolutionState(
  summaries: readonly GenerationSummary[],
  population: readonly Genome[]
): string {
  const canonical = JSON.stringify({
    summaries: summaries.map((summary) => ({
      ...summary,
      bestDistance: rounded(summary.bestDistance),
      averageDistance: rounded(summary.averageDistance)
    })),
    population: population.map((genome) => ({
      id: genome.id,
      generation: genome.generation,
      lineage: genome.lineage,
      genes: {
        wheelCount: genome.genes.wheelCount,
        ...Object.fromEntries(
          CONTINUOUS_GENE_RANGES.map(({ key }) => [key, rounded(genome.genes[key])])
        )
      }
    }))
  });

  let hash = 2_166_136_261;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function genesAreInRange(genes: VehicleGenes, mode?: WheelCountMode): boolean {
  const allowed = mode ? allowedWheelCounts(mode) : [2, 3, 4];
  if (!allowed.includes(genes.wheelCount)) {
    return false;
  }
  return CONTINUOUS_GENE_RANGES.every(
    ({ key, minimum, maximum }) =>
      Number.isFinite(genes[key]) &&
      genes[key] >= minimum &&
      genes[key] <= maximum
  );
}

function randomGenes(random: RandomSource, mode: WheelCountMode): VehicleGenes {
  const allowed = allowedWheelCounts(mode);
  const chosenIndex = Math.floor(random() * allowed.length);
  const wheelCount = allowed[Math.min(chosenIndex, allowed.length - 1)] ?? 2;

  const genes: Record<string, number> = {
    wheelCount,
    legacyAnchors: 0
  };

  for (const { key, minimum, maximum } of CONTINUOUS_GENE_RANGES) {
    genes[key] = randomBetween(random, minimum, maximum);
  }

  return genes as unknown as VehicleGenes;
}

function selectRankBiasedItem<T extends { genome: Genome }>(
  ranked: readonly T[],
  random: RandomSource
): T {
  const index = Math.min(ranked.length - 1, Math.floor(random() ** 2 * ranked.length));
  const result = ranked[index];
  if (result === undefined) {
    throw new Error("Nie można wybrać rodzica z pustego rankingu.");
  }
  return result;
}

function selectDistinctParentItem<T extends { genome: Genome }>(
  ranked: readonly T[],
  first: T,
  random: RandomSource
): T {
  if (ranked.length < 2) {
    return first;
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = selectRankBiasedItem(ranked, random);
    if (candidate.genome.id !== first.genome.id) {
      return candidate;
    }
  }
  const fallback = ranked.find((candidate) => candidate.genome.id !== first.genome.id);
  return fallback ?? first;
}

function selectRankBiased(
  ranked: readonly TrialResult[],
  random: RandomSource
): TrialResult {
  return selectRankBiasedItem(ranked, random);
}

function selectDistinctParent(
  ranked: readonly TrialResult[],
  first: TrialResult,
  random: RandomSource
): TrialResult {
  return selectDistinctParentItem(ranked, first, random);
}

function crossoverGenes(
  first: VehicleGenes,
  second: VehicleGenes,
  random: RandomSource
): VehicleGenes {
  const crossed: Record<string, number> = {
    wheelCount: random() < 0.5 ? first.wheelCount : second.wheelCount,
    legacyAnchors: random() < 0.5 ? first.legacyAnchors : second.legacyAnchors
  };

  for (const { key } of CONTINUOUS_GENE_RANGES) {
    crossed[key] = random() < 0.5 ? first[key] : second[key];
  }

  return crossed as unknown as VehicleGenes;
}

function mutateGenes(
  source: VehicleGenes,
  config: RunConfig,
  random: RandomSource
): VehicleGenes {
  const mutated = { ...source };
  const allowed = allowedWheelCounts(config.wheelCountMode);
  const minWheels = Math.min(...allowed);
  const maxWheels = Math.max(...allowed);

  // Mutacja liczby kół: zmiana o losowe -1 lub +1 z prawdopodobieństwem mutationRate
  if (minWheels < maxWheels && random() < config.mutationRate) {
    const delta = random() < 0.5 ? -1 : 1;
    mutated.wheelCount = Math.min(maxWheels, Math.max(minWheels, mutated.wheelCount + delta));
  } else if (!allowed.includes(mutated.wheelCount)) {
    mutated.wheelCount = Math.min(maxWheels, Math.max(minWheels, mutated.wheelCount));
  }

  // Mutacja cech ciągłych
  for (const { key, minimum, maximum } of CONTINUOUS_GENE_RANGES) {
    if (random() >= config.mutationRate) {
      continue;
    }
    const span = maximum - minimum;
    const triangularDelta = (random() - random()) * span * config.mutationStrength;
    mutated[key] = clamp(mutated[key] + triangularDelta, minimum, maximum);
  }
  return mutated;
}

function genomeId(generation: number, position: number): string {
  return `g${generation}-p${position}`;
}

function rounded(value: number): number {
  return Number(value.toFixed(6));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
