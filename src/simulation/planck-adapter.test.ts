import { describe, expect, it } from "vitest";
import { createInitialPopulation, DEFAULT_RUN_CONFIG } from "../domain/evolution";
import { createTerrain } from "../domain/world";
import { TrialEvaluation } from "../run/trial-evaluation";
import { PlanckSimulationAdapter } from "./planck-adapter";

describe("Planck Simulation Adapter", () => {
  it("daje identyczny wynik i ślad dla tych samych wejść", () => {
    const config = { ...DEFAULT_RUN_CONFIG, populationSize: 4 };
    const genome = createInitialPopulation(config)[0];
    if (genome === undefined) {
      throw new Error("Brak genomu testowego.");
    }
    const terrain = createTerrain(config.seed);
    const adapter = new PlanckSimulationAdapter();

    const first = evaluate(adapter, genome, terrain);
    const second = evaluate(adapter, genome, terrain);

    expect(canonical(first)).toEqual(canonical(second));
    expect(first.reason).not.toBe("invalid");
    expect(first.trace.length).toBeLessThanOrEqual(302);
  });
});

function evaluate(
  adapter: PlanckSimulationAdapter,
  genome: ReturnType<typeof createInitialPopulation>[number],
  terrain: ReturnType<typeof createTerrain>
) {
  const evaluation = new TrialEvaluation(
    adapter.createTrial(genome, terrain),
    genome,
    terrain
  );
  while (!evaluation.done) {
    evaluation.advance();
  }
  return evaluation.result();
}

function canonical(result: ReturnType<typeof evaluate>) {
  return {
    distance: Number(result.maxDistance.toFixed(6)),
    speed: Number(result.averageSpeed.toFixed(6)),
    ticks: result.ticks,
    reason: result.reason,
    trace: result.trace.map((frame) => ({
      tick: frame.tick,
      x: Number(frame.chassis.x.toFixed(6)),
      y: Number(frame.chassis.y.toFixed(6))
    }))
  };
}
