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
  label: string;
  minimum: number;
  maximum: number;
}

export const GENE_RANGES: readonly GeneRange[] = [
  { key: "width", label: "Szerokość korpusu", minimum: 1.05, maximum: 2.6 },
  { key: "height", label: "Wysokość korpusu", minimum: 0.55, maximum: 1.45 },
  { key: "roofScale", label: "Szerokość dachu", minimum: 0.6, maximum: 1.1 },
  { key: "noseScale", label: "Długość przodu", minimum: 0.9, maximum: 1.08 },
  { key: "tailScale", label: "Długość tyłu", minimum: 0.9, maximum: 1.08 },
  { key: "floorTilt", label: "Nachylenie podwozia", minimum: -0.08, maximum: 0.08 },
  { key: "rearInset", label: "Rozstaw tylnego koła", minimum: 0.48, maximum: 0.88 },
  { key: "frontInset", label: "Rozstaw przedniego koła", minimum: 0.48, maximum: 0.88 },
  { key: "rearWheelRadius", label: "Promień tylnego koła", minimum: 0.28, maximum: 1 },
  { key: "frontWheelRadius", label: "Promień przedniego koła", minimum: 0.28, maximum: 1 },
  { key: "motorSpeed", label: "Obroty napędu", minimum: 8, maximum: 22 },
  { key: "motorTorque", label: "Moment napędu", minimum: 28, maximum: 100 },
  { key: "roofOffset", label: "Przesunięcie dachu", minimum: -0.18, maximum: 0.18 },
  { key: "chassisDensity", label: "Gęstość korpusu", minimum: 0.45, maximum: 1.6 },
  { key: "rearWheelDensity", label: "Gęstość tylnego koła", minimum: 0.55, maximum: 1.6 },
  { key: "frontWheelDensity", label: "Gęstość przedniego koła", minimum: 0.55, maximum: 1.6 },
  { key: "rearWheelGrip", label: "Przyczepność tyłu", minimum: 0.5, maximum: 2 },
  { key: "frontWheelGrip", label: "Przyczepność przodu", minimum: 0.5, maximum: 2 },
  { key: "rearRideHeight", label: "Prześwit tyłu", minimum: 0.08, maximum: 0.55 },
  { key: "frontRideHeight", label: "Prześwit przodu", minimum: 0.08, maximum: 0.55 },
  { key: "rearSpringFrequency", label: "Sprężyna tyłu (Hz)", minimum: 2.5, maximum: 7 },
  { key: "frontSpringFrequency", label: "Sprężyna przodu (Hz)", minimum: 2.5, maximum: 7 },
  { key: "rearSpringDamping", label: "Tłumienie tyłu", minimum: 0.35, maximum: 0.95 },
  { key: "frontSpringDamping", label: "Tłumienie przodu", minimum: 0.35, maximum: 0.95 },
  { key: "driveBalance", label: "Udział napędu na przód", minimum: 0, maximum: 1 },
  { key: "frontSpeedRatio", label: "Względne obroty przodu", minimum: 0.65, maximum: 1.3 },
  { key: "ballastMass", label: "Masa balastu", minimum: 0, maximum: 2.8 },
  { key: "ballastOffset", label: "Położenie balastu", minimum: -0.65, maximum: 0.65 }
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
