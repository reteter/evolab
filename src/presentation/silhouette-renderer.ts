import { buildPhenotype } from "../domain/phenotype";
import type { Genome } from "../domain/types";

export function renderVehicleSilhouette(
  canvas: HTMLCanvasElement,
  genome: Genome,
  width = 160,
  height = 100
): void {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = "#102829";
  ctx.fillRect(0, 0, width, height);

  // Baseline track line
  ctx.strokeStyle = "rgba(198, 240, 77, 0.25)";
  ctx.lineWidth = 1.5;
  const groundY = height * 0.78;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(width, groundY);
  ctx.stroke();

  const phenotype = buildPhenotype(genome);

  // Calculate bounding box of chassis + wheels to center and scale
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const v of phenotype.vertices) {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  }

  for (const w of phenotype.wheels) {
    const wx = w.anchor.x;
    const wy = w.anchor.y;
    if (wx - w.radius < minX) minX = wx - w.radius;
    if (wx + w.radius > maxX) maxX = wx + w.radius;
    if (wy - w.radius < minY) minY = wy - w.radius;
    if (wy + w.radius > maxY) maxY = wy + w.radius;
  }

  const spanX = Math.max(0.1, maxX - minX);
  const spanY = Math.max(0.1, maxY - minY);
  const padding = 18;
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const toScreenX = (x: number) => width / 2 + (x - centerX) * scale;
  const toScreenY = (y: number) => height / 2 - (y - centerY) * scale;

  // Suspension struts
  ctx.strokeStyle = "#d9e8db";
  ctx.lineWidth = 1.5;
  for (const wheel of phenotype.wheels) {
    const ax = toScreenX(wheel.anchor.x);
    const ay = toScreenY(wheel.anchor.y);
    const wx = toScreenX(wheel.center.x);
    const wy = toScreenY(wheel.center.y);

    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(wx, wy);
    ctx.stroke();
  }

  // Chassis
  ctx.save();
  ctx.beginPath();
  phenotype.vertices.forEach((point, index) => {
    const sx = toScreenX(point.x);
    const sy = toScreenY(point.y);
    if (index === 0) {
      ctx.moveTo(sx, sy);
    } else {
      ctx.lineTo(sx, sy);
    }
  });
  ctx.closePath();
  ctx.fillStyle = `hsl(${phenotype.hue} 82% 58%)`;
  ctx.strokeStyle = "#f6ffdf";
  ctx.lineWidth = 1.8;
  ctx.fill();
  ctx.stroke();

  // Ballast
  ctx.beginPath();
  ctx.arc(
    toScreenX(phenotype.ballastCenter.x),
    toScreenY(phenotype.ballastCenter.y),
    phenotype.ballastRadius * scale,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "#193633";
  ctx.fill();
  ctx.strokeStyle = "rgba(246, 255, 223, 0.8)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Wheels
  for (const wheel of phenotype.wheels) {
    const wx = toScreenX(wheel.center.x);
    const wy = toScreenY(wheel.center.y);
    const wr = wheel.radius * scale;

    ctx.save();
    ctx.fillStyle = "#0a1718";
    ctx.strokeStyle = "#eef6e9";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(wx, wy, wr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = `hsl(${phenotype.hue} 82% 58%)`;
    ctx.lineWidth = 1.2;
    for (let spoke = 0; spoke < 3; spoke += 1) {
      const angle = (spoke / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + Math.cos(angle) * wr * 0.72, wy + Math.sin(angle) * wr * 0.72);
      ctx.stroke();
    }

    ctx.fillStyle = "#eef6e9";
    ctx.beginPath();
    ctx.arc(wx, wy, Math.max(2, wr * 0.15), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
