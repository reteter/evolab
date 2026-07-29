import { rankResults } from "../domain/evolution";
import type {
  BestRecord,
  GenerationSummary,
  TrialResult
} from "../domain/types";

const MAX_DISPLAY_POINTS = 1_200;

export class RunLog {
  private summaries: GenerationSummary[] = [];
  private samplingStride = 1;
  private bestRecord: BestRecord | null = null;

  considerResult(generation: number, result: TrialResult): boolean {
    const current = this.bestRecord?.result;
    if (current !== undefined && compareResults(current, result) <= 0) {
      return false;
    }
    this.bestRecord = {
      generation,
      result: cloneTrialResult(result)
    };
    return true;
  }

  recordGeneration(summary: GenerationSummary): void {
    if (summary.generation % this.samplingStride === 0) {
      this.summaries.push({ ...summary });
    }

    if (this.summaries.length > MAX_DISPLAY_POINTS) {
      this.samplingStride *= 2;
      this.summaries = this.summaries.filter(
        ({ generation }) => generation % this.samplingStride === 0
      );
    }
  }

  getSummaries(): readonly GenerationSummary[] {
    return this.summaries;
  }

  getBestRecord(): BestRecord | null {
    return this.bestRecord;
  }

  getSamplingStride(): number {
    return this.samplingStride;
  }
}

function compareResults(left: TrialResult, right: TrialResult): number {
  return rankResults([left, right])[0] === left ? -1 : 1;
}

function cloneTrialResult(result: TrialResult): TrialResult {
  return {
    ...result,
    genome: {
      ...result.genome,
      genes: { ...result.genome.genes },
      lineage:
        result.genome.lineage.kind === "offspring"
          ? {
              kind: "offspring",
              parentIds: [...result.genome.lineage.parentIds]
            }
          : { ...result.genome.lineage }
    },
    trace: result.trace.map((frame) => ({
      ...frame,
      chassis: { ...frame.chassis },
      wheels: [{ ...frame.wheels[0] }, { ...frame.wheels[1] }]
    }))
  };
}
