import { buildPhenotype } from "../domain/phenotype";
import { interpolateTerrainHeight } from "../domain/world";
import type {
  Genome,
  Terrain,
  TrialSnapshot
} from "../domain/types";

interface Scene {
  terrain: Terrain;
  genome: Genome;
  snapshot: TrialSnapshot;
  replay?: boolean;
  vehicles?: readonly { genome: Genome; snapshot: TrialSnapshot }[];
  groupKey?: string;
}

export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private cameraX = 0;
  private cameraY = 0;
  private currentGenomeId = "";
  private reducedMotion = false;
  private lastScene: Scene | null = null;
  private zoomScale = 58;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("Przeglądarka nie udostępnia Canvas 2D.");
    }
    this.context = context;
    new ResizeObserver(() => {
      this.resize();
      if (this.lastScene === null) {
        this.renderIdle();
      } else {
        this.render(this.lastScene);
      }
    }).observe(canvas);
    this.resize();
    this.renderIdle();
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  render(scene: Scene): void {
    this.lastScene = scene;
    const vehicles = scene.vehicles?.length ? scene.vehicles : [scene];
    const positions = vehicles.map(({ snapshot }) => snapshot.chassis.x);
    const left = Math.min(...positions);
    const right = Math.max(...positions);
    const targetX = (left + right) / 2;
    const targetY = scene.snapshot.chassis.y - 1.2;
    const cameraKey = scene.groupKey ?? scene.genome.id;
    const targetScale = Math.min(this.baseScale(), this.width / (right - left + 14));
    if (cameraKey !== this.currentGenomeId || scene.replay) {
      this.currentGenomeId = cameraKey;
      this.cameraX = targetX;
      this.cameraY = targetY;
      this.zoomScale = targetScale;
    } else {
      const easing = this.reducedMotion ? 1 : 0.12;
      this.cameraX += (targetX - this.cameraX) * easing;
      this.cameraY += (targetY - this.cameraY) * easing;
      this.zoomScale += (targetScale - this.zoomScale) * easing;
    }

    this.beginFrame();
    this.drawSky();
    this.drawGrid(scene.terrain);
    this.drawTerrain(scene.terrain);
    this.drawStartMarker(scene.terrain);
    for (const vehicle of vehicles) {
      if (vehicle.genome.id !== scene.genome.id) {
        this.context.save();
        this.context.globalAlpha = 0.58;
        this.drawVehicle(vehicle.genome, vehicle.snapshot);
        this.context.restore();
      }
    }
    this.drawVehicle(scene.genome, scene.snapshot);
    this.drawProgressBeam(scene.snapshot.chassis.x);
  }

  renderIdle(): void {
    this.lastScene = null;
    this.cameraX = 0;
    this.cameraY = 0;
    this.zoomScale = this.baseScale();
    this.beginFrame();
    this.drawSky();
    this.drawGrid(null);
    this.drawIdleTerrain();
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * this.pixelRatio);
    this.canvas.height = Math.round(this.height * this.pixelRatio);
  }

  private beginFrame(): void {
    this.context.setTransform(
      this.pixelRatio,
      0,
      0,
      this.pixelRatio,
      0,
      0
    );
    this.context.clearRect(0, 0, this.width, this.height);
  }

  private drawSky(): void {
    const gradient = this.context.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#173839");
    gradient.addColorStop(0.62, "#102829");
    gradient.addColorStop(1, "#0a1d1e");
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, this.width, this.height);

    const glow = this.context.createRadialGradient(
      this.width * 0.72,
      this.height * 0.08,
      0,
      this.width * 0.72,
      this.height * 0.08,
      this.width * 0.55
    );
    glow.addColorStop(0, "rgba(198, 240, 77, 0.13)");
    glow.addColorStop(1, "rgba(198, 240, 77, 0)");
    this.context.fillStyle = glow;
    this.context.fillRect(0, 0, this.width, this.height);
  }

  private drawGrid(terrain: Terrain | null): void {
    const scale = this.scale();
    const leftWorld = this.cameraX - (this.width * 0.42) / scale;
    const rightWorld = leftWorld + this.width / scale;
    const baseY = this.height * 0.64 + this.cameraY * scale;

    this.context.save();
    this.context.strokeStyle = "rgba(203, 230, 213, 0.075)";
    this.context.lineWidth = 1;

    const startMeter = Math.floor(leftWorld / 10) * 10;
    for (let meter = startMeter; meter <= rightWorld + 10; meter += 10) {
      const x = this.screenX(meter);
      this.context.beginPath();
      this.context.moveTo(x, 0);
      this.context.lineTo(x, this.height);
      this.context.stroke();

      if (terrain !== null && meter >= 0) {
        const y = this.screenY(
          interpolateTerrainHeight(terrain.points, meter)
        );
        this.context.fillStyle = "rgba(222, 238, 229, 0.52)";
        this.context.font = "600 11px ui-monospace, SFMono-Regular, monospace";
        this.context.fillText(`${meter} m`, x + 6, Math.min(this.height - 12, y + 24));
      }
    }

    for (let line = -2; line <= 5; line += 2) {
      const y = baseY - line * scale;
      this.context.beginPath();
      this.context.moveTo(0, y);
      this.context.lineTo(this.width, y);
      this.context.stroke();
    }
    this.context.restore();
  }

  private drawTerrain(terrain: Terrain): void {
    const scale = this.scale();
    const margin = 8 / scale;
    const left = this.cameraX - (this.width * 0.42) / scale - margin;
    const right = left + this.width / scale + margin * 2;
    const visible = terrain.points.filter(
      ({ x }) => x >= left - 5 && x <= right + 5
    );
    if (visible.length < 2) {
      return;
    }

    this.context.save();
    this.context.beginPath();
    const first = visible[0];
    if (first === undefined) {
      this.context.restore();
      return;
    }
    this.context.moveTo(this.screenX(first.x), this.screenY(first.y));
    for (const point of visible.slice(1)) {
      this.context.lineTo(this.screenX(point.x), this.screenY(point.y));
    }
    const last = visible.at(-1);
    if (last === undefined) {
      this.context.restore();
      return;
    }
    this.context.lineTo(this.screenX(last.x), this.height + 20);
    this.context.lineTo(this.screenX(first.x), this.height + 20);
    this.context.closePath();

    const ground = this.context.createLinearGradient(0, this.height * 0.5, 0, this.height);
    ground.addColorStop(0, "#183d37");
    ground.addColorStop(1, "#0a201f");
    this.context.fillStyle = ground;
    this.context.fill();

    this.context.beginPath();
    this.context.moveTo(this.screenX(first.x), this.screenY(first.y));
    for (const point of visible.slice(1)) {
      this.context.lineTo(this.screenX(point.x), this.screenY(point.y));
    }
    this.context.strokeStyle = "#c6f04d";
    this.context.lineWidth = 3;
    this.context.lineJoin = "round";
    this.context.shadowColor = "rgba(198, 240, 77, 0.3)";
    this.context.shadowBlur = 12;
    this.context.stroke();
    this.context.restore();
  }

  private drawIdleTerrain(): void {
    this.context.save();
    this.context.beginPath();
    this.context.moveTo(0, this.height * 0.7);
    this.context.bezierCurveTo(
      this.width * 0.25,
      this.height * 0.7,
      this.width * 0.35,
      this.height * 0.52,
      this.width * 0.55,
      this.height * 0.6
    );
    this.context.bezierCurveTo(
      this.width * 0.72,
      this.height * 0.68,
      this.width * 0.84,
      this.height * 0.46,
      this.width,
      this.height * 0.56
    );
    this.context.lineTo(this.width, this.height);
    this.context.lineTo(0, this.height);
    this.context.closePath();
    this.context.fillStyle = "#12322f";
    this.context.fill();
    this.context.strokeStyle = "rgba(198, 240, 77, 0.5)";
    this.context.lineWidth = 3;
    this.context.stroke();

    this.context.fillStyle = "rgba(233, 242, 234, 0.72)";
    this.context.font = "600 15px 'Segoe UI', sans-serif";
    this.context.textAlign = "center";
    this.context.fillText(
      "Ustaw parametry i uruchom pierwsze pokolenie",
      this.width / 2,
      this.height * 0.32
    );
    this.context.restore();
  }

  private drawStartMarker(terrain: Terrain): void {
    const x = this.screenX(0);
    const y = this.screenY(interpolateTerrainHeight(terrain.points, 0));
    this.context.save();
    this.context.strokeStyle = "rgba(239, 245, 236, 0.65)";
    this.context.lineWidth = 2;
    this.context.beginPath();
    this.context.moveTo(x, y);
    this.context.lineTo(x, y - 72);
    this.context.stroke();
    this.context.fillStyle = "#ff754d";
    this.context.fillRect(x, y - 72, 30, 18);
    this.context.fillStyle = "#fff5e8";
    this.context.font = "700 10px ui-monospace, monospace";
    this.context.fillText("START", x + 3, y - 59);
    this.context.restore();
  }

  private drawVehicle(genome: Genome, snapshot: TrialSnapshot): void {
    const phenotype = buildPhenotype(genome);
    const scale = this.scale();

    for (const [index, anchor] of [phenotype.rearAnchor, phenotype.frontAnchor].entries()) {
      const cosine = Math.cos(snapshot.chassis.angle);
      const sine = Math.sin(snapshot.chassis.angle);
      const x = this.screenX(snapshot.chassis.x + anchor.x * cosine - anchor.y * sine);
      const y = this.screenY(snapshot.chassis.y + anchor.x * sine + anchor.y * cosine);
      const wheel = snapshot.wheels[index]!;
      const dx = this.screenX(wheel.x) - x;
      const dy = this.screenY(wheel.y) - y;
      const length = Math.hypot(dx, dy) || 1;
      this.context.save();
      this.context.strokeStyle = "#d9e8db";
      this.context.lineWidth = 2;
      this.context.beginPath();
      this.context.moveTo(x, y);
      for (let segment = 1; segment <= 6; segment += 1) {
        const offset = segment === 6 ? 0 : (segment % 2 ? 2 : -2);
        this.context.lineTo(x + dx * segment / 6 - dy / length * offset, y + dy * segment / 6 + dx / length * offset);
      }
      this.context.stroke();
      this.context.restore();
    }

    this.context.save();
    this.context.translate(
      this.screenX(snapshot.chassis.x),
      this.screenY(snapshot.chassis.y)
    );
    this.context.rotate(-snapshot.chassis.angle);
    this.context.beginPath();
    phenotype.vertices.forEach((point, index) => {
      const x = point.x * scale;
      const y = -point.y * scale;
      if (index === 0) {
        this.context.moveTo(x, y);
      } else {
        this.context.lineTo(x, y);
      }
    });
    this.context.closePath();
    this.context.fillStyle = `hsl(${phenotype.hue} 82% 58%)`;
    this.context.strokeStyle = "#f6ffdf";
    this.context.lineWidth = 2.2;
    this.context.shadowColor = `hsl(${phenotype.hue} 90% 55% / 0.32)`;
    this.context.shadowBlur = 18;
    this.context.fill();
    this.context.stroke();

    this.context.shadowBlur = 0;
    this.context.strokeStyle = "rgba(12, 37, 37, 0.48)";
    this.context.lineWidth = 1.4;
    this.context.beginPath();
    this.context.moveTo(phenotype.rearAnchor.x * scale, -phenotype.rearAnchor.y * scale);
    this.context.lineTo(phenotype.frontAnchor.x * scale, -phenotype.frontAnchor.y * scale);
    this.context.stroke();

    this.context.beginPath();
    this.context.arc(
      phenotype.ballastCenter.x * scale,
      -phenotype.ballastCenter.y * scale,
      phenotype.ballastRadius * scale,
      0, Math.PI * 2
    );
    this.context.fillStyle = "#193633";
    this.context.fill();
    this.context.strokeStyle = "rgba(246, 255, 223, 0.8)";
    this.context.stroke();
    this.context.restore();

    this.drawWheel(
      snapshot.wheels[0],
      phenotype.rearWheelRadius,
      phenotype.hue
    );
    this.drawWheel(
      snapshot.wheels[1],
      phenotype.frontWheelRadius,
      phenotype.hue
    );

    this.context.save();
    this.context.font = "700 11px ui-monospace, monospace";
    this.context.textAlign = "center";
    this.context.lineWidth = 3;
    this.context.strokeStyle = "#102728";
    this.context.fillStyle = `hsl(${phenotype.hue} 85% 75%)`;
    const labelX = this.screenX(snapshot.chassis.x);
    const labelY = this.screenY(snapshot.chassis.y + genome.genes.height) - 10;
    this.context.strokeText(genome.id, labelX, labelY);
    this.context.fillText(genome.id, labelX, labelY);
    this.context.restore();
  }

  private drawWheel(pose: { x: number; y: number; angle: number }, radius: number, hue: number): void {
    const scale = this.scale();
    const wheelRadius = radius * scale;
    this.context.save();
    this.context.translate(this.screenX(pose.x), this.screenY(pose.y));
    this.context.rotate(-pose.angle);
    this.context.fillStyle = "#0a1718";
    this.context.strokeStyle = "#eef6e9";
    this.context.lineWidth = 2.4;
    this.context.beginPath();
    this.context.arc(0, 0, wheelRadius, 0, Math.PI * 2);
    this.context.fill();
    this.context.stroke();
    this.context.strokeStyle = `hsl(${hue} 82% 58%)`;
    this.context.lineWidth = 2;
    for (let spoke = 0; spoke < 3; spoke += 1) {
      const angle = (spoke / 3) * Math.PI * 2;
      this.context.beginPath();
      this.context.moveTo(0, 0);
      this.context.lineTo(
        Math.cos(angle) * wheelRadius * 0.72,
        Math.sin(angle) * wheelRadius * 0.72
      );
      this.context.stroke();
    }
    this.context.fillStyle = "#eef6e9";
    this.context.beginPath();
    this.context.arc(0, 0, Math.max(3, wheelRadius * 0.12), 0, Math.PI * 2);
    this.context.fill();
    this.context.restore();
  }

  private drawProgressBeam(worldX: number): void {
    const x = this.screenX(worldX);
    this.context.save();
    const gradient = this.context.createLinearGradient(x, 0, x, this.height);
    gradient.addColorStop(0, "rgba(255, 117, 77, 0)");
    gradient.addColorStop(0.3, "rgba(255, 117, 77, 0.2)");
    gradient.addColorStop(0.8, "rgba(255, 117, 77, 0)");
    this.context.strokeStyle = gradient;
    this.context.lineWidth = 1;
    this.context.setLineDash([4, 8]);
    this.context.beginPath();
    this.context.moveTo(x, 0);
    this.context.lineTo(x, this.height);
    this.context.stroke();
    this.context.restore();
  }

  private screenX(worldX: number): number {
    return (worldX - this.cameraX) * this.scale() + this.width * 0.42;
  }

  private screenY(worldY: number): number {
    return this.height * 0.64 - (worldY - this.cameraY) * this.scale();
  }

  private scale(): number {
    return Math.min(this.zoomScale, this.baseScale());
  }

  private baseScale(): number {
    return Math.max(34, Math.min(58, this.width / 15));
  }
}
