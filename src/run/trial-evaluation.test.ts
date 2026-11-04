import { describe, expect, it } from "vitest";
import { createInitialPopulation, DEFAULT_RUN_CONFIG } from "../domain/evolution";
import type { Terrain, TrialSnapshot } from "../domain/types";
import type { TrialWorld } from "../simulation/simulation-port";
import { TrialEvaluation } from "./trial-evaluation";

describe("Trial Evaluation", () => {
  it("kończy stagnację i zachowuje ograniczony ślad", () => {
    const genome = createInitialPopulation({
      ...DEFAULT_RUN_CONFIG,
      populationSize: 4
    })[0];
    if (genome === undefined) {
      throw new Error("Brak genomu testowego.");
    }
    const evaluation = new TrialEvaluation(
      new StaticWorld(),
      genome,
      terrain(),
      {
        maxSteps: 20,
        stagnationSteps: 4,
        traceEverySteps: 2,
        minimumObservationSteps: 4
      }
    );

    while (!evaluation.done) {
      evaluation.advance();
    }

    expect(evaluation.result().reason).toBe("stagnation");
    expect(evaluation.result().ticks).toBe(4);
    expect(evaluation.result().trace).toHaveLength(3);
  });
});

class StaticWorld implements TrialWorld {
  private tick = 0;

  step(): TrialSnapshot {
    this.tick += 1;
    return this.snapshot();
  }

  snapshot(): TrialSnapshot {
    return {
      tick: this.tick,
      finite: true,
      chassis: { x: 0, y: 2, angle: 0 },
      wheels: [
        { x: -1, y: 1, angle: 0 },
        { x: 1, y: 1, angle: 0 }
      ]
    };
  }

  dispose(): void {}
}

function terrain(): Terrain {
  return {
    seed: "test",
    profile: "smooth",
    difficulty: 3,
    points: [
      { x: -10, y: 0 },
      { x: 100, y: 0 }
    ],
    startY: 0,
    endX: 100
  };
}
