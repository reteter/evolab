import { createRng, deriveSeed, randomBetween, type RandomSource } from "./rng";
import type {
  GenerationSummary,
  Genome,
  RunConfig,
  TrialResult,
  VehicleGeneKey,
  VehicleGenes
} from "./types";

interface GeneRange {
  key: VehicleGeneKey;
  minimum: number;
  maximum: number;
}

const GENE_RANGES: readonly GeneRange[] = [
  { key: "width", minimum: 1.25, maximum: 2.2 },
  { key: "height", minimum: 0.68, maximum: 1.18 },
  { key: "roofScale", minimum: 0.76, maximum: 1.05 },
  { key: "noseScale", minimum: 0.9, maximum: 1.08 },
  { key: "tailScale", minimum: 0.9, maximum: 1.08 },
  { key: "floorTilt", minimum: -0.08, maximum: 0.08 },
  { key: "rearInset", minimum: 0.48, maximum: 0.78 },
  { key: "frontInset", minimum: 0.48, maximum: 0.78 },
  { key: "rearWheelRadius", minimum: 0.34, maximum: 0.78 },
  { key: "frontWheelRadius", minimum: 0.34, maximum: 0.78 },
  { key: "motorSpeed", minimum: 8, maximum: 17 },
  { key: "motorTorque", minimum: 28, maximum: 76 }
];

export const DEFAULT_RUN_CONFIG: RunConfig = {
  seed: "evolab-42",
  populationSize: 20,
  mutationRate: 0.18,
  mutationStrength: 0.14,
  eliteCount: 1
};

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
  return issues;
}

export function createInitialPopulation(config: RunConfig): Genome[] {
  return Array.from({ length: config.populationSize }, (_, index) => ({
    id: genomeId(1, index + 1),
    generation: 1,
    genes: randomGenes(
      createRng(deriveSeed(config.seed, "population-init", 1, index + 1))
    ),
    lineage: { kind: "founder" }
  }));
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
      genes: Object.fromEntries(
        GENE_RANGES.map(({ key }) => [key, rounded(genome.genes[key])])
      )
    }))
  });

  let hash = 2_166_136_261;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function genesAreInRange(genes: VehicleGenes): boolean {
  return GENE_RANGES.every(
    ({ key, minimum, maximum }) =>
      Number.isFinite(genes[key]) &&
      genes[key] >= minimum &&
      genes[key] <= maximum
  );
}

function randomGenes(random: RandomSource): VehicleGenes {
  return Object.fromEntries(
    GENE_RANGES.map(({ key, minimum, maximum }) => [
      key,
      randomBetween(random, minimum, maximum)
    ])
  ) as unknown as VehicleGenes;
}

function selectRankBiased(
  ranked: readonly TrialResult[],
  random: RandomSource
): TrialResult {
  const index = Math.min(ranked.length - 1, Math.floor(random() ** 2 * ranked.length));
  const result = ranked[index];
  if (result === undefined) {
    throw new Error("Nie można wybrać rodzica z pustego rankingu.");
  }
  return result;
}

function selectDistinctParent(
  ranked: readonly TrialResult[],
  first: TrialResult,
  random: RandomSource
): TrialResult {
  if (ranked.length < 2) {
    return first;
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = selectRankBiased(ranked, random);
    if (candidate.genome.id !== first.genome.id) {
      return candidate;
    }
  }
  const fallback = ranked.find((candidate) => candidate.genome.id !== first.genome.id);
  return fallback ?? first;
}

function crossoverGenes(
  first: VehicleGenes,
  second: VehicleGenes,
  random: RandomSource
): VehicleGenes {
  return Object.fromEntries(
    GENE_RANGES.map(({ key }) => [key, random() < 0.5 ? first[key] : second[key]])
  ) as unknown as VehicleGenes;
}

function mutateGenes(
  source: VehicleGenes,
  config: RunConfig,
  random: RandomSource
): VehicleGenes {
  const mutated = { ...source };
  for (const { key, minimum, maximum } of GENE_RANGES) {
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
