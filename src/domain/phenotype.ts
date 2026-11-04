import type { Genome, Point } from "./types";

export interface VehiclePhenotype {
  vertices: Point[];
  rearAnchor: Point;
  frontAnchor: Point;
  rearWheelCenter: Point;
  frontWheelCenter: Point;
  ballastCenter: Point;
  ballastRadius: number;
  rearWheelRadius: number;
  frontWheelRadius: number;
  motorSpeed: number;
  motorTorque: number;
  hue: number;
}

export function buildPhenotype(genome: Genome): VehiclePhenotype {
  const genes = genome.genes;
  const width = genes.width;
  const height = genes.height;
  const rearFloor = -height * (0.52 - genes.floorTilt);
  const frontFloor = -height * (0.52 + genes.floorTilt);

  return {
    vertices: [
      { x: -width * genes.tailScale, y: -height * 0.08 },
      { x: -width * 0.62, y: rearFloor },
      { x: width * 0.58, y: frontFloor },
      { x: width * genes.noseScale, y: -height * 0.04 },
      { x: width * 0.78 * genes.noseScale, y: height * 0.34 },
      { x: width * (0.42 * genes.roofScale + genes.roofOffset), y: height * 0.7 },
      { x: width * (-0.44 * genes.roofScale + genes.roofOffset), y: height * 0.7 },
      { x: -width * 0.78 * genes.tailScale, y: height * 0.32 }
    ],
    rearAnchor: {
      x: -width * genes.rearInset,
      y: rearFloor + height * 0.02
    },
    frontAnchor: {
      x: width * genes.frontInset,
      y: frontFloor + height * 0.02
    },
    rearWheelCenter: {
      x: -width * genes.rearInset,
      y: rearFloor + height * 0.02 - genes.rearRideHeight
    },
    frontWheelCenter: {
      x: width * genes.frontInset,
      y: frontFloor + height * 0.02 - genes.frontRideHeight
    },
    ballastCenter: { x: width * genes.ballastOffset, y: -height * 0.08 },
    ballastRadius: 0.1 + genes.ballastMass * 0.035,
    rearWheelRadius: genes.rearWheelRadius,
    frontWheelRadius: genes.frontWheelRadius,
    motorSpeed: genes.motorSpeed,
    motorTorque: genes.motorTorque,
    hue: Math.round(30 + genes.driveBalance * 280)
  };
}

export function polygonIsConvex(vertices: Point[]): boolean {
  if (vertices.length < 3) {
    return false;
  }

  let direction = 0;
  for (let index = 0; index < vertices.length; index += 1) {
    const first = vertices[index];
    const second = vertices[(index + 1) % vertices.length];
    const third = vertices[(index + 2) % vertices.length];
    if (first === undefined || second === undefined || third === undefined) {
      return false;
    }

    const cross =
      (second.x - first.x) * (third.y - second.y) -
      (second.y - first.y) * (third.x - second.x);
    if (Math.abs(cross) < 1e-9) {
      continue;
    }
    const currentDirection = Math.sign(cross);
    if (direction === 0) {
      direction = currentDirection;
    } else if (currentDirection !== direction) {
      return false;
    }
  }
  return direction !== 0;
}
