import type { Genome, Point, VehicleGenes } from "./types";

export interface WheelPhenotype {
  anchor: Point;
  center: Point;
  radius: number;
  density: number;
  grip: number;
  springFrequency: number;
  springDamping: number;
  torque: number;
  speed: number;
}

export interface VehiclePhenotype {
  vertices: Point[];
  ballastCenter: Point;
  ballastRadius: number;
  motorSpeed: number;
  motorTorque: number;
  hue: number;
  wheels: WheelPhenotype[];
}

export function buildPhenotype(genome: Genome): VehiclePhenotype {
  const genes = genome.genes;
  const width = genes.width;
  const height = genes.height;
  const rearFloor = -height * (0.52 - genes.floorTilt);
  const frontFloor = -height * (0.52 + genes.floorTilt);

  const rawVertices: Point[] = [
    { x: -width * genes.tailScale, y: -height * 0.08 },
    { x: -width * 0.62, y: rearFloor },
    { x: width * 0.58, y: frontFloor },
    { x: width * genes.noseScale, y: -height * 0.04 },
    { x: width * 0.78 * genes.noseScale, y: height * 0.34 },
    { x: width * (0.42 * genes.roofScale + genes.roofOffset), y: height * 0.7 },
    { x: width * (-0.44 * genes.roofScale + genes.roofOffset), y: height * 0.7 },
    { x: -width * 0.78 * genes.tailScale, y: height * 0.32 }
  ];

  const activeCount = Math.min(4, Math.max(2, genes.wheelCount || 2));
  const rawWheels = [
    getWheelSlotData(genes, 0),
    getWheelSlotData(genes, 1),
    getWheelSlotData(genes, 2),
    getWheelSlotData(genes, 3)
  ].slice(0, activeCount);

  // Budżet momentu obrotowego:
  // totalTorque = 2 * motorTorque
  // torque[i] = totalTorque * driveShare[i] / suma aktywnych driveShare
  const totalTorque = 2 * genes.motorTorque;
  const totalDriveShare = rawWheels.reduce((sum, w) => sum + w.driveShare, 0);

  const wheels: WheelPhenotype[] = rawWheels.map((slot, index) => {
    const anchorX = width * slot.mountX;
    let anchorY: number;

    if (Boolean(genes.legacyAnchors) && index <= 1) {
      // W starym modelu v1: slot 0 miał rearFloor + height * 0.02, a slot 1 miał frontFloor + height * 0.02
      anchorY = (index === 0 ? rearFloor : frontFloor) + height * 0.02;
    } else {
      // Nowy model: interpolacja liniowa wysokości podłogi wzdłuż osi X korpusu
      const t = clamp((anchorX - (-width * 0.62)) / (width * 0.58 - (-width * 0.62)), 0, 1);
      const floorY = rearFloor + t * (frontFloor - rearFloor);
      anchorY = floorY + height * 0.02;
    }

    const torque =
      totalDriveShare > 1e-9
        ? (totalTorque * slot.driveShare) / totalDriveShare
        : totalTorque / activeCount;

    const speed = genes.motorSpeed * slot.speedRatio;

    return {
      anchor: { x: anchorX, y: anchorY },
      center: { x: anchorX, y: anchorY - slot.rideHeight },
      radius: slot.radius,
      density: slot.density,
      grip: slot.grip,
      springFrequency: slot.springFrequency,
      springDamping: slot.springDamping,
      torque,
      speed
    };
  });

  const frontBias = wheels.length > 1 ? (wheels[1]?.torque ?? 0) / (totalTorque || 1) : 0.5;

  return {
    vertices: ensureConvexHull(rawVertices),
    ballastCenter: { x: width * genes.ballastOffset, y: -height * 0.08 },
    ballastRadius: 0.1 + genes.ballastMass * 0.035,
    motorSpeed: genes.motorSpeed,
    motorTorque: genes.motorTorque,
    hue: Math.round(30 + frontBias * 280),
    wheels
  };
}

interface RawWheelSlot {
  radius: number;
  mountX: number;
  density: number;
  grip: number;
  rideHeight: number;
  springFrequency: number;
  springDamping: number;
  driveShare: number;
  speedRatio: number;
}

function getWheelSlotData(genes: VehicleGenes, index: number): RawWheelSlot {
  switch (index) {
    case 0:
      return {
        radius: genes.wheel0Radius,
        mountX: genes.wheel0MountX,
        density: genes.wheel0Density,
        grip: genes.wheel0Grip,
        rideHeight: genes.wheel0RideHeight,
        springFrequency: genes.wheel0SpringFrequency,
        springDamping: genes.wheel0SpringDamping,
        driveShare: genes.wheel0DriveShare,
        speedRatio: genes.wheel0SpeedRatio
      };
    case 1:
      return {
        radius: genes.wheel1Radius,
        mountX: genes.wheel1MountX,
        density: genes.wheel1Density,
        grip: genes.wheel1Grip,
        rideHeight: genes.wheel1RideHeight,
        springFrequency: genes.wheel1SpringFrequency,
        springDamping: genes.wheel1SpringDamping,
        driveShare: genes.wheel1DriveShare,
        speedRatio: genes.wheel1SpeedRatio
      };
    case 2:
      return {
        radius: genes.wheel2Radius,
        mountX: genes.wheel2MountX,
        density: genes.wheel2Density,
        grip: genes.wheel2Grip,
        rideHeight: genes.wheel2RideHeight,
        springFrequency: genes.wheel2SpringFrequency,
        springDamping: genes.wheel2SpringDamping,
        driveShare: genes.wheel2DriveShare,
        speedRatio: genes.wheel2SpeedRatio
      };
    case 3:
    default:
      return {
        radius: genes.wheel3Radius,
        mountX: genes.wheel3MountX,
        density: genes.wheel3Density,
        grip: genes.wheel3Grip,
        rideHeight: genes.wheel3RideHeight,
        springFrequency: genes.wheel3SpringFrequency,
        springDamping: genes.wheel3SpringDamping,
        driveShare: genes.wheel3DriveShare,
        speedRatio: genes.wheel3SpeedRatio
      };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function ensureConvexHull(points: Point[]): Point[] {
  if (points.length <= 3) {
    return [...points];
  }
  const sorted = [...points].sort((a, b) =>
    a.x === b.x ? a.y - b.y : a.x - b.x
  );

  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Point[] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 1e-9
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]!;
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 1e-9
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
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
