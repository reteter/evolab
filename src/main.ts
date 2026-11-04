import "./styles.css";
import {
  BODY_GENE_RANGES,
  DEFAULT_RUN_CONFIG,
  getWheelSlotGeneRanges,
  validateRunConfig
} from "./domain/evolution";
import type {
  Genome,
  RunConfig,
  RunMode,
  TerrainProfile,
  TrainingMode,
  WheelCountMode
} from "./domain/types";
import { CanvasRenderer } from "./presentation/canvas-renderer";
import { ReplayPlayer } from "./presentation/replay-player";
import { TrendChart } from "./presentation/trend-chart";
import { ComparisonView } from "./presentation/comparison-view";
import { RunController, type RunViewState } from "./run/run-controller";
import { WorkerPoolSimulationExecutor } from "./simulation/worker-pool-simulation-executor";
import {
  IndexedDbStorage,
  type RunCheckpoint,
  type SavedRun
} from "./storage/indexed-db";
import { exportRunToJson, importRunFromJson } from "./storage/export-import";

const form = required<HTMLFormElement>("#run-form");
const configFields = required<HTMLFieldSetElement>("#config-fields");
const trainingModeSelect = required<HTMLSelectElement>("#training-mode");
const seedInput = required<HTMLInputElement>("#seed");
const wheelCountModeSelect = required<HTMLSelectElement>("#wheel-count-mode");
const terrainProfileSelect = required<HTMLSelectElement>("#terrain-profile");
const terrainProfileHint = required<HTMLElement>("#terrain-profile-hint");
const difficultyInput = required<HTMLInputElement>("#difficulty");
const difficultyOutput = required<HTMLOutputElement>("#difficulty-output");
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
const replayTrackSelect = required<HTMLSelectElement>("#replay-track-select");
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
const distanceLabel = required<HTMLElement>("#distance-label");
const generationValue = required<HTMLElement>("#generation-value");
const remainingValue = required<HTMLElement>("#remaining-value");
const overallBestValue = required<HTMLElement>("#overall-best-value");
const generationBestValue = required<HTMLElement>("#generation-best-value");
const generationAverageValue = required<HTMLElement>(
  "#generation-average-value"
);
const recordGenome = required<HTMLElement>("#record-genome");
const recordTrackDetails = required<HTMLElement>("#record-track-details");
const headlessOverlay = required<HTMLElement>("#headless-overlay");
const runSummary = required<HTMLElement>("#run-summary");
const summaryResult = required<HTMLElement>("#summary-result");
const summaryDetail = required<HTMLElement>("#summary-detail");
const canvas = required<HTMLCanvasElement>("#simulation-canvas");
const genomeDetailsSummary = required<HTMLElement>("#genome-details-summary");
const genomeValues = required<HTMLElement>("#genome-values");
const saveStatusText = required<HTMLElement>("#save-status-text");
const resumeLastRunButton = required<HTMLButtonElement>("#resume-last-run");
const savedRunsGrid = required<HTMLElement>("#saved-runs-grid");
const importFileInput = required<HTMLInputElement>("#import-file-input");
const importRunBtn = required<HTMLButtonElement>("#import-run-btn");
const compareBtn = required<HTMLButtonElement>("#compare-btn");
const comparisonSection = required<HTMLElement>("#comparison-section");
const closeComparisonBtn = required<HTMLButtonElement>("#close-comparison-btn");

const storage = new IndexedDbStorage();
const renderer = new CanvasRenderer(canvas);
const chart = new TrendChart(
  required<SVGSVGElement>("#trend-chart"),
  required<HTMLTableSectionElement>("#trend-table-body"),
  required<HTMLElement>("#chart-description")
);
const comparisonView = new ComparisonView(
  comparisonSection,
  required<SVGSVGElement>("#comparison-chart"),
  required<HTMLTableSectionElement>("#comparison-table-body"),
  required<HTMLElement>("#comparison-description"),
  required<HTMLElement>("#comparison-legend")
);

const replay = new ReplayPlayer();
const controller = new RunController(new WorkerPoolSimulationExecutor());

let currentState = controller.getState();
let renderedHistorySignature = "";
let headlessWasVisible = false;
let inspectedGenome: Genome | null = null;
let savedRunsCache: SavedRun[] = [];
let selectedRunIdsForComparison = new Set<string>();
let rememberedSingleProfile: TerrainProfile = "smooth";
let activeRunName: string | null = null;
const deletedRunIds = new Set<string>();

