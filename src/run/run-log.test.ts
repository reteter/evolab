import { describe, expect, it } from "vitest";
import { createInitialPopulation, DEFAULT_RUN_CONFIG } from "../domain/evolution";
import type { GenerationSummary, TrialResult } from "../domain/types";
import { RunLog } from "./run-log";

describe("Run Log", () => {
  it("ogranicza liczbę punktów długiego przebiegu", () => {
    const log = new RunLog();
    for (let generation = 1; generation <= 10_000; generation += 1) {
      log.recordGeneration(summary(generation));
    }

    expect(log.getSummaries().length).toBeLessThanOrEqual(1_200);
    expect(log.getSamplingStride()).toBeGreaterThan(1);
    expect(JSON.stringify(log.getSummaries()).length).toBeLessThan(250_000);
  });

  it("zachowuje tylko aktualnego rekordzistę ze śladem", () => {
    const genome = createInitialPopulation({
      ...DEFAULT_RUN_CONFIG,
      populationSize: 4
    })[0];
    if (genome === undefined) {
      throw new Error("Brak genomu testowego.");
    }
    const log = new RunLog();
    log.considerResult(1, result(genome, 4));
    log.considerResult(2, result(genome, 3));
    log.considerResult(3, result(genome, 7));

    expect(log.getBestRecord()?.generation).toBe(3);
    expect(log.getBestRecord()?.result.maxDistance).toBe(7);
  });
});

function summary(generation: number): GenerationSummary {
  return {
    generation,
    bestDistance: generation,
    averageDistance: generation / 2,
    invalidCount: 0,
    bestGenomeId: `g${generation}-p1`,
    completedTrials: 20
  };
}

function result(
  genome: ReturnType<typeof createInitialPopulation>[number],
  distance: number
): TrialResult {
  return {
    genome,
    maxDistance: distance,
    averageSpeed: distance / 2,
    ticks: 60,
    reason: "step-limit",
    trace: []
  };
}
