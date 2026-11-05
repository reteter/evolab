import type { SavedRun } from "../storage/indexed-db";
import type { GenerationSummary } from "../domain/types";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const WIDTH = 900;
const HEIGHT = 280;
const PADDING = { top: 24, right: 30, bottom: 40, left: 56 };

export const RUN_COLORS = [
  { stroke: "#365df5", label: "Przebieg 1", name: "Niebieski" }, // Blue
  { stroke: "#ff754d", label: "Przebieg 2", name: "Pomarańczowy" }, // Orange
  { stroke: "#1fa463", label: "Przebieg 3", name: "Zielony" } // Green
];

export class ComparisonView {
  constructor(
    private readonly container: HTMLElement,
    private readonly svg: SVGSVGElement,
    private readonly tableBody: HTMLTableSectionElement,
    private readonly description: HTMLElement,
    private readonly legend: HTMLElement
  ) {}

  render(runs: SavedRun[]): void {
    if (runs.length < 2) {
      this.container.hidden = true;
      return;
    }

    this.container.hidden = false;
    this.renderLegend(runs);
    this.renderTable(runs);
    this.renderChart(runs);
  }

  private renderLegend(runs: SavedRun[]): void {
    this.legend.replaceChildren(
      ...runs.map((run, idx) => {
        const item = document.createElement("span");
        const color = RUN_COLORS[idx % RUN_COLORS.length]!.stroke;
        item.style.display = "inline-flex";
        item.style.alignItems = "center";
        item.style.gap = "8px";
        item.style.marginRight = "16px";

        const solidBar = document.createElement("i");
        solidBar.style.width = "18px";
        solidBar.style.height = "3px";
        solidBar.style.borderRadius = "99px";
        solidBar.style.backgroundColor = color;
        solidBar.style.display = "inline-block";

        const dashedBar = document.createElement("i");
        dashedBar.style.width = "18px";
        dashedBar.style.height = "3px";
        dashedBar.style.borderTop = `2px dashed ${color}`;
        dashedBar.style.display = "inline-block";

        const label = document.createElement("span");
        label.textContent = `${run.name} (― rekord, ╌ średnia)`;

        item.append(solidBar, dashedBar, label);
        return item;
      })
    );
  }

  private renderTable(runs: SavedRun[]): void {
    this.tableBody.replaceChildren();

    const isTriple = (runs[0]?.checkpoint.config.trainingMode ?? "single") === "triple";

    const headers: { label: string; getValue: (run: SavedRun) => string }[] = [
      { label: "Nazwa", getValue: (r) => r.name },
      {
        label: "Tryb treningu",
        getValue: (r) =>
          (r.checkpoint.config.trainingMode ?? "single") === "triple"
            ? "Trzy trasy"
            : "Jedna trasa"
      },
      { label: "Seed", getValue: (r) => r.checkpoint.config.seed },
      {
        label: "Profil terenu",
        getValue: (r) =>
          (r.checkpoint.config.trainingMode ?? "single") === "triple"
            ? "Łagodny, Wzgórza, Wyboisty"
            : r.checkpoint.config.terrainProfile
      },
      { label: "Trudność", getValue: (r) => `${r.checkpoint.config.difficulty}/5` },
      { label: "Populacja", getValue: (r) => String(r.checkpoint.config.populationSize) },
      { label: "Elity", getValue: (r) => String(r.checkpoint.config.eliteCount) },
      {
        label: "Częstość mutacji",
        getValue: (r) => `${Math.round(r.checkpoint.config.mutationRate * 100)}%`
      },
      {
        label: "Siła mutacji",
        getValue: (r) => `${Math.round(r.checkpoint.config.mutationStrength * 100)}%`
      },
      {
        label: "Ukończone pokolenia",
        getValue: (r) => String(r.checkpoint.completedGenerations)
      },
      {
        label: "Rekord",
        getValue: (r) => {
          if (!r.checkpoint.bestRecord) return "—";
          const isRunTriple = (r.checkpoint.config.trainingMode ?? "single") === "triple";
          const val = isRunTriple
            ? formatPoints(r.checkpoint.bestRecord.score ?? 0)
            : formatDistance(r.checkpoint.bestRecord.result.maxDistance);
          return `${val} (G${r.checkpoint.bestRecord.generation})`;
        }
      }
    ];

    for (const rowDef of headers) {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = rowDef.label;
      tr.append(th);

      for (let i = 0; i < runs.length; i++) {
        const td = document.createElement("td");
        td.textContent = rowDef.getValue(runs[i]!);
        tr.append(td);
      }
      this.tableBody.append(tr);
    }
  }