const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
renderer.setReducedMotion(motionPreference.matches);
motionPreference.addEventListener("change", ({ matches }) => {
  renderer.setReducedMotion(matches);
});

controller.setCheckpointHandler(async (runId: string, checkpoint: RunCheckpoint) => {
  if (deletedRunIds.has(runId)) {
    return;
  }
  saveStatusText.textContent = "Zapisywanie…";
  try {
    let run = await storage.getRun(runId);
    if (deletedRunIds.has(runId)) {
      return;
    }
    if (!run) {
      const now = Date.now();
      const defaultName = activeRunName ?? formatDateName(new Date(now));
      run = {
        id: runId,
        name: defaultName,
        createdAt: now,
        updatedAt: now,
        checkpoint
      };
    } else {
      run.updatedAt = Date.now();
      run.checkpoint = checkpoint;
    }
    await storage.saveRun(run);
    await storage.setLastActiveRunId(runId);
    if (checkpoint.completedGenerations === 0) {
      saveStatusText.textContent = "Zapisano stan początkowy";
    } else {
      saveStatusText.textContent = `Zapisano po pokoleniu ${checkpoint.completedGenerations}`;
    }
    await refreshSavedRunsList();
  } catch (err) {
    console.error("Save error:", err);
    saveStatusText.textContent = "Nie udało się zapisać przebiegu";
  }
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
  activeRunName = formatDateName(new Date());
  void controller.start(config).catch((error: unknown) => {
    formError.textContent =
      error instanceof Error ? error.message : "Nie udało się uruchomić przebiegu.";
  });
});

resumeLastRunButton.addEventListener("click", async () => {
  const lastActiveId = await storage.getLastActiveRunId();
  if (!lastActiveId) {
    return;
  }
  const run = await storage.getRun(lastActiveId);
  if (!run) {
    return;
  }
  await resumeRun(run);
});

importRunBtn.addEventListener("click", () => {
  importFileInput.value = "";
  importFileInput.click();
});

importFileInput.addEventListener("change", async () => {
  const file = importFileInput.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const importedRun = importRunFromJson(text);
    await storage.saveRun(importedRun);
    await refreshSavedRunsList();
    alert(`Pomyślnie zaimportowano przebieg: ${importedRun.name}`);
  } catch (err) {
    alert(err instanceof Error ? err.message : "Nie udało się zaimportować pliku.");
  }
});

compareBtn.addEventListener("click", () => {
  const runsToCompare = savedRunsCache.filter((r) =>
    selectedRunIdsForComparison.has(r.id)
  );
  if (runsToCompare.length >= 2) {
    comparisonView.render(runsToCompare);
    comparisonSection.scrollIntoView({ behavior: "smooth" });
  }
});

closeComparisonBtn.addEventListener("click", () => {
  comparisonSection.hidden = true;
});

populationInput.addEventListener("input", () => {
  const population = Number(populationInput.value);
  elitesInput.max = String(Math.max(0, population - 1));
  if (Number(elitesInput.value) >= population) {
    elitesInput.value = String(Math.max(0, population - 1));
  }
});

trainingModeSelect.addEventListener("change", handleTrainingModeChange);

function handleTrainingModeChange(): void {
  const isTriple = trainingModeSelect.value === "triple";
  if (isTriple) {
    if (terrainProfileSelect.value) {
      rememberedSingleProfile = terrainProfileSelect.value as TerrainProfile;
    }
    terrainProfileSelect.disabled = true;
    terrainProfileHint.textContent = "Stały zestaw: Łagodny, Strome wzgórza, Wyboisty";
  } else {
    terrainProfileSelect.disabled = false;
    terrainProfileSelect.value = rememberedSingleProfile;
    terrainProfileHint.textContent = "charakter trasy dla wszystkich pokoleń";
  }
}

