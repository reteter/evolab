import { FIXED_DELTA_SECONDS, type TraceFrame } from "../domain/types";

export class ReplayPlayer {
  private frameRequest: number | null = null;
  private token = 0;

  play(
    trace: readonly TraceFrame[],
    onFrame: (frame: TraceFrame) => void,
    onComplete: () => void
  ): void {
    this.cancel();
    if (trace.length === 0) {
      onComplete();
      return;
    }

    const currentToken = ++this.token;
    const firstTick = trace[0]?.tick ?? 0;
    const lastTick = trace.at(-1)?.tick ?? firstTick;
    const duration = Math.max(
      1,
      (lastTick - firstTick) * FIXED_DELTA_SECONDS * 1_000
    );
    const startedAt = performance.now();

    const animate = (now: number) => {
      if (currentToken !== this.token) {
        return;
      }
      const elapsed = Math.min(duration, now - startedAt);
      const targetTick = firstTick + elapsed / (FIXED_DELTA_SECONDS * 1_000);
      let selected = trace[0];
      for (const frame of trace) {
        if (frame.tick > targetTick) {
          break;
        }
        selected = frame;
      }
      if (selected !== undefined) {
        onFrame(selected);
      }

      if (elapsed >= duration) {
        this.frameRequest = null;
        onComplete();
        return;
      }
      this.frameRequest = requestAnimationFrame(animate);
    };

    this.frameRequest = requestAnimationFrame(animate);
  }

  cancel(): void {
    this.token += 1;
    if (this.frameRequest !== null) {
      cancelAnimationFrame(this.frameRequest);
      this.frameRequest = null;
    }
  }
}
