import { describe, expect, it } from "vitest";
import { DEFAULT_RUN_CONFIG } from "../domain/evolution";
import type { Genome, Terrain, TrialSnapshot } from "../domain/types";
import type { SimulationPort, TrialWorld } from "../simulation/simulation-port";
import { RunController, type RunScheduler } from "./run-controller";

describe("Run Controller", () => {
  it("wykonuje wiele pokoleń bez interakcji i zatrzymuje się synchronicznie", async () => {
    const controller = new RunController(new FastFakeSimulation(), immediateScheduler);
    controller.setMode("headless");
    controller.subscribe((state) => {
      if (state.history.at(-1)?.generation === 5) {
        controller.stop();
      }
    });

    await controller.start({
      ...DEFAULT_RUN_CONFIG,
      populationSize: 4,
      eliteCount: 1
    });

    expect(controller.getState().history.at(-1)?.generation).toBe(5);
    expect(controller.getState().status).toBe("stopped");
    expect(controller.getState().bestRecord).not.toBeNull();
  });

  it("potwierdza pauzę, wznowienie i stop bez czekania na kolejną próbę", async () => {
    const controller = new RunController(new FastFakeSimulation(), controlledScheduler);
    const running = controller.start({
      ...DEFAULT_RUN_CONFIG,
      populationSize: 4,
      eliteCount: 1
    });

    controller.pause();
    expect(controller.getState().status).toBe("paused");
    controller.resume();
    expect(controller.getState().status).toBe("running");
    controller.stop();
    expect(controller.getState().status).toBe("stopped");
    releaseControlledScheduler();
    await running;
  });
});

class FastFakeSimulation implements SimulationPort {
  readonly id = "planck";
  readonly label = "fake";

  createTrial(genome: Genome, _terrain: Terrain): TrialWorld {
    return new FastFakeWorld(genome);
  }
}

class FastFakeWorld implements TrialWorld {
  private tick = 0;

  constructor(private readonly genome: Genome) {}

  step(): TrialSnapshot {
    this.tick += 1;
    return this.snapshot();
  }

  snapshot(): TrialSnapshot {
    const x = this.tick * (1 + this.genome.genes.width / 10);
    const y = this.tick >= 3 ? -10 : 2;
    return {
      tick: this.tick,
      finite: true,
      chassis: { x, y, angle: 0 },
      wheels: [
        { x: x - 1, y: y - 1, angle: this.tick },
        { x: x + 1, y: y - 1, angle: this.tick }
      ]
    };
  }

  dispose(): void {}
}

const immediateScheduler: RunScheduler = {
  now: () => 0,
  nextFrame: () => Promise.resolve(),
  nextTask: () => Promise.resolve()
};

let release: (() => void) | null = null;
const controlledScheduler: RunScheduler = {
  now: () => 0,
  nextFrame: () =>
    new Promise((resolve) => {
      release = resolve;
    }),
  nextTask: () => Promise.resolve()
};

function releaseControlledScheduler(): void {
  release?.();
  release = null;
}