  private renderChart(runs: SavedRun[]): void {
    this.svg.replaceChildren();

    const allHistories = runs.map((r) => r.checkpoint.history);
    const allPoints = allHistories.flat();

    if (allPoints.length === 0) {
      this.description.textContent = "Brak ukończonych pokoleń w porównywanych przebiegach.";
      const text = createSvg("text", {
        x: WIDTH / 2,
        y: HEIGHT / 2,
        class: "chart-empty",
        "text-anchor": "middle"
      });
      text.textContent = "Brak danych do wykresu";
      this.svg.append(text);
      return;
    }

    const maxGeneration = Math.max(1, ...allPoints.map((p) => p.generation));
    const minGeneration = Math.min(1, ...allPoints.map((p) => p.generation));
    const maxDistance = Math.max(
      1,
      ...allPoints.flatMap((p) => [p.bestDistance, p.averageDistance])
    );

    const isTriple = (runs[0]?.checkpoint.config.trainingMode ?? "single") === "triple";

    this.description.textContent = `Porównanie ${runs.length} przebiegów w zakresie pokoleń ${minGeneration}–${maxGeneration}.`;

    this.drawGrid(maxDistance, minGeneration, maxGeneration, isTriple);

    runs.forEach((run, idx) => {
      const color = RUN_COLORS[idx % RUN_COLORS.length]!.stroke;
      const history = run.checkpoint.history;
      if (history.length > 0) {
        // Best series (solid)
        this.drawSeries(history, maxDistance, minGeneration, maxGeneration, "bestDistance", color, false);
        // Average series (dashed)
        this.drawSeries(history, maxDistance, minGeneration, maxGeneration, "averageDistance", color, true);
      }
    });
  }

  private drawGrid(maximum: number, minimumGeneration: number, maximumGeneration: number, isTriple = false): void {
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
    const plotWidth = WIDTH - PADDING.left - PADDING.right;

    for (let index = 0; index <= 4; index += 1) {
      const amount = index / 4;
      const y = PADDING.top + plotHeight * amount;
      const value = maximum * (1 - amount);
      this.svg.append(
        createSvg("line", {
          x1: PADDING.left,
          y1: y,
          x2: WIDTH - PADDING.right,
          y2: y,
          class: "chart-grid-line"
        })
      );
      const label = createSvg("text", {
        x: PADDING.left - 10,
        y: y + 4,
        class: "chart-axis-label",
        "text-anchor": "end"
      });
      label.textContent = isTriple ? formatPointsAxis(value) : formatAxis(value);
      this.svg.append(label);
    }

    const ticks = Math.min(6, Math.max(1, maximumGeneration - minimumGeneration));
    for (let index = 0; index <= ticks; index += 1) {
      const amount = ticks === 0 ? 0 : index / ticks;
      const x = PADDING.left + plotWidth * amount;
      const generation = Math.round(minimumGeneration + (maximumGeneration - minimumGeneration) * amount);
      const label = createSvg("text", {
        x,
        y: HEIGHT - 12,
        class: "chart-axis-label",
        "text-anchor": "middle"
      });
      label.textContent = `G${generation}`;
      this.svg.append(label);
    }
  }

  private drawSeries(
    summaries: readonly GenerationSummary[],
    maximum: number,
    minimumGeneration: number,
    maximumGeneration: number,
    key: "bestDistance" | "averageDistance",
    color: string,
    dashed: boolean
  ): void {
    const path = createSvg("path", {
      d: summaries
        .map((summary, index) => {
          const x = this.xFor(summary.generation, minimumGeneration, maximumGeneration);
          const y = this.yFor(summary[key], maximum);
          return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" "),
      class: "chart-series",
      stroke: color,
      fill: "none",
      ...(dashed ? { "stroke-dasharray": "6 4" } : {})
    });
    this.svg.append(path);

    const last = summaries.at(-1);
    if (last !== undefined) {
      const circle = createSvg("circle", {
        cx: this.xFor(last.generation, minimumGeneration, maximumGeneration),
        cy: this.yFor(last[key], maximum),
        r: 3.5,
        fill: color,
        stroke: color
      });
      this.svg.append(circle);
    }
  }

  private xFor(generation: number, minimumGeneration: number, maximumGeneration: number): number {
    const span = Math.max(1, maximumGeneration - minimumGeneration);
    return PADDING.left + ((generation - minimumGeneration) / span) * (WIDTH - PADDING.left - PADDING.right);
  }

  private yFor(value: number, maximum: number): number {
    const amount = value / Math.max(1, maximum);
    return HEIGHT - PADDING.bottom - amount * (HEIGHT - PADDING.top - PADDING.bottom);
  }
}

function createSvg(tag: string, attributes: Record<string, string | number>): SVGElement {
  const element = document.createElementNS(SVG_NAMESPACE, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
  return element;
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

function formatAxis(value: number): string {
  if (value >= 100) {
    return `${Math.round(value)} m`;
  }
  return `${value.toFixed(1)} m`;
}

function formatPointsAxis(value: number): string {
  return `${Math.round(value)} pkt`;
}
