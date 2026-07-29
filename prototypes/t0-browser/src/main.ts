import "./styles.css";
import { PlanckAdapter, RapierAdapter } from "./adapters";
import {
  DEFAULT_CONFIG,
  vehicleShape,
  type AdapterId,
  type Genome,
  type RunConfig,
  type RunMode,
  type Terrain,
  type TrialSnapshot
} from "./domain";
import {
  LiveRunController,
  benchmarkAdapter,
  type AdapterBenchmark,
  type LiveState
} from "./runner";

declare global {
  interface Window {
    __evolutionLabT0: {
      ready: boolean;
      runBenchmark: () => Promise<AdapterBenchmark[]>;
      getBenchmarkResults: () => AdapterBenchmark[];
      getLiveState: () => LiveState;
    };
  }
}

const adapters = {
  rapier: new RapierAdapter(),
  planck: new PlanckAdapter()
};

const app = document.querySelector<HTMLElement>("#app");
if (app === null) {
  throw new Error("Brak elementu #app.");
}

app.innerHTML = `
  <header class="page-header">
    <div>
      <p class="eyebrow">PROTOTYP WYRZUCALNY · T0</p>
      <h1>Evolution Lab</h1>
      <p>Ten ekran porównuje dwa adaptery. Nie jest projektem finalnego interfejsu.</p>
    </div>
    <div class="status-chip" id="status-chip" role="status" aria-live="polite">Gotowy</div>
  </header>

  <section class="layout">
    <aside class="panel controls" aria-labelledby="settings-title">
      <h2 id="settings-title">Konfiguracja przebiegu</h2>
      <label>
        Adapter fizyki
        <select id="adapter">
          <option value="rapier">Rapier2D 0.19.3</option>
          <option value="planck">Planck.js 1.5.0</option>
        </select>
      </label>
      <label>
        Seed
        <input id="seed" value="${DEFAULT_CONFIG.seed}" />
      </label>
      <label>
        Populacja
        <input id="population" type="number" min="4" max="30" value="${DEFAULT_CONFIG.populationSize}" />
      </label>
      <label>
        Częstość mutacji
        <input id="mutation-rate" type="number" min="0" max="1" step="0.05" value="${DEFAULT_CONFIG.mutationRate}" />
      </label>
      <label>
        Siła mutacji
        <input id="mutation-strength" type="number" min="0" max="1" step="0.05" value="${DEFAULT_CONFIG.mutationStrength}" />
      </label>
      <label>
        Liczba elit
        <input id="elite-count" type="number" min="1" max="4" value="${DEFAULT_CONFIG.eliteCount}" />
      </label>
      <label>
        Tempo
        <select id="mode">
          <option value="normal">Normalne</option>
          <option value="fast">Szybkie</option>
          <option value="headless">Bez renderowania</option>
        </select>
      </label>
      <div class="button-grid">
        <button id="start" class="primary">Start</button>
        <button id="pause">Pauza</button>
        <button id="resume">Wznów</button>
        <button id="stop" class="danger">Stop</button>
      </div>
      <button id="benchmark" class="benchmark">Uruchom porównanie T0</button>
      <button id="replay" disabled>Replay najlepszego z T0</button>
    </aside>

    <section class="stage-panel" aria-labelledby="stage-title">
      <div class="stage-heading">
        <div>
          <p class="eyebrow">BIEŻĄCA PRÓBA</p>
          <h2 id="stage-title">Obserwacja</h2>
        </div>
        <p id="render-state">Renderowanie włączone</p>
      </div>
      <canvas id="stage" width="960" height="480" aria-label="Symulacja pojazdu na terenie"></canvas>
      <dl class="metrics" id="metrics">
        <div><dt>Stan</dt><dd id="metric-status">idle</dd></div>
        <div><dt>Pokolenie</dt><dd id="metric-generation">0</dd></div>
        <div><dt>Pojazd</dt><dd id="metric-candidate">0 / 0</dd></div>
        <div><dt>Żywe</dt><dd id="metric-alive">0</dd></div>
        <div><dt>Dystans</dt><dd id="metric-distance">0,00 m</dd></div>
        <div><dt>Najlepszy</dt><dd id="metric-best">0,00 m</dd></div>
        <div><dt>Średnia</dt><dd id="metric-average">0,00 m</dd></div>
        <div><dt>Tryb</dt><dd id="metric-mode">normal</dd></div>
      </dl>
    </section>
  </section>

  <section class="panel results-panel" aria-labelledby="results-title">
    <div class="results-heading">
      <div>
        <p class="eyebrow">POMIAR PORÓWNAWCZY</p>
        <h2 id="results-title">Wynik T0</h2>
      </div>
      <p id="benchmark-status" data-status="idle">Nie uruchomiono</p>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Adapter</th>
            <th scope="col">Kroki/s</th>
            <th scope="col">Headless</th>
            <th scope="col">Render</th>
            <th scope="col">Powtórzenie</th>
            <th scope="col">Render = wynik</th>
            <th scope="col">Invalid</th>
            <th scope="col">Najlepszy dystans</th>
          </tr>
        </thead>
        <tbody id="benchmark-body">
          <tr><td colspan="8">Uruchom test, aby zebrać pomiary w tej przeglądarce.</td></tr>
        </tbody>
      </table>
    </div>
    <p class="footnote">
      Hash jest porównywany tylko między powtórzeniami tego samego adaptera.
      Różne silniki nie mają dawać identycznej trajektorii.
    </p>
  </section>
`;