for (const input of [mutationRateInput, mutationStrengthInput, difficultyInput]) {
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
void initStorageAndUi();

async function initStorageAndUi(): Promise<void> {
  await refreshSavedRunsList();
  const lastActiveId = await storage.getLastActiveRunId();
  if (lastActiveId) {
    const run = await storage.getRun(lastActiveId);
    if (run) {
      resumeLastRunButton.disabled = false;
      resumeLastRunButton.textContent = `Wznów ostatni (${run.name})`;
    }
  }
}

async function refreshSavedRunsList(): Promise<void> {
  savedRunsCache = await storage.listRuns();
  const lastActiveId = await storage.getLastActiveRunId();
  resumeLastRunButton.disabled = !lastActiveId || !savedRunsCache.some((r) => r.id === lastActiveId);
  if (lastActiveId) {
    const lastRun = savedRunsCache.find((r) => r.id === lastActiveId);
    if (lastRun) {
      resumeLastRunButton.textContent = `Wznów ostatni (${lastRun.name})`;
    }
  }

  for (const id of Array.from(selectedRunIdsForComparison)) {
    if (!savedRunsCache.some((r) => r.id === id)) {
      selectedRunIdsForComparison.delete(id);
    }
  }

  renderSavedRunsGrid();
  updateCompareButton();
}

function renderSavedRunsGrid(): void {
  savedRunsGrid.replaceChildren();

  if (savedRunsCache.length === 0) {
    const emptyP = document.createElement("p");
    emptyP.className = "saved-runs-empty";
    emptyP.textContent = "Brak zapisanych przebiegów w IndexedDB.";
    savedRunsGrid.append(emptyP);
    return;
  }

  const firstSelectedRun = savedRunsCache.find((r) =>
    selectedRunIdsForComparison.has(r.id)
  );

  for (const run of savedRunsCache) {
    const card = document.createElement("div");
    card.className = "run-card";

    const header = document.createElement("div");
    header.className = "run-card-header";

    const title = document.createElement("h3");
    title.className = "run-card-title";
    title.textContent = run.name;

    const selectLabel = document.createElement("label");
    selectLabel.className = "run-card-select";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedRunIdsForComparison.has(run.id);

    const isMatch =
      !firstSelectedRun ||
      (firstSelectedRun.checkpoint.config.seed === run.checkpoint.config.seed &&
        firstSelectedRun.checkpoint.config.difficulty === run.checkpoint.config.difficulty &&
        (firstSelectedRun.checkpoint.config.trainingMode ?? "single") === (run.checkpoint.config.trainingMode ?? "single") &&
        ((firstSelectedRun.checkpoint.config.trainingMode ?? "single") === "triple" ||
          firstSelectedRun.checkpoint.config.terrainProfile === run.checkpoint.config.terrainProfile));

    const maxReached =
      selectedRunIdsForComparison.size >= 3 &&
      !selectedRunIdsForComparison.has(run.id);

    if (!isMatch) {
      checkbox.disabled = true;
      selectLabel.title = "Inny seed lub teren";
    } else if (maxReached) {
      checkbox.disabled = true;
      selectLabel.title = "Maksymalnie 3 przebiegi";
    }

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedRunIdsForComparison.add(run.id);
      } else {
        selectedRunIdsForComparison.delete(run.id);
      }
      renderSavedRunsGrid();
      updateCompareButton();
    });

    const checkText = document.createElement("span");
    checkText.textContent = "Porównaj";
    if (!isMatch) {
      checkText.textContent = "Inny seed/teren";
    }

    selectLabel.append(checkbox, checkText);
    header.append(title, selectLabel);

    const dl = document.createElement("dl");
    dl.className = "run-card-meta";

    const profileLabels: Record<TerrainProfile, string> = {
      smooth: "Łagodny",
      "steep-hills": "Strome wzgórza",
      bumpy: "Wyboisty"
    };

    const wheelModeLabels: Record<WheelCountMode, string> = {
      "2": "Tylko 2 koła",
      "2-3": "2–3 koła",
      "2-4": "2–4 koła"
    };

    const isRunTriple = (run.checkpoint.config.trainingMode ?? "single") === "triple";

    const recordDisplay = run.checkpoint.bestRecord
      ? isRunTriple
        ? `${formatPoints(run.checkpoint.bestRecord.score ?? 0)} (G${run.checkpoint.bestRecord.generation})`
        : `${formatDistance(run.checkpoint.bestRecord.result.maxDistance)} (G${run.checkpoint.bestRecord.generation})`
      : "—";

    const metaItems: [string, string][] = [
      ["Tryb treningu", isRunTriple ? "Trzy trasy" : "Jedna trasa"],
      ["Seed", run.checkpoint.config.seed],
      ["Liczba kół", wheelModeLabels[run.checkpoint.config.wheelCountMode ?? "2"]],
      ["Profil terenu", isRunTriple ? "Łagodny, Wzgórza, Wyboisty" : profileLabels[run.checkpoint.config.terrainProfile]],
      ["Trudność", `${run.checkpoint.config.difficulty}/5`],
      ["Ukończone pokolenia", String(run.checkpoint.completedGenerations)],
      [
        "Rekord",
        recordDisplay
      ],
      ["Data zapisu", new Date(run.updatedAt).toLocaleTimeString("pl-PL")]
    ];

    for (const [key, val] of metaItems) {
      const dt = document.createElement("dt");
      dt.textContent = key;
      const dd = document.createElement("dd");
      dd.textContent = val;
      dl.append(dt, dd);
    }

    const actions = document.createElement("div");
    actions.className = "run-card-actions";

    const resumeBtn = document.createElement("button");
    resumeBtn.className = "button button-primary run-card-resume-btn";
    resumeBtn.type = "button";
    resumeBtn.textContent = "Wznów";
    const isRunning =
      currentState.status === "running" ||
      currentState.status === "paused" ||
      currentState.status === "replay";
    resumeBtn.disabled = isRunning;
    resumeBtn.addEventListener("click", () => resumeRun(run));

    const renameBtn = document.createElement("button");
    renameBtn.className = "button";
    renameBtn.type = "button";
    renameBtn.textContent = "Zmień nazwę";
    renameBtn.addEventListener("click", async () => {
      const newName = prompt("Podaj nową nazwę przebiegu:", run.name);
      if (newName && newName.trim()) {
        const trimmed = newName.trim();
        await storage.renameRun(run.id, trimmed);
        if (activeRunName && run.id === currentState.runId) {
          activeRunName = trimmed;
        }
        await refreshSavedRunsList();
      }
    });

    const forkBtn = document.createElement("button");
    forkBtn.className = "button run-card-fork-btn";
    forkBtn.type = "button";
    forkBtn.textContent = "Nowy z tymi ustawieniami";
    forkBtn.disabled = isRunning;
    forkBtn.addEventListener("click", () => {
      populateFormConfig(run.checkpoint.config);
      form.scrollIntoView({ behavior: "smooth" });
    });

    const exportBtn = document.createElement("button");
    exportBtn.className = "button";
    exportBtn.type = "button";
    exportBtn.textContent = "Eksportuj";
    exportBtn.addEventListener("click", () => {
      const json = exportRunToJson(run);
      downloadJson(json, `${run.name.replace(/\s+/g, "_")}.json`);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "button button-danger";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Usuń";
    deleteBtn.addEventListener("click", async () => {
      if (confirm(`Czy na pewno chcesz usunąć zapis "${run.name}"?`)) {
        deletedRunIds.add(run.id);
        await storage.deleteRun(run.id);
        selectedRunIdsForComparison.delete(run.id);
        await refreshSavedRunsList();
      }
    });

    actions.append(resumeBtn, renameBtn, forkBtn, exportBtn, deleteBtn);

    card.append(header, dl, actions);
    savedRunsGrid.append(card);
  }
}

