import { rankEvaluatedIndividuals, rankResults } from "../domain/evolution";
import type {
  BestRecord,
  EvaluatedIndividual,
  GenerationSummary,
  TrackTrialSummary,
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

  considerMultiTrackIndividual(generation: number, individual: EvaluatedIndividual): boolean {
    if (this.bestRecord !== null) {
      const currentScore = this.bestRecord.score ?? 0;
      if (individual.score < currentScore - 1e-9) {
        return false;
      }
      if (Math.abs(individual.score - currentScore) <= 1e-9) {
        // Compare averageSpeed then genome.id
        const currentSpeed =
          this.bestRecord.trackResults?.reduce((sum, t) => sum + t.result.averageSpeed, 0) ?? 0;
        const currentAvgSpeed = currentSpeed / (this.bestRecord.trackResults?.length || 1);
        if (individual.averageSpeed < currentAvgSpeed - 1e-9) {
          return false;
        }
        if (
          Math.abs(individual.averageSpeed - currentAvgSpeed) <= 1e-9 &&
          individual.genome.id.localeCompare(this.bestRecord.result.genome.id) >= 0
        ) {
          return false;
        }
      }
    }

    const firstSummary = individual.trackResults[0] ?? {
      result: {
        genome: individual.genome,
        maxDistance: 0,
        averageSpeed: individual.averageSpeed,
        ticks: 0,
        reason: "finished",
        trace: []
      }
    };

    this.bestRecord = {
      generation,
      result: cloneTrialResult(firstSummary.result),
      score: individual.score,
      trackResults: individual.trackResults.map((t) => ({
        profile: t.profile,
        progressPercent: t.progressPercent,
        result: cloneTrialResult(t.result)
      }))
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

  restore(summaries: readonly GenerationSummary[], samplingStride: number, bestRecord: BestRecord | null): void {
    this.summaries = summaries.map((s) => ({ ...s }));
    this.samplingStride = samplingStride;
    this.bestRecord = bestRecord !== null ? {
      generation: bestRecord.generation,
      result: cloneTrialResult(bestRecord.result),
      score: bestRecord.score,
      trackResults: bestRecord.trackResults?.map((t) => ({
        profile: t.profile,
        progressPercent: t.progressPercent,
        result: cloneTrialResult(t.result)
      }))
    } : null;
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
      wheels: frame.wheels.map((w) => ({ ...w }))
    }))
  };
}