const canvas = requiredElement<HTMLCanvasElement>("#stage");
const canvasContext = canvas.getContext("2d");
if (canvasContext === null) {
  throw new Error("Canvas 2D jest niedostępny.");
}
const context = canvasContext;

let latestBenchmarkResults: AdapterBenchmark[] = [];
let replayCancelled = false;

const controller = new LiveRunController(renderLiveState);

requiredElement<HTMLButtonElement>("#start").addEventListener("click", () => {
  replayCancelled = true;
  controller.stop();
  const config = readConfig();
  const adapter = adapters[config.adapterId];
  void controller.start(adapter, config);
});

requiredElement<HTMLButtonElement>("#pause").addEventListener("click", () => {
  controller.pause();
});

requiredElement<HTMLButtonElement>("#resume").addEventListener("click", () => {
  controller.resume();
});

requiredElement<HTMLButtonElement>("#stop").addEventListener("click", () => {
  replayCancelled = true;
  controller.stop();
});

requiredElement<HTMLSelectElement>("#mode").addEventListener("change", (event) => {
  controller.setMode((event.currentTarget as HTMLSelectElement).value as RunMode);
});

requiredElement<HTMLButtonElement>("#benchmark").addEventListener("click", () => {
  void runComparison();
});

requiredElement<HTMLButtonElement>("#replay").addEventListener("click", () => {
  void replayBest();
});

async function runComparison(): Promise<AdapterBenchmark[]> {
  controller.stop();
  replayCancelled = true;
  const benchmarkButton = requiredElement<HTMLButtonElement>("#benchmark");
  const replayButton = requiredElement<HTMLButtonElement>("#replay");
  const status = requiredElement<HTMLElement>("#benchmark-status");
  benchmarkButton.disabled = true;
  replayButton.disabled = true;
  status.dataset.status = "running";
  status.textContent = "Pomiar Rapier2D…";

  const baseConfig = readConfig();
  const benchmarkConfig: RunConfig = {
    ...baseConfig,
    populationSize: Math.max(8, Math.min(12, baseConfig.populationSize)),
    eliteCount: 1,
    maxSteps: 900,
    stagnationSteps: 180,
    traceEvery: 6
  };

  try {
    const rapier = await benchmarkAdapter(
      adapters.rapier,
      { ...benchmarkConfig, adapterId: "rapier" },
      3,
      drawScene
    );
    status.textContent = "Pomiar Planck.js…";
    await yieldToBrowser();
    const planck = await benchmarkAdapter(
      adapters.planck,
      { ...benchmarkConfig, adapterId: "planck" },
      3,
      drawScene
    );
    latestBenchmarkResults = [rapier, planck];
    renderBenchmarkTable(latestBenchmarkResults);
    status.dataset.status = "done";
    status.textContent = "Pomiar zakończony";
    replayButton.disabled = false;
    return latestBenchmarkResults;
  } catch (error) {
    status.dataset.status = "error";
    status.textContent = error instanceof Error ? error.message : "Błąd pomiaru";
    throw error;
  } finally {
    benchmarkButton.disabled = false;
  }
}

