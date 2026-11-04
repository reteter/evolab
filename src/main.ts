import "./styles.css";
import {
  DEFAULT_RUN_CONFIG,
  validateRunConfig
} from "./domain/evolution";
import type { RunConfig, RunMode } from "./domain/types";
import { CanvasRenderer } from "./presentation/canvas-renderer";
import { ReplayPlayer } from "./presentation/replay-player";
import { TrendChart } from "./presentation/trend-chart";
import { RunController, type RunViewState } from "./run/run-controller";
import { PlanckSimulationAdapter } from "./simulation/planck-adapter";

const form = required<HTMLFormElement>("#run-form");
const configFields = required<HTMLFieldSetElement>("#config-fields");
const seedInput = required<HTMLInputElement>("#seed");
const populationInput = required<HTMLInputElement>("#population");
const elitesInput = required<HTMLInputElement>("#elites");
const mutationRateInput = required<HTMLInputElement>("#mutation-rate");
const mutationStrengthInput = required<HTMLInputElement>("#mutation-strength");
const mutationRateOutput = required<HTMLOutputElement>("#mutation-rate-output");
const mutationStrengthOutput = required<HTMLOutputElement>(
  "#mutation-strength-output"
);
const formError = required<HTMLElement>("#form-error");
const startButton = required<HTMLButtonElement>("#start-run");
const randomSeedButton = required<HTMLButtonElement>("#random-seed");
const pauseButton = required<HTMLButtonElement>("#pause-run");
const replayButton = required<HTMLButtonElement>("#replay-best");
const stopButton = required<HTMLButtonElement>("#stop-run");
const modeButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-mode]")
);
const status = required<HTMLElement>("#run-status");
const statusText = required<HTMLElement>("#run-status-text");
const runMessage = required<HTMLElement>("#run-message");
const candidateId = required<HTMLElement>("#candidate-id");
const candidateProgress = required<HTMLElement>("#candidate-progress");
const currentDistance = required<HTMLElement>("#current-distance");
const generationValue = required<HTMLElement>("#generation-value");
const remainingValue = required<HTMLElement>("#remaining-value");
const overallBestValue = required<HTMLElement>("#overall-best-value");
const generationBestValue = required<HTMLElement>("#generation-best-value");
const generationAverageValue = required<HTMLElement>(
  "#generation-average-value"
);
const recordGenome = required<HTMLElement>("#record-genome");
const headlessOverlay = required<HTMLElement>("#headless-overlay");
const runSummary = required<HTMLElement>("#run-summary");
const summaryResult = required<HTMLElement>("#summary-result");
const summaryDetail = required<HTMLElement>("#summary-detail");
const canvas = required<HTMLCanvasElement>("#simulation-canvas");

const renderer = new CanvasRenderer(canvas);
const chart = new TrendChart(
  required<SVGSVGElement>("#trend-chart"),
  required<HTMLTableSectionElement>("#trend-table-body"),
  required<HTMLElement>("#chart-description")
);
const replay = new ReplayPlayer();
const controller = new RunController(new PlanckSimulationAdapter());

let currentState = controller.getState();
let renderedHistorySignature = "";
let headlessWasVisible = false;

const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
renderer.setReducedMotion(motionPreference.matches);
motionPreference.addEventListener("change", ({ matches }) => {
  renderer.setReducedMotion(matches);
});

controller.subscribe((state) => {
  currentState = state;
  updateInterface(state);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const config = readConfig();
  const issues = validateRunConfig(config);
  if (issues.length > 0) {
    formError.textContent = issues[0] ?? "Sprawdź ustawienia.";
    return;
  }

  replay.cancel();
  formError.textContent = "";
  void controller.start(config).catch((error: unknown) => {
    formError.textContent =
      error instanceof Error ? error.message : "Nie udało się uruchomić przebiegu.";
  });
});

populationInput.addEventListener("input", () => {
  const population = Number(populationInput.value);
  elitesInput.max = String(Math.max(0, population - 1));
  if (Number(elitesInput.value) >= population) {
    elitesInput.value = String(Math.max(0, population - 1));
  }
});

for (const input of [mutationRateInput, mutationStrengthInput]) {
  input.addEventListener("input", updateRangeOutputs);
}

randomSeedButton.addEventListener("click", () => {
  seedInput.value = `evolab-${crypto.getRandomValues(new Uint32Array(1))[0]?.toString(36) ?? "nowy"}`;
  seedInput.focus();
  seedInput.select();
});

pauseButton.addEventListener("click", togglePause);
stopButton.addEventListener("click", () => {
  replay.cancel();
  controller.stop();
});
replayButton.addEventListener("click", toggleReplay);