function updateCompareButton(): void {
  const count = selectedRunIdsForComparison.size;
  compareBtn.textContent = `Porównaj (${count})`;
  compareBtn.disabled = count < 2;
}

async function resumeRun(run: SavedRun): Promise<void> {
  const isRunning =
    currentState.status === "running" ||
    currentState.status === "paused" ||
    currentState.status === "replay";
  if (isRunning) {
    return;
  }

  replay.cancel();
  formError.textContent = "";
  populateFormConfig(run.checkpoint.config);
  activeRunName = run.name;

  try {
    saveStatusText.textContent = `Zapisano po pokoleniu ${run.checkpoint.completedGenerations}`;
    await storage.setLastActiveRunId(run.id);
    await controller.resumeCheckpoint(run.id, run.checkpoint);
  } catch (error) {
    formError.textContent =
      error instanceof Error ? error.message : "Nie udało się wznowić przebiegu.";
  }
}

function populateFormConfig(config: RunConfig): void {
  trainingModeSelect.value = config.trainingMode ?? "single";
  seedInput.value = config.seed;
  wheelCountModeSelect.value = config.wheelCountMode ?? "2-4";
  rememberedSingleProfile = config.terrainProfile;
  terrainProfileSelect.value = config.terrainProfile;
  difficultyInput.value = String(config.difficulty);
  populationInput.value = String(config.populationSize);
  elitesInput.max = String(config.populationSize - 1);
  elitesInput.value = String(config.eliteCount);
  mutationRateInput.value = String(Math.round(config.mutationRate * 100));
  mutationStrengthInput.value = String(Math.round(config.mutationStrength * 100));
  handleTrainingModeChange();
  updateRangeOutputs();
}