function renderLiveState(state: LiveState): void {
  text("#status-chip", state.message);
  text("#metric-status", state.status);
  text("#metric-generation", String(state.generation));
  text("#metric-candidate", `${state.candidate} / ${state.populationSize}`);
  text("#metric-alive", String(state.alive));
  text("#metric-distance", formatDistance(state.currentDistance));
  text("#metric-best", formatDistance(state.bestDistance));
  text("#metric-average", formatDistance(state.averageDistance));
  text("#metric-mode", state.mode);
  text(
    "#render-state",
    state.mode === "headless" ? "Renderowanie wyłączone" : "Renderowanie włączone"
  );

  if (
    state.mode !== "headless" &&
    state.snapshot !== null &&
    state.terrain !== null &&
    state.genome !== null
  ) {
    drawScene(state.snapshot, state.terrain, state.genome);
  } else if (state.mode === "headless") {
    drawHeadlessFrame();
  }
}

function renderBenchmarkTable(results: AdapterBenchmark[]): void {
  const body = requiredElement<HTMLTableSectionElement>("#benchmark-body");
  body.innerHTML = results
    .map(
      (result) => `
        <tr>
          <th scope="row">${result.adapterLabel}</th>
          <td>${Math.round(result.stepsPerSecond).toLocaleString("pl-PL")}</td>
          <td>${result.headlessMs.toFixed(1)} ms</td>
          <td>${result.renderedMs.toFixed(1)} ms</td>
          <td class="${result.repeatable ? "pass" : "fail"}">${result.repeatable ? "PASS" : "FAIL"}</td>
          <td class="${result.renderInvariant ? "pass" : "fail"}">${result.renderInvariant ? "PASS" : "FAIL"}</td>
          <td class="${result.invalidStates === 0 ? "pass" : "fail"}">${result.invalidStates}</td>
          <td>${formatDistance(result.bestDistance)}</td>
        </tr>
      `
    )
    .join("");
}

async function replayBest(): Promise<void> {
  if (latestBenchmarkResults.length === 0) {
    return;
  }
  controller.stop();
  replayCancelled = false;
  const selectedAdapter = requiredElement<HTMLSelectElement>("#adapter").value as AdapterId;
  const selected =
    latestBenchmarkResults.find((result) => result.adapterId === selectedAdapter) ??
    latestBenchmarkResults[0];
  text("#status-chip", `Replay: ${selected.adapterLabel}`);

  for (const frame of selected.bestTrace) {
    if (replayCancelled) {
      return;
    }
    drawScene(frame, selected.terrain, selected.bestGenome);
    await nextAnimationFrame();
  }
  text("#status-chip", `Replay zakończony: ${selected.adapterLabel}`);
}

function readConfig(): RunConfig {
  const populationSize = integerValue("#population");
  const eliteCount = Math.min(integerValue("#elite-count"), populationSize - 1);
  return {
    ...DEFAULT_CONFIG,
    adapterId: requiredElement<HTMLSelectElement>("#adapter").value as AdapterId,
    seed: requiredElement<HTMLInputElement>("#seed").value.trim() || DEFAULT_CONFIG.seed,
    populationSize,
    mutationRate: numberValue("#mutation-rate"),
    mutationStrength: numberValue("#mutation-strength"),
    eliteCount
  };
}

