import type {
  Genome,
  RunMode,
  Terrain,
  TrialResult,
  TrialSnapshot
} from "../domain/types";

// Wiadomości z wątku głównego do Workera
export type WorkerInMessage =
  | {
      type: "start-trial";
      runToken: number;
      generation: number;
      genome: Genome;
      terrain: Terrain;
      mode: RunMode;
    }
  | {
      type: "set-mode";
      runToken: number;
      mode: RunMode;
    }
  | {
      type: "pause";
      runToken: number;
    }
  | {
      type: "resume";
      runToken: number;
    }
  | {
      type: "abort";
      runToken: number;
    };

// Wiadomości z Workera do wątku głównego
export type WorkerOutMessage =
  | {
      type: "snapshot";
      runToken: number;
      generation: number;
      genomeId: string;
      snapshot: TrialSnapshot;
      distance: number;
    }
  | {
      type: "result";
      runToken: number;
      generation: number;
      result: TrialResult;
    }
  | {
      type: "paused";
      runToken: number;
    };
