import { createRng, deriveSeed, randomBetween } from "./rng";
import type { Point, Terrain, TerrainProfile } from "./types";

const START_X = -20;
const TOTAL_SPAN = 876; // (220 - 1) * 4 = 876; endX = 856
const FLAT_UNTIL_X = 12;

interface ProfileConfig {
  segmentLength: number;
  broadFreqMult: number;
  broadAmpMult: number;
  mediumFreqMult: number;
  mediumAmpMult: number;
  detailFreqMult: number;
  detailAmpMult: number;
}

const PROFILE_CONFIGS: Record<TerrainProfile, ProfileConfig> = {
  smooth: {
    segmentLength: 4,
    broadFreqMult: 1,
    broadAmpMult: 1,
    mediumFreqMult: 1,
    mediumAmpMult: 1,
    detailFreqMult: 1,
    detailAmpMult: 1
  },
  "steep-hills": {
    segmentLength: 4,
    broadFreqMult: 1.5,
    broadAmpMult: 2.0,
    mediumFreqMult: 1.5,
    mediumAmpMult: 2.0,
    detailFreqMult: 1.5,
    detailAmpMult: 2.0
  },
  bumpy: {
    segmentLength: 1,
    broadFreqMult: 5.0,
    broadAmpMult: 0.15,
    mediumFreqMult: 5.0,
    mediumAmpMult: 0.6,
    detailFreqMult: 5.0,
    detailAmpMult: 1.4
  }
};

export function createTerrain(
  seed: string,
  profile: TerrainProfile = "smooth",
  difficulty = 3
): Terrain {
  const coefficients = terrainCoefficients(seed);
  const config = PROFILE_CONFIGS[profile] ?? PROFILE_CONFIGS.smooth;
  const pointCount = Math.floor(TOTAL_SPAN / config.segmentLength) + 1;

  const points: Point[] = Array.from({ length: pointCount }, (_, index) => {
    const x = START_X + index * config.segmentLength;
    return { x, y: terrainHeight(x, coefficients, profile, difficulty) };
  });

  return {
    seed,
    profile,
    difficulty,
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

function terrainHeight(
  x: number,
  coefficients: TerrainCoefficients,
  profile: TerrainProfile,
  difficulty: number
): number {
  if (x <= FLAT_UNTIL_X) {
    return 0;
  }

  const pConfig = PROFILE_CONFIGS[profile] ?? PROFILE_CONFIGS.smooth;
  const distance = x - FLAT_UNTIL_X;
  const ramp = Math.min(1, distance / 90);

  const broad =
    Math.sin(distance * 0.031 * pConfig.broadFreqMult + coefficients.phaseA) *
    (coefficients.amplitudeA * pConfig.broadAmpMult);
  const medium =
    Math.sin(distance * 0.079 * pConfig.mediumFreqMult + coefficients.phaseB) *
    (coefficients.amplitudeB * pConfig.mediumAmpMult);
  const detail =
    Math.sin(distance * 0.173 * pConfig.detailFreqMult + coefficients.phaseC) *
    (coefficients.amplitudeC * pConfig.detailAmpMult);

  const progressiveDifficulty = Math.min(1.35, 0.72 + distance / 1_100);
  const userDifficultyMultiplier = 0.5 + 0.25 * (difficulty - 1);

  if (profile === "smooth" && difficulty === 3) {
    return clamp(
      (broad + medium + detail) * ramp * progressiveDifficulty,
      -3.8,
      5.4
    );
  }

  return clamp(
    (broad + medium + detail) * ramp * progressiveDifficulty * userDifficultyMultiplier,
    -5.0,
    7.0
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