function drawScene(snapshot: TrialSnapshot, terrain: Terrain, genome: Genome): void {
  const width = canvas.width;
  const height = canvas.height;
  const scale = 28;
  const cameraX = snapshot.chassis.x;
  const cameraY = Math.max(0, snapshot.chassis.y - 2.5);
  const screen = (x: number, y: number) => ({
    x: width * 0.34 + (x - cameraX) * scale,
    y: height * 0.72 - (y - cameraY) * scale
  });

  context.clearRect(0, 0, width, height);
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#15283b");
  gradient.addColorStop(1, "#0b1118");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.beginPath();
  terrain.points.forEach((point, index) => {
    const translated = screen(point.x, point.y);
    if (index === 0) {
      context.moveTo(translated.x, translated.y);
    } else {
      context.lineTo(translated.x, translated.y);
    }
  });
  const lastTerrain = screen(terrain.points.at(-1)?.x ?? 0, -20);
  const firstTerrain = screen(terrain.points[0]?.x ?? 0, -20);
  context.lineTo(lastTerrain.x, lastTerrain.y);
  context.lineTo(firstTerrain.x, firstTerrain.y);
  context.closePath();
  context.fillStyle = "#243a32";
  context.fill();
  context.strokeStyle = "#81a98c";
  context.lineWidth = 4;
  context.stroke();

  const shape = vehicleShape(genome);
  context.beginPath();
  shape.vertices.forEach((vertex, index) => {
    const rotated = rotate(vertex.x, vertex.y, snapshot.chassis.angle);
    const translated = screen(
      snapshot.chassis.x + rotated.x,
      snapshot.chassis.y + rotated.y
    );
    if (index === 0) {
      context.moveTo(translated.x, translated.y);
    } else {
      context.lineTo(translated.x, translated.y);
    }
  });
  context.closePath();
  context.fillStyle = "#e7b34b";
  context.strokeStyle = "#fff3c4";
  context.lineWidth = 3;
  context.fill();
  context.stroke();

  drawWheel(snapshot.wheels[0], genome.rearWheelRadius, screen, scale);
  drawWheel(snapshot.wheels[1], genome.frontWheelRadius, screen, scale);

  context.fillStyle = "rgba(255,255,255,0.8)";
  context.font = "20px system-ui";
  context.fillText(`${Math.max(0, snapshot.chassis.x).toFixed(1)} m`, 24, 36);
}

function drawWheel(
  pose: { x: number; y: number; angle: number },
  radius: number,
  screen: (x: number, y: number) => { x: number; y: number },
  scale: number
): void {
  const center = screen(pose.x, pose.y);
  const pixelRadius = radius * scale;
  context.beginPath();
  context.arc(center.x, center.y, pixelRadius, 0, Math.PI * 2);
  context.fillStyle = "#111820";
  context.strokeStyle = "#d7e1e8";
  context.lineWidth = 3;
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(center.x, center.y);
  context.lineTo(
    center.x + Math.cos(pose.angle) * pixelRadius,
    center.y - Math.sin(pose.angle) * pixelRadius
  );
  context.strokeStyle = "#d7e1e8";
  context.lineWidth = 2;
  context.stroke();
}

function drawHeadlessFrame(): void {
  context.fillStyle = "#0b1118";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#8ea0ad";
  context.font = "28px system-ui";
  context.textAlign = "center";
  context.fillText("Tryb bez renderowania", canvas.width / 2, canvas.height / 2);
  context.textAlign = "start";
}

function rotate(x: number, y: number, angle: number): { x: number; y: number } {
  return {
    x: x * Math.cos(angle) - y * Math.sin(angle),
    y: x * Math.sin(angle) + y * Math.cos(angle)
  };
}

function requiredElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (element === null) {
    throw new Error(`Brak elementu ${selector}.`);
  }
  return element;
}

function text(selector: string, value: string): void {
  requiredElement<HTMLElement>(selector).textContent = value;
}

function numberValue(selector: string): number {
  return Number(requiredElement<HTMLInputElement>(selector).value);
}

function integerValue(selector: string): number {
  return Math.round(numberValue(selector));
}

function formatDistance(distance: number): string {
  return `${distance.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} m`;
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

window.__evolutionLabT0 = {
  ready: true,
  runBenchmark: runComparison,
  getBenchmarkResults: () => latestBenchmarkResults,
  getLiveState: () => controller.getState()
};

drawHeadlessFrame();
