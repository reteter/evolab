import {
  FIXED_DELTA_SECONDS,
  MAX_TRIAL_STEPS,
  STAGNATION_STEPS,
  TRACE_EVERY_STEPS,
  type Genome,
  type Terrain,
  type TraceFrame,
  type TrialEndReason,
  type TrialResult,
  type TrialSnapshot
} from "../domain/types";
import type { TrialWorld } from "../simulation/simulation-port";

export interface TrialLimits {
  maxSteps: number;
  stagnationSteps: number;
  traceEverySteps: number;
  minimumObservationSteps: number;
}

export const DEFAULT_TRIAL_LIMITS: TrialLimits = {
  maxSteps: MAX_TRIAL_STEPS,
  stagnationSteps: STAGNATION_STEPS,
  traceEverySteps: TRACE_EVERY_STEPS,
  minimumObservationSteps: 120
};

export class TrialEvaluation {
  private readonly trace: TraceFrame[] = [];
  private readonly startX: number;
  private latest: TrialSnapshot;
  private maxDistance = 0;
  private lastProgressTick = 0;
  private endReason: TrialEndReason | null = null;
  private disposed = false;

  constructor(
    private readonly world: TrialWorld,
    private readonly genome: Genome,
    private readonly terrain: Terrain,
    private readonly limits: TrialLimits = DEFAULT_TRIAL_LIMITS
  ) {
    this.latest = world.snapshot();
    this.startX = this.latest.chassis.x;
    this.captureTrace(this.latest);
  }

  get done(): boolean {
    return this.endReason !== null;
  }

  get distance(): number {
    return this.maxDistance;
  }

  snapshot(): TrialSnapshot {
    return this.latest;
  }

  advance(): TrialSnapshot {
    if (this.done) {
      return this.latest;
    }

    this.latest = this.world.step(FIXED_DELTA_SECONDS);
    const distance = Math.max(0, this.latest.chassis.x - this.startX);
    if (distance > this.maxDistance + 0.02) {
      this.maxDistance = distance;
      this.lastProgressTick = this.latest.tick;
    }

    if (this.latest.tick % this.limits.traceEverySteps === 0) {
      this.captureTrace(this.latest);
    }

    this.endReason = this.resolveEndReason();
    if (this.endReason !== null) {
      this.captureTrace(this.latest);
      this.dispose();
    }
    return this.latest;
  }

  result(): TrialResult {
    if (this.endReason === null) {
      throw new Error(`Próba ${this.genome.id} jeszcze trwa.`);
    }

    return {
      genome: this.genome,
      maxDistance: this.maxDistance,
      averageSpeed:
        this.latest.tick === 0
          ? 0
          : this.maxDistance / (this.latest.tick * FIXED_DELTA_SECONDS),
      ticks: this.latest.tick,
      reason: this.endReason,
      trace: this.trace
    };
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.world.dispose();
  }

  private resolveEndReason(): TrialEndReason | null {
    if (!this.latest.finite) {
      return "invalid";
    }
    if (this.latest.chassis.y < -9) {
      return "fell";
    }
    if (this.latest.chassis.x >= this.terrain.endX - 8) {
      return "finished";
    }
    if (
      this.latest.tick >= this.limits.minimumObservationSteps &&
      this.latest.tick - this.lastProgressTick >= this.limits.stagnationSteps
    ) {
      return "stagnation";
    }
    if (this.latest.tick >= this.limits.maxSteps) {
      return "step-limit";
    }
    return null;
  }

  private captureTrace(snapshot: TrialSnapshot): void {
    if (this.trace.at(-1)?.tick === snapshot.tick) {
      return;
    }
    this.trace.push({
      tick: snapshot.tick,
      distance: this.maxDistance,
      finite: snapshot.finite,
      chassis: { ...snapshot.chassis },
      wheels: [{ ...snapshot.wheels[0] }, { ...snapshot.wheels[1] }]
    });
  }
}
