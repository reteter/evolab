import type { GenerationSummary } from "../domain/types";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const WIDTH = 900;
const HEIGHT = 260;
const PADDING = { top: 22, right: 28, bottom: 36, left: 54 };

export type UnitFormat = "meters" | "points";

export class TrendChart {
  private unit: UnitFormat = "meters";

  constructor(
    private readonly svg: SVGSVGElement,
    private readonly tableBody: HTMLTableSectionElement,
    private readonly description: HTMLElement
  ) {}

  setUnit(unit: UnitFormat): void {
    this.unit = unit;
  }

  render(summaries: readonly GenerationSummary[]): void {
    this.svg.replaceChildren();
    this.renderTable(summaries);

    if (summaries.length === 0) {
      this.description.textContent =
        "Wykres pojawi się po ukończeniu pierwszego pokolenia.";
      this.drawEmptyState();
      return;
    }

    const maximum = Math.max(
      1,
      ...summaries.flatMap(({ bestDistance, averageDistance }) => [
        bestDistance,
        averageDistance
      ])
    );
    const minimumGeneration = summaries[0]?.generation ?? 1;
    const maximumGeneration = summaries.at(-1)?.generation ?? minimumGeneration;
    this.description.textContent =
      `Pokolenia ${minimumGeneration}–${maximumGeneration}. ` +
      `Ostatni rekord ${this.formatVal(summaries.at(-1)?.bestDistance ?? 0)}, ` +
      `średnia ${this.formatVal(summaries.at(-1)?.averageDistance ?? 0)}.`;

    this.drawGrid(maximum, minimumGeneration, maximumGeneration);
    this.drawSeries(
      summaries,
      maximum,
      minimumGeneration,
      maximumGeneration,
      "bestDistance",
      "chart-best"
    );
    this.drawSeries(
      summaries,
      maximum,
      minimumGeneration,
      maximumGeneration,
      "averageDistance",
      "chart-average"
    );
  }

  private drawEmptyState(): void {
    const text = createSvg("text", {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      class: "chart-empty",
      "text-anchor": "middle"
    });
    text.textContent = "Pierwszy punkt pojawi się po pokoleniu 1";
    this.svg.append(text);
  }

  private drawGrid(
    maximum: number,
    minimumGeneration: number,
    maximumGeneration: number
  ): void {
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
      label.textContent = this.formatAxis(value);
      this.svg.append(label);
    }

    const ticks = Math.min(5, Math.max(1, maximumGeneration - minimumGeneration));
    for (let index = 0; index <= ticks; index += 1) {
      const amount = ticks === 0 ? 0 : index / ticks;
      const x = PADDING.left + plotWidth * amount;
      const generation = Math.round(
        minimumGeneration + (maximumGeneration - minimumGeneration) * amount
      );
      const label = createSvg("text", {
        x,
        y: HEIGHT - 10,
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
    className: string
  ): void {
    const path = createSvg("path", {
      d: summaries
        .map((summary, index) => {
          const x = this.xFor(
            summary.generation,
            minimumGeneration,
            maximumGeneration
          );
          const y = this.yFor(summary[key], maximum);
          return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" "),
      class: `chart-series ${className}`
    });
    this.svg.append(path);

    const last = summaries.at(-1);
    if (last === undefined) {
      return;
    }
    this.svg.append(
      createSvg("circle", {
        cx: this.xFor(last.generation, minimumGeneration, maximumGeneration),
        cy: this.yFor(last[key], maximum),
        r: 4.5,
        class: `chart-point ${className}`
      })
    );
  }

  private renderTable(summaries: readonly GenerationSummary[]): void {
    this.tableBody.replaceChildren();
    if (summaries.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.textContent = "Brak ukończonych pokoleń.";
      row.append(cell);
      this.tableBody.append(row);
      return;
    }

    for (const summary of [...summaries].slice(-12).reverse()) {
      const row = document.createElement("tr");
      for (const value of [
        String(summary.generation),
        this.formatVal(summary.bestDistance),
        this.formatVal(summary.averageDistance),
        summary.bestGenomeId
      ]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      this.tableBody.append(row);
    }
  }

  private formatVal(val: number): string {
    if (this.unit === "points") {
      return `${val.toLocaleString("pl-PL", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })} pkt`;
    }
    return formatDistance(val);
  }

  private formatAxis(val: number): string {
    if (this.unit === "points") {
      return `${Math.round(val)} pkt`;
    }
    return formatAxis(val);
  }

  private xFor(
    generation: number,
    minimumGeneration: number,
    maximumGeneration: number
  ): number {
    const span = Math.max(1, maximumGeneration - minimumGeneration);
    return (
      PADDING.left +
      ((generation - minimumGeneration) / span) *
        (WIDTH - PADDING.left - PADDING.right)
    );
  }

  private yFor(value: number, maximum: number): number {
    const amount = value / Math.max(1, maximum);
    return (
      HEIGHT -
      PADDING.bottom -
      amount * (HEIGHT - PADDING.top - PADDING.bottom)
    );
  }
}

function createSvg(
  tag: string,
  attributes: Record<string, string | number>
): SVGElement {
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

function formatAxis(value: number): string {
  if (value >= 100) {
    return `${Math.round(value)} m`;
  }
  return `${value.toFixed(1)} m`;
}
