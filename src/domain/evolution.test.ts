import { describe, expect, it } from "vitest";
import { buildPhenotype, polygonIsConvex } from "./phenotype";
import {
  DEFAULT_RUN_CONFIG,
  createInitialPopulation,
  createNextPopulation,
  genesAreInRange,
  hashEvolutionState,
  summarizeGeneration,
  validateRunConfig
} from "./evolution";
import type { Genome, TrialResult } from "./types";

describe("Evolution Engine", () => {
  it("tworzy deterministyczną, poprawną populację początkową", () => {
    const first = createInitialPopulation(DEFAULT_RUN_CONFIG);
    const second = createInitialPopulation(DEFAULT_RUN_CONFIG);

    expect(first).toEqual(second);
    expect(first).toHaveLength(DEFAULT_RUN_CONFIG.populationSize);
    expect(first.every(({ genes }) => genesAreInRange(genes))).toBe(true);
    expect(first.every((genome) => polygonIsConvex(buildPhenotype(genome).vertices))).toBe(
      true
    );
  });

  it("zachowuje elitę, dwóch rodziców i stałą liczebność", () => {
    const population = createInitialPopulation({
      ...DEFAULT_RUN_CONFIG,
      populationSize: 8,
      eliteCount: 1
    });
    const results = rankedResults(population);
    const next = createNextPopulation(
      results,
      { ...DEFAULT_RUN_CONFIG, populationSize: 8, eliteCount: 1 },
      2
    );

    expect(next).toHaveLength(8);
    expect(next[0]?.lineage).toEqual({ kind: "elite", sourceId: population[7]?.id });
    expect(next[0]?.genes).toEqual(population[7]?.genes);
    expect(
      next.slice(1).every((genome) => {
        if (genome.lineage.kind !== "offspring") {
          return false;
        }
        return genome.lineage.parentIds[0] !== genome.lineage.parentIds[1];
      })
    ).toBe(true);
    expect(next.every(({ genes }) => genesAreInRange(genes))).toBe(true);
  });

  it("daje stabilny hash ewolucji", () => {
    const config = { ...DEFAULT_RUN_CONFIG, populationSize: 6, eliteCount: 1 };
    const population = createInitialPopulation(config);
    const results = rankedResults(population);
    const summary = summarizeGeneration(1, results);
    const next = createNextPopulation(results, config, 2);

    expect(hashEvolutionState([summary], next)).toBe(
      hashEvolutionState([summary], createNextPopulation(results, config, 2))
    );
  });

  it("odrzuca niefinitywne ustawienia", () => {
    expect(
      validateRunConfig({
        ...DEFAULT_RUN_CONFIG,
        mutationRate: Number.NaN,
        mutationStrength: Number.POSITIVE_INFINITY
      })
    ).toHaveLength(2);
  });

  it("poprawnie inicjalizuje populację startową z garażu dla 1 rodzica i kilku rodziców", () => {
    const founderPop = createInitialPopulation(DEFAULT_RUN_CONFIG);
    const parent1 = founderPop[0]!;
    const parent2 = founderPop[1]!;

    // Test z 1 rodzicem
    const singleParentConfig = {
      ...DEFAULT_RUN_CONFIG,
      populationSize: 10,
      populationSource: "garage" as const,
      garageFounders: [
        { id: "parent-1", name: "Pojazd 1", genome: parent1 }
      ]
    };

    const singleResult1 = createInitialPopulation(singleParentConfig);
    const singleResult2 = createInitialPopulation(singleParentConfig);

    expect(singleResult1).toEqual(singleResult2);
    expect(singleResult1).toHaveLength(10);
    // K = 1 nienaruszona kopia
    expect(singleResult1[0]?.id).toBe("g1-p1");
    expect(singleResult1[0]?.genes).toEqual(parent1.genes);
    expect(singleResult1[0]?.lineage).toEqual({ kind: "founder" });

    // Wszystkie osobniki w G1 mają lineage "founder"
    expect(singleResult1.every((g) => g.lineage.kind === "founder")).toBe(true);

    // Test z 2 rodzicami
    const multiParentConfig = {
      ...DEFAULT_RUN_CONFIG,
      populationSize: 10,
      populationSource: "garage" as const,
      garageFounders: [
        { id: "parent-1", name: "Pojazd 1", genome: parent1 },
        { id: "parent-2", name: "Pojazd 2", genome: parent2 }
      ]
    };

    const multiResult1 = createInitialPopulation(multiParentConfig);
    const multiResult2 = createInitialPopulation(multiParentConfig);

    expect(multiResult1).toEqual(multiResult2);
    expect(multiResult1).toHaveLength(10);
    // K = 2 nienaruszone kopie
    expect(multiResult1[0]?.genes).toEqual(parent1.genes);
    expect(multiResult1[1]?.genes).toEqual(parent2.genes);
    expect(multiResult1[0]?.lineage).toEqual({ kind: "founder" });
    expect(multiResult1[1]?.lineage).toEqual({ kind: "founder" });
    expect(multiResult1.every((g) => g.lineage.kind === "founder")).toBe(true);
    expect(multiResult1.every(({ genes }) => genesAreInRange(genes))).toBe(true);
  });
});

function rankedResults(population: Genome[]): TrialResult[] {
  return population.map((genome, index) => ({
    genome,
    maxDistance: index + 1,
    averageSpeed: (index + 1) / 2,
    ticks: 60,
    reason: "step-limit",
    trace: []
  }));
}