for (const button of modeButtons) {
  button.addEventListener("click", () => {
    const mode = button.dataset.mode;
    if (isRunMode(mode)) {
      controller.setMode(mode);
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (isEditing(event.target)) {
    return;
  }
  if (event.code === "Space") {
    event.preventDefault();
    togglePause();
  } else if (event.key.toLowerCase() === "r") {
    toggleReplay();
  } else if (event.key === "1") {
    controller.setMode("normal");
  } else if (event.key === "2") {
    controller.setMode("fast");
  } else if (event.key === "3") {
    controller.setMode("headless");
  }
});

updateRangeOutputs();
chart.render([]);

function updateInterface(state: RunViewState): void {
  const active =
    state.status === "running" ||
    state.status === "paused" ||
    state.status === "replay";
  configFields.disabled = active;
  randomSeedButton.disabled = active;
  startButton.disabled = active;
  startButton.querySelector("span")!.textContent =
    state.status === "stopped" || state.status === "error"
      ? "Uruchom nowy przebieg"
      : "Uruchom przebieg";

  status.dataset.status = state.status;
  statusText.textContent = statusLabel(state);
  runMessage.textContent = state.message;
  pauseButton.disabled =
    state.status === "idle" ||
    state.status === "stopped" ||
    state.status === "error" ||
    state.status === "replay";
  pauseButton.textContent = state.status === "paused" ? "Wznów" : "Pauza";
  stopButton.disabled = state.status === "idle" || state.status === "stopped";
  replayButton.disabled = state.bestRecord === null || state.status === "error";
  replayButton.textContent =
    state.status === "replay" ? "Zakończ replay" : "Replay rekordu";

  for (const button of modeButtons) {
    const isActive = button.dataset.mode === state.mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }

  candidateId.textContent =
    state.status === "replay"
      ? `Replay · ${state.bestRecord?.result.genome.id ?? "rekord"}`
      : state.currentGenome?.id ?? "Jeszcze bez pojazdu";
  candidateProgress.textContent =
    state.populationSize > 0
      ? `${Math.max(1, state.candidateIndex)} / ${state.populationSize}`
      : "— / —";
  currentDistance.textContent = formatDistance(state.currentDistance);
  generationValue.textContent = state.generation > 0 ? String(state.generation) : "—";
  remainingValue.textContent =
    state.populationSize > 0
      ? `${state.remainingTrials} prób pozostało`
      : "brak przebiegu";
  overallBestValue.textContent = formatDistance(state.overallBest);
  generationBestValue.textContent = formatDistance(state.generationBest);
  generationAverageValue.textContent = formatDistance(state.generationAverage);
  recordGenome.textContent =
    state.bestRecord === null
      ? "czeka na pojazd"
      : `${state.bestRecord.result.genome.id} · G${state.bestRecord.generation}`;

  const headlessVisible = state.mode === "headless" && state.status === "running";
  headlessOverlay.hidden = !headlessVisible;
  if (headlessVisible && !headlessWasVisible) {
    renderer.renderIdle();
  }
  headlessWasVisible = headlessVisible;

  if (
    state.status !== "replay" &&
    !headlessVisible &&
    state.terrain !== null &&
    state.currentGenome !== null &&
    state.currentSnapshot !== null
  ) {
    renderer.render({
      terrain: state.terrain,
      genome: state.currentGenome,
      snapshot: state.currentSnapshot
    });
  }

  canvas.setAttribute(
    "aria-label",
    state.currentGenome === null
      ? "Pusta trasa. Uruchom przebieg, aby zobaczyć pojazd."
      : `${statusLabel(state)}. Pojazd ${state.currentGenome.id}, dystans ${formatDistance(
          state.currentDistance
        )}, pokolenie ${state.generation}.`
  );

  const historySignature = `${state.history.length}:${state.history.at(-1)?.generation ?? 0}`;
  if (historySignature !== renderedHistorySignature) {
    renderedHistorySignature = historySignature;
    chart.render(state.history);
  }

  const showSummary = state.status === "stopped" && state.manifest !== null;
  runSummary.hidden = !showSummary;
  if (showSummary) {
    summaryResult.textContent = `${formatDistance(state.overallBest)} · ${state.completedGenerations} pokoleń`;
    summaryDetail.textContent = `seed ${state.manifest?.config.seed ?? "—"}`;
  }
}

function togglePause(): void {
  if (currentState.status === "paused") {
    controller.resume();
  } else if (currentState.status === "running") {
    controller.pause();
  }
}

function toggleReplay(): void {
  if (currentState.status === "replay") {
    replay.cancel();
    controller.exitReplay();
    return;
  }

  const best = controller.enterReplay();
  const terrain = currentState.terrain;
  if (best === null || terrain === null) {
    return;
  }

  replay.play(
    best.result.trace,
    (frame) => {
      renderer.render({
        terrain,
        genome: best.result.genome,
        snapshot: frame,
        replay: true
      });
      currentDistance.textContent = formatDistance(frame.distance);
    },
    () => controller.exitReplay()
  );
}

function readConfig(): RunConfig {
  return {
    seed: seedInput.value.trim(),
    populationSize: Number(populationInput.value),
    mutationRate: Number(mutationRateInput.value) / 100,
    mutationStrength: Number(mutationStrengthInput.value) / 100,
    eliteCount: Number(elitesInput.value)
  };
}

function updateRangeOutputs(): void {
  mutationRateOutput.value = `${mutationRateInput.value}%`;
  mutationStrengthOutput.value = `${mutationStrengthInput.value}%`;
}

function statusLabel(state: RunViewState): string {
  switch (state.status) {
    case "idle":
      return "Gotowy";
    case "running":
      return state.mode === "headless" ? "Liczenie bez obrazu" : "Przebieg aktywny";
    case "paused":
      return "Pauza";
    case "replay":
      return "Replay rekordu";
    case "stopped":
      return "Zatrzymany";
    case "error":
      return "Błąd";
  }
}

function formatDistance(value: number): string {
  return `${value.toLocaleString("pl-PL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })} m`;
}

function isRunMode(value: string | undefined): value is RunMode {
  return value === "normal" || value === "fast" || value === "headless";
}

function isEditing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`Brak elementu interfejsu: ${selector}`);
  }
  return element;
}
