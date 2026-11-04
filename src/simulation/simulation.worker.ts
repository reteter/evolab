import type { RunMode } from "../domain/types";
import { TrialEvaluation } from "../run/trial-evaluation";
import { PlanckSimulationAdapter } from "./planck-adapter";
import type { WorkerInMessage, WorkerOutMessage } from "./worker-messages";

const adapter = new PlanckSimulationAdapter();

let currentEvaluation: TrialEvaluation | null = null;
let currentRunToken = 0;
let currentGeneration = 0;
let currentGenomeId = "";
let currentMode: RunMode = "normal";
let isPaused = false;
let loopTimer: ReturnType<typeof setTimeout> | null = null;
let lastSnapshotTime = 0;
let lastProgressTime = 0;
let loopStartedAt = 0;

function postToMain(msg: WorkerOutMessage): void {
  self.postMessage(msg);
}

function clearLoop(): void {
  if (loopTimer !== null) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
}

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const data = event.data;
  if (!data) return;

  switch (data.type) {
    case "start-trial": {
      clearLoop();
      if (currentEvaluation) {
        currentEvaluation.dispose();
        currentEvaluation = null;
      }
      currentRunToken = data.runToken;
      currentGeneration = data.generation;
      currentGenomeId = data.genome.id;
      currentMode = data.mode;
      isPaused = false;

      const trialWorld = adapter.createTrial(data.genome, data.terrain);
      currentEvaluation = new TrialEvaluation(trialWorld, data.genome, data.terrain);

      lastSnapshotTime = performance.now();
      lastProgressTime = performance.now();
      loopStartedAt = performance.now();

      // Wyślij stan początkowy (snapshot)
      postToMain({
        type: "snapshot",
        runToken: currentRunToken,
        generation: currentGeneration,
        genomeId: currentGenomeId,
        snapshot: currentEvaluation.snapshot(),
        distance: currentEvaluation.distance
      });

      scheduleLoop(0);
      break;
    }

    case "set-mode": {
      if (data.runToken === currentRunToken) {
        currentMode = data.mode;
        // Zresetuj licznik czasu, aby odpowiednio dawkować kroki w nowym trybie
        loopStartedAt = performance.now();
      }
      break;
    }

    case "pause": {
      if (data.runToken === currentRunToken) {
        isPaused = true;
        clearLoop();
        postToMain({
          type: "paused",
          runToken: currentRunToken
        });
      }
      break;
    }

    case "resume": {
      if (data.runToken === currentRunToken) {
        if (isPaused) {
          isPaused = false;
          loopStartedAt = performance.now();
          scheduleLoop(0);
        }
      }
      break;
    }

    case "abort": {
      if (data.runToken === currentRunToken) {
        clearLoop();
        if (currentEvaluation) {
          currentEvaluation.dispose();
          currentEvaluation = null;
        }
      }
      break;
    }
  }
};

function scheduleLoop(delayMs: number): void {
  clearLoop();
  if (isPaused || !currentEvaluation) return;

  if (delayMs <= 0) {
    // Użyj setTimeout(..., 0) aby dać szansę pętli zdarzeń odebrać ewentualne komunikaty onmessage
    loopTimer = setTimeout(runPhysicsChunk, 0);
  } else {
    loopTimer = setTimeout(runPhysicsChunk, delayMs);
  }
}

function runPhysicsChunk(): void {
  loopTimer = null;
  if (isPaused || !currentEvaluation) return;

  const now = performance.now();
  const CHUNK_TIME_LIMIT_MS = 8; // pojedyncza porcja obliczeń do 8 ms
  const chunkStart = now;

  let stepsToRun = 1;
  let nextDelay = 0;

  if (currentMode === "normal") {
    // normal: około 60 kroków fizyki/s (~16.6ms na krok)
    // Obliczamy ile kroków fizyki powinno upłynąć od startu
    const elapsed = now - loopStartedAt;
    const targetSteps = Math.floor((elapsed * 60) / 1000);
    const currentTick = currentEvaluation.snapshot().tick;
    stepsToRun = Math.max(1, Math.min( targetSteps - currentTick, 5 ));
    nextDelay = 16;
  } else if (currentMode === "fast") {
    // fast: około 600 kroków fizyki/s (~10 kroków na 16.6ms)
    const elapsed = now - loopStartedAt;
    const targetSteps = Math.floor((elapsed * 600) / 1000);
    const currentTick = currentEvaluation.snapshot().tick;
    stepsToRun = Math.max(1, Math.min( targetSteps - currentTick, 25 ));
    nextDelay = 8;
  } else {
    // headless: maksymalna przepustowość w porcji 8ms
    stepsToRun = 500;
    nextDelay = 0;
  }

  let finished = false;

  for (let s = 0; s < stepsToRun; s++) {
    currentEvaluation.advance();
    if (currentEvaluation.done) {
      finished = true;
      break;
    }
    if (performance.now() - chunkStart >= CHUNK_TIME_LIMIT_MS) {
      break;
    }
  }

  if (finished) {
    const result = currentEvaluation.result();
    postToMain({
      type: "result",
      runToken: currentRunToken,
      generation: currentGeneration,
      result
    });
    currentEvaluation.dispose();
    currentEvaluation = null;
    return;
  }

  // Weryfikacja dławienia migawek:
  // - normal: migawki maksymalnie 60 razy/s (>= 16ms)
  // - fast: migawki maksymalnie 30 razy/s (>= 33ms)
  // - headless: informacja o postępie najwyżej co 200 ms (>= 200ms)
  const timeSinceLastSnap = now - lastSnapshotTime;
  let shouldSendSnapshot = false;

  if (currentMode === "normal" && timeSinceLastSnap >= 15) {
    shouldSendSnapshot = true;
  } else if (currentMode === "fast" && timeSinceLastSnap >= 32) {
    shouldSendSnapshot = true;
  } else if (currentMode === "headless" && now - lastProgressTime >= 200) {
    shouldSendSnapshot = true;
    lastProgressTime = now;
  }

  if (shouldSendSnapshot) {
    lastSnapshotTime = now;
    postToMain({
      type: "snapshot",
      runToken: currentRunToken,
      generation: currentGeneration,
      genomeId: currentGenomeId,
      snapshot: currentEvaluation.snapshot(),
      distance: currentEvaluation.distance
    });
  }

  scheduleLoop(nextDelay);
}