function formatDateName(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `Przebieg ${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function downloadJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function updateInterface(state: RunViewState): void {
  const active =
    state.status === "running" ||
    state.status === "paused" ||
    state.status === "replay";
  configFields.disabled = active;
  randomSeedButton.disabled = active;
  startButton.disabled = active;
  resumeLastRunButton.disabled = active || !savedRunsCache.length;
  startButton.querySelector("span")!.textContent =
    state.status === "stopped" || state.status === "error"
      ? "Uruchom nowy przebieg"
      : "Uruchom przebieg";
  randomSeedButton.disabled = active;
  startButton.disabled = active;
  startButton.querySelector("span")!.textContent =
    state.status === "stopped" || state.status === "error"
      ? "Uruchom nowy przebieg"
      : "Uruchom przebieg";

  const cardResumeButtons = savedRunsGrid.querySelectorAll<HTMLButtonElement>(
    ".run-card-resume-btn"
  );
  for (const btn of cardResumeButtons) {
    btn.disabled = active;
  }
  const cardForkButtons = savedRunsGrid.querySelectorAll<HTMLButtonElement>(
    ".run-card-fork-btn"
  );
  for (const btn of cardForkButtons) {
    btn.disabled = active;
  }

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

  const isTriple = (state.manifest?.config.trainingMode ?? "single") === "triple";

  // Replay track select visibility and enablement
  replayTrackSelect.hidden = !isTriple;
  replayTrackSelect.disabled = active || state.bestRecord === null;

  candidateId.textContent =
    state.status === "replay"
      ? `Replay · ${state.bestRecord?.result.genome.id ?? "rekord"}`
      : state.currentGenome === null ? "Jeszcze bez pojazdu" : `Lider · ${state.currentGenome.id}`;
  candidateProgress.textContent =
    state.status === "replay"
      ? `Pokolenie ${state.bestRecord?.generation} · replay`
      : state.populationSize > 0
      ? isTriple
        ? `Trasa ${state.currentTrackIndex ?? 1}/3 (${profileLabelPl(state.currentTrackProfile ?? "smooth")}) · ${state.candidateIndex} / ${state.populationSize} ocenionych`
        : `${state.candidateIndex} / ${state.populationSize} ocenionych · ${state.activeTrials.length} na trasie`
      : "— / —";
  currentDistance.textContent = formatDistance(state.currentDistance);
  distanceLabel.textContent = state.status === "replay" ? "Dystans replay" : "Dystans lidera";
  generationValue.textContent = state.generation > 0 ? String(state.generation) : "—";
  remainingValue.textContent =
    state.populationSize > 0
      ? `${state.remainingTrials} prób pozostało`
      : "brak przebiegu";

  if (isTriple) {
    chart.setUnit("points");
    overallBestValue.textContent = state.bestRecord ? formatPoints(state.overallBest) : "—";
    generationBestValue.textContent = state.completedGenerations > 0 && state.generationBest > 0 ? formatPoints(state.generationBest) : "—";
    generationAverageValue.textContent = state.completedGenerations > 0 && state.generationAverage > 0 ? formatPoints(state.generationAverage) : "—";
  } else {
    chart.setUnit("meters");
    overallBestValue.textContent = formatDistance(state.overallBest);
    generationBestValue.textContent = formatDistance(state.generationBest);
    generationAverageValue.textContent = formatDistance(state.generationAverage);
  }

  recordGenome.textContent =
    state.bestRecord === null
      ? "czeka na pojazd"
      : `${state.bestRecord.result.genome.id} · G${state.bestRecord.generation}`;

  // Multi-track details under record
  if (isTriple && state.bestRecord?.trackResults && state.bestRecord.trackResults.length === 3) {
    recordTrackDetails.hidden = false;
    recordTrackDetails.replaceChildren(
      ...state.bestRecord.trackResults.map((t) => {
        const item = document.createElement("span");
        item.style.color = "var(--text-muted, #7e9a9c)";
        item.textContent = `${profileLabelPl(t.profile)}: ${formatDistance(t.result.maxDistance)} · ${t.progressPercent.toFixed(1).replace(".", ",")}%`;
        return item;
      })
    );
  } else {
    recordTrackDetails.hidden = true;
    recordTrackDetails.replaceChildren();
  }
  showGenome(state.status === "replay" ? state.bestRecord?.result.genome ?? null : state.currentGenome);

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
      snapshot: state.currentSnapshot,
      vehicles: state.activeTrials,
      groupKey: `${state.manifest?.config.seed}:${state.generation}`
    });
  }

  canvas.setAttribute(
    "aria-label",
    state.status === "replay"
      ? `Replay ${state.bestRecord?.result.genome.id}. Wynik próby ${formatDistance(state.overallBest)}.`
      : state.currentGenome === null
      ? "Pusta trasa. Uruchom przebieg, aby zobaczyć pojazd."
      : `${statusLabel(state)}. ${state.activeTrials.length} pojazdów na trasie. Lider ${state.currentGenome.id}, dystans ${formatDistance(
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
    const isSumTriple = (state.manifest?.config.trainingMode ?? "single") === "triple";
    const profileLabels: Record<TerrainProfile, string> = {
      smooth: "łagodny",
      "steep-hills": "strome wzgórza",
      bumpy: "wyboisty"
    };
    const prof = state.manifest?.config.terrainProfile ?? "smooth";
    const diff = state.manifest?.config.difficulty ?? 3;
    const scoreOrDist = isSumTriple ? formatPoints(state.overallBest) : formatDistance(state.overallBest);
    summaryResult.textContent = `${scoreOrDist} · ${state.completedGenerations} pokoleń`;
    summaryDetail.textContent = isSumTriple
      ? `seed ${state.manifest?.config.seed ?? "—"} · 3 trasy (trudność ${diff}/5)`
      : `seed ${state.manifest?.config.seed ?? "—"} · ${profileLabels[prof]} (trudność ${diff}/5)`;
  }
}

function showGenome(genome: Genome | null): void {
  if (genome === inspectedGenome) {
    return;
  }
  inspectedGenome = genome;
  if (genome === null) {
    genomeDetailsSummary.textContent = "Geny obserwowanego pojazdu";
    genomeValues.replaceChildren();
    return;
  }

  const activeWheels = Math.min(4, Math.max(2, genome.genes.wheelCount || 2));
  const activeRanges = [
    ...BODY_GENE_RANGES
  ];

  for (let slot = 0; slot < activeWheels; slot += 1) {
    activeRanges.push(...getWheelSlotGeneRanges(slot));
  }

  genomeDetailsSummary.textContent = `Geny obserwowanego pojazdu · ${activeWheels} koła (${activeRanges.length} cech)`;

  genomeValues.replaceChildren(
    ...activeRanges.map(({ key, label }) => {
      const row = document.createElement("div");
      const name = document.createElement("dt");
      const value = document.createElement("dd");
      name.textContent = label;
      const rawVal = genome.genes[key];
      value.textContent = typeof rawVal === "number" ? rawVal.toLocaleString("pl-PL", { maximumFractionDigits: 2 }) : "—";
      row.append(name, value);
      return row;
    })
  );
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

  const selectedProfile = replayTrackSelect.value as TerrainProfile;
  const replayData = controller.enterReplay(selectedProfile);
  if (replayData === null) {
    return;
  }

  const { bestRecord, trackSummary, terrain } = replayData;
  const trace = trackSummary ? trackSummary.result.trace : bestRecord.result.trace;
  const genome = trackSummary ? trackSummary.result.genome : bestRecord.result.genome;

  replay.play(
    trace,
    (frame) => {
      renderer.render({
        terrain,
        genome,
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
    trainingMode: trainingModeSelect.value as TrainingMode,
    seed: seedInput.value.trim(),
    populationSize: Number(populationInput.value),
    mutationRate: Number(mutationRateInput.value) / 100,
    mutationStrength: Number(mutationStrengthInput.value) / 100,
    eliteCount: Number(elitesInput.value),
    terrainProfile: (trainingModeSelect.value === "triple" ? rememberedSingleProfile : terrainProfileSelect.value) as TerrainProfile,
    difficulty: Number(difficultyInput.value),
    wheelCountMode: wheelCountModeSelect.value as WheelCountMode
  };
}

function updateRangeOutputs(): void {
  mutationRateOutput.value = `${mutationRateInput.value}%`;
  mutationStrengthOutput.value = `${mutationStrengthInput.value}%`;
  difficultyOutput.value = `Trudność: ${difficultyInput.value}/5`;
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

function formatPoints(value: number): string {
  return `${value.toLocaleString("pl-PL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })} pkt`;
}

function profileLabelPl(profile: TerrainProfile): string {
  switch (profile) {
    case "smooth":
      return "Łagodny";
    case "steep-hills":
      return "Strome wzgórza";
    case "bumpy":
      return "Wyboisty";
  }
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
