import { CONCURRENT_TRIALS, type Genome, type RunMode, type Terrain, type TrialResult } from "../domain/types";
import type { EvaluationObserver, SimulationExecutor } from "./simulation-executor";
import type { WorkerInMessage, WorkerOutMessage } from "./worker-messages";

interface WorkerSlot {
  id: number;
  worker: Worker;
  busy: boolean;
  assignedGenome: Genome | null;
}

export class WorkerPoolSimulationExecutor implements SimulationExecutor {
  private slots: WorkerSlot[] = [];
  private currentRunToken = 0;
  private currentMode: RunMode = "normal";
  private isPausedState = false;

  constructor() {
    this.ensurePool();
  }

  private ensurePool(): void {
    if (this.slots.length === CONCURRENT_TRIALS) {
      return;
    }
    this.terminate();
    for (let i = 0; i < CONCURRENT_TRIALS; i++) {
      const worker = new Worker(
        new URL("./simulation.worker.ts", import.meta.url),
        { type: "module" }
      );
      this.slots.push({
        id: i,
        worker,
        busy: false,
        assignedGenome: null
      });
    }
  }

  setMode(mode: RunMode, runToken: number): void {
    this.currentMode = mode;
    this.currentRunToken = runToken;
    const msg: WorkerInMessage = {
      type: "set-mode",
      runToken,
      mode
    };
    for (const slot of this.slots) {
      slot.worker.postMessage(msg);
    }
  }

  async pause(runToken: number): Promise<void> {
    this.isPausedState = true;
    this.currentRunToken = runToken;
    const msg: WorkerInMessage = {
      type: "pause",
      runToken
    };
    const activeSlots = this.slots.filter((s) => s.busy);
    if (activeSlots.length === 0) {
      return;
    }

    const waitPaused = activeSlots.map((slot) => {
      return new Promise<void>((resolve) => {
        const handler = (event: MessageEvent<WorkerOutMessage>) => {
          if (event.data?.type === "paused" && event.data.runToken === runToken) {
            slot.worker.removeEventListener("message", handler);
            resolve();
          }
        };
        slot.worker.addEventListener("message", handler);
        slot.worker.postMessage(msg);
      });
    });

    await Promise.all(waitPaused);
  }

  resume(runToken: number): void {
    this.isPausedState = false;
    this.currentRunToken = runToken;
    const msg: WorkerInMessage = {
      type: "resume",
      runToken
    };
    for (const slot of this.slots) {
      slot.worker.postMessage(msg);
    }
  }

  terminate(): void {
    for (const slot of this.slots) {
      try {
        slot.worker.terminate();
      } catch {
        // Ignoruj błędy przy zamykaniu workera
      }
    }
    this.slots = [];
    this.isPausedState = false;
  }

  async evaluatePopulation(params: {
    population: Genome[];
    terrain: Terrain;
    generation: number;
    mode: RunMode;
    runToken: number;
    observer: EvaluationObserver;
    shouldStop: () => boolean;
    isPaused: () => boolean;
  }): Promise<TrialResult[]> {
    const { population, terrain, generation, mode, runToken, observer, shouldStop } = params;
    this.ensurePool();
    this.currentRunToken = runToken;
    this.currentMode = mode;

    return new Promise<TrialResult[]>((resolve) => {
      const results: TrialResult[] = [];
      let nextCandidateIndex = 0;

      const cleanupListeners: (() => void)[] = [];

      const finishAndCleanup = () => {
        for (const cleanup of cleanupListeners) {
          cleanup();
        }
        for (const slot of this.slots) {
          slot.busy = false;
          slot.assignedGenome = null;
        }
        resolve(results);
      };

      const dispatchNext = (slot: WorkerSlot) => {
        if (shouldStop() || runToken !== this.currentRunToken) {
          finishAndCleanup();
          return;
        }

        if (nextCandidateIndex >= population.length) {
          slot.busy = false;
          slot.assignedGenome = null;
          if (results.length === population.length) {
            finishAndCleanup();
          }
          return;
        }

        const genome = population[nextCandidateIndex++]!;
        slot.busy = true;
        slot.assignedGenome = genome;

        const msg: WorkerInMessage = {
          type: "start-trial",
          runToken,
          generation,
          genome,
          terrain,
          mode: this.currentMode
        };
        slot.worker.postMessage(msg);
      };

      for (const slot of this.slots) {
        const handler = (event: MessageEvent<WorkerOutMessage>) => {
          const data = event.data;
          if (!data || data.runToken !== runToken) {
            return;
          }

          if (shouldStop()) {
            finishAndCleanup();
            return;
          }

          if (data.type === "snapshot" && data.generation === generation) {
            if (slot.assignedGenome && slot.assignedGenome.id === data.genomeId) {
              observer.onSnapshot(slot.assignedGenome, data.snapshot, data.distance);
            }
          } else if (data.type === "result" && data.generation === generation) {
            results.push(data.result);
            observer.onResult(data.result);
            dispatchNext(slot);
          }
        };

        slot.worker.addEventListener("message", handler);
        cleanupListeners.push(() => slot.worker.removeEventListener("message", handler));

        // Przypisz pierwsze zadanie
        dispatchNext(slot);
      }
    });
  }
}
