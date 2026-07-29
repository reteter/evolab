import { createRng, deriveSeed, randomBetween } from "./rng";
import type { Point, Terrain } from "./types";

const SEGMENT_LENGTH = 4;
const POINT_COUNT = 220;
const START_X = -20;
const FLAT_UNTIL_X = 12;

export function createTerrain(seed: string): Terrain {
  const coefficients = terrainCoefficients(seed);
  const points: Point[] = Array.from({ length: POINT_COUNT }, (_, index) => {
    const x = START_X + index * SEGMENT_LENGTH;
    return { x, y: terrainHeight(x, coefficients) };
  });

  return {
    seed,
    points,
    startY: interpolateTerrainHeight(points, 0),
    endX: points.at(-1)?.x ?? 0
  };
}

export function interpolateTerrainHeight(points: Point[], x: number): number {
  if (points.length === 0) {
    return 0;
  }

  if (x <= (points[0]?.x ?? 0)) {
    return points[0]?.y ?? 0;
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];
    if (left === undefined || right === undefined) {
      continue;
    }
    if (x >= left.x && x <= right.x) {
      const amount = (x - left.x) / (right.x - left.x);
      return left.y + (right.y - left.y) * amount;
    }
  }

  return points.at(-1)?.y ?? 0;
}

interface TerrainCoefficients {
  phaseA: number;
  phaseB: number;
  phaseC: number;
  amplitudeA: number;
  amplitudeB: number;
  amplitudeC: number;
}

function terrainCoefficients(seed: string): TerrainCoefficients {
  const random = createRng(deriveSeed(seed, "world", "rolling-hills", 1));
  return {
    phaseA: randomBetween(random, 0, Math.PI * 2),
    phaseB: randomBetween(random, 0, Math.PI * 2),
    phaseC: randomBetween(random, 0, Math.PI * 2),
    amplitudeA: randomBetween(random, 1.15, 1.75),
    amplitudeB: randomBetween(random, 0.35, 0.72),
    amplitudeC: randomBetween(random, 0.12, 0.34)
  };
}

function terrainHeight(x: number, coefficients: TerrainCoefficients): number {
  if (x <= FLAT_UNTIL_X) {
    return 0;
  }

  const distance = x - FLAT_UNTIL_X;
  const ramp = Math.min(1, distance / 90);
  const broad =
    Math.sin(distance * 0.031 + coefficients.phaseA) * coefficients.amplitudeA;
  const medium =
    Math.sin(distance * 0.079 + coefficients.phaseB) * coefficients.amplitudeB;
  const detail =
    Math.sin(distance * 0.173 + coefficients.phaseC) * coefficients.amplitudeC;
  const difficulty = Math.min(1.35, 0.72 + distance / 1_100);

  return clamp((broad + medium + detail) * ramp * difficulty, -3.8, 5.4);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
