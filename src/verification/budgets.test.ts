import { describe, expect, it } from "vitest";
import {
  createInitialPopulation,
  createNextPopulation,
  hashEvolutionState,
  summarizeGeneration
} from "../domain/evolution";
import { createTerrain } from "../domain/world";
import type {
  GenerationSummary,
  Genome,
  RunConfig,
  TrialResult
} from "../domain/types";
import { TrialEvaluation } from "../run/trial-evaluation";
import { PlanckSimulationAdapter } from "../simulation/planck-adapter";

const BUDGET_CONFIG: RunConfig = {
  seed: "budget-owner-desktop",
  populationSize: 20,
  mutationRate: 0.18,
  mutationStrength: 0.14,
  eliteCount: 1,
  terrainProfile: "smooth",
  difficulty: 3,
  wheelCountMode: "2"
};

describe("Budżety M1–M4 na środowisku właściciela", () => {
  it("utrzymuje przepustowość, czas pokolenia i stabilność", () => {
    const adapter = new PlanckSimulationAdapter();
    const terrain = createTerrain(BUDGET_CONFIG.seed);
    let population = createInitialPopulation(BUDGET_CONFIG);
    const durations: number[] = [];
    let totalSteps = 0;
    let invalidCount = 0;

    // Jedna mała próba rozgrzewa JIT poza pomiarem P95.
    evaluate(adapter, terrain, population[0]!, false);

    for (let generation = 1; generation <= 5; generation += 1) {
      const startedAt = performance.now();
      const results = population.map((genome) => {
        const result = evaluate(adapter, terrain, genome, false);
        totalSteps += result.ticks;
        if (result.reason === "invalid") {
          invalidCount += 1;
        }
        return result;
      });
      durations.push(performance.now() - startedAt);
      population = createNextPopulation(
        results,
        BUDGET_CONFIG,
        generation + 1
      );
    }

    const totalMilliseconds = durations.reduce((sum, value) => sum + value, 0);
    const stepsPerSecond = totalSteps / (totalMilliseconds / 1_000);
    const sorted = [...durations].sort((left, right) => left - right);
    const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1] ?? Infinity;

    console.info(
      `budgets: ${Math.round(stepsPerSecond)} steps/s, P95 ${p95.toFixed(1)} ms, invalid ${invalidCount}`
    );
    expect(stepsPerSecond).toBeGreaterThanOrEqual(30_000);
    expect(p95).toBeLessThanOrEqual(1_500);
    expect(invalidCount).toBe(0);
  });

  it("powtarza 10/10 hashy tego samego manifestu", () => {
    const config: RunConfig = {
      ...BUDGET_CONFIG,
      seed: "repeatability-10-of-10",
      populationSize: 8
    };
    const hashes = Array.from({ length: 10 }, () => runScenario(config, 3));

    expect(new Set(hashes)).toEqual(new Set([hashes[0]]));
  }, 15000);

  it("nie zmienia wyniku po dołączeniu obserwatora renderera", () => {
    const adapter = new PlanckSimulationAdapter();
    const terrain = createTerrain("render-invariance");
    const genome = createInitialPopulation({
      ...BUDGET_CONFIG,
      seed: "render-invariance",
      populationSize: 4
    })[0]!;

    const headless = evaluate(adapter, terrain, genome, false);
    const observed = evaluate(adapter, terrain, genome, true);

    expect(canonicalResult(observed)).toEqual(canonicalResult(headless));
    expect(new TextEncoder().encode(JSON.stringify(observed.trace)).byteLength).toBeLessThan(
      2_000_000
    );
  });
});

function runScenario(config: RunConfig, generations: number): string {
  const adapter = new PlanckSimulationAdapter();
  const terrain = createTerrain(config.seed);
  let population = createInitialPopulation(config);
  const summaries: GenerationSummary[] = [];

  for (let generation = 1; generation <= generations; generation += 1) {
    const results = population.map((genome) =>
      evaluate(adapter, terrain, genome, false)
    );
    summaries.push(summarizeGeneration(generation, results));
    population = createNextPopulation(results, config, generation + 1);
  }

  return hashEvolutionState(summaries, population);
}

function evaluate(
  adapter: PlanckSimulationAdapter,
  terrain: ReturnType<typeof createTerrain>,
  genome: Genome,
  observe: boolean
): TrialResult {
  const evaluation = new TrialEvaluation(
    adapter.createTrial(genome, terrain),
    genome,
    terrain
  );
  let observationChecksum = 0;
  while (!evaluation.done) {
    const snapshot = evaluation.advance();
    if (observe) {
      observationChecksum +=
        snapshot.chassis.x + snapshot.chassis.y + (snapshot.wheels[0]?.angle ?? 0);
    }
  }
  expect(Number.isFinite(observationChecksum)).toBe(true);
  return evaluation.result();
}

function canonicalResult(result: TrialResult) {
  return {
    distance: Number(result.maxDistance.toFixed(6)),
    speed: Number(result.averageSpeed.toFixed(6)),
    ticks: result.ticks,
    reason: result.reason,
    trace: result.trace.map((frame) => ({
      tick: frame.tick,
      chassis: {
        x: Number(frame.chassis.x.toFixed(6)),
        y: Number(frame.chassis.y.toFixed(6)),
        angle: Number(frame.chassis.angle.toFixed(6))
      }
    }))
  };
}
