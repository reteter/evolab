import RAPIER from "@dimforge/rapier2d";
import {
  Circle,
  Edge,
  Polygon,
  RevoluteJoint,
  Vec2,
  World as PlanckWorld,
  type Body as PlanckBody
} from "planck";
import { vehicleShape, type Genome, type Pose, type Terrain, type TrialSnapshot } from "./domain";
import type { PhysicsAdapter, TrialWorld } from "./physics";

const GRAVITY = -9.81;
const GROUND_FRICTION = 1.1;
const VEHICLE_FRICTION = 1;

export class RapierAdapter implements PhysicsAdapter {
  readonly id = "rapier";
  readonly label = "Rapier2D 0.19.3";
  private initialized = false;

  async initialize(): Promise<number> {
    if (this.initialized) {
      return 0;
    }
    const startedAt = performance.now();
    await Promise.resolve();
    this.initialized = true;
    return performance.now() - startedAt;
  }

  createTrial(genome: Genome, terrain: Terrain): TrialWorld {
    if (!this.initialized) {
      throw new Error("Rapier2D nie został zainicjalizowany.");
    }
    return new RapierTrial(genome, terrain);
  }
}

export class PlanckAdapter implements PhysicsAdapter {
  readonly id = "planck";
  readonly label = "Planck.js 1.5.0";

  async initialize(): Promise<number> {
    return 0;
  }

  createTrial(genome: Genome, terrain: Terrain): TrialWorld {
    return new PlanckTrial(genome, terrain);
  }
}

class RapierTrial implements TrialWorld {
  private readonly world: RAPIER.World;
  private readonly chassis: RAPIER.RigidBody;
  private readonly rearWheel: RAPIER.RigidBody;
  private readonly frontWheel: RAPIER.RigidBody;
  private tick = 0;

  constructor(genome: Genome, terrain: Terrain) {
    this.world = new RAPIER.World({ x: 0, y: GRAVITY });
    this.createGround(terrain);

    const shape = vehicleShape(genome);
    const startY =
      terrain.startY +
      genome.height +
      Math.max(genome.rearWheelRadius, genome.frontWheelRadius) +
      0.7;

    this.chassis = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, startY)
        .setLinearDamping(0.08)
        .setAngularDamping(0.08)
        .setCanSleep(false)
    );

    const hullPoints = new Float32Array(shape.vertices.flatMap((point) => [point.x, point.y]));
    const hull = RAPIER.ColliderDesc.convexHull(hullPoints);
    if (hull === null) {
      this.world.free();
      throw new Error(`Rapier2D odrzucił korpus ${genome.id}.`);
    }
    this.world.createCollider(
      hull.setDensity(1).setFriction(VEHICLE_FRICTION).setRestitution(0.03),
      this.chassis
    );

    this.rearWheel = this.createWheel(
      shape.rearAnchor.x,
      startY + shape.rearAnchor.y,
      genome.rearWheelRadius
    );
    this.frontWheel = this.createWheel(
      shape.frontAnchor.x,
      startY + shape.frontAnchor.y,
      genome.frontWheelRadius
    );

    this.createMotor(shape.rearAnchor, this.rearWheel, genome);
    this.createMotor(shape.frontAnchor, this.frontWheel, genome);
  }

  step(fixedDeltaSeconds: number): TrialSnapshot {
    this.world.timestep = fixedDeltaSeconds;
    this.world.step();
    this.tick += 1;
    return this.snapshot();
  }

  snapshot(): TrialSnapshot {
    const chassis = rapierPose(this.chassis);
    const rearWheel = rapierPose(this.rearWheel);
    const frontWheel = rapierPose(this.frontWheel);
    return {
      tick: this.tick,
      chassis,
      wheels: [rearWheel, frontWheel],
      finite: posesAreFinite([chassis, rearWheel, frontWheel])
    };
  }

  dispose(): void {
    this.world.free();
  }

  private createGround(terrain: Terrain): void {
    for (let index = 0; index < terrain.points.length - 1; index += 1) {
      const first = terrain.points[index];
      const second = terrain.points[index + 1];
      const deltaX = second.x - first.x;
      const deltaY = second.y - first.y;
      const length = Math.hypot(deltaX, deltaY);
      const angle = Math.atan2(deltaY, deltaX);
      const thickness = 0.16;
      const normalX = -Math.sin(angle);
      const normalY = Math.cos(angle);
      const midpointX = (first.x + second.x) / 2 - normalX * thickness;
      const midpointY = (first.y + second.y) / 2 - normalY * thickness;
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(length / 2, thickness)
          .setTranslation(midpointX, midpointY)
          .setRotation(angle)
          .setFriction(GROUND_FRICTION)
          .setRestitution(0)
      );
    }
  }

  private createWheel(x: number, y: number, radius: number): RAPIER.RigidBody {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y)
        .setLinearDamping(0.03)
        .setAngularDamping(0.03)
        .setCanSleep(false)
        .setCcdEnabled(true)
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.ball(radius)
        .setDensity(0.9)
        .setFriction(VEHICLE_FRICTION)
        .setRestitution(0.02),
      body
    );
    return body;
  }

  private createMotor(anchor: { x: number; y: number }, wheel: RAPIER.RigidBody, genome: Genome): void {
    const data = RAPIER.JointData.revolute(anchor, { x: 0, y: 0 });
    const joint = this.world.createImpulseJoint(
      data,
      this.chassis,
      wheel,
      true
    ) as RAPIER.RevoluteImpulseJoint;
    joint.configureMotorVelocity(-genome.motorSpeed, genome.motorTorque / 64);
  }
}

class PlanckTrial implements TrialWorld {
  private readonly world: PlanckWorld;
  private readonly chassis: PlanckBody;
  private readonly rearWheel: PlanckBody;
  private readonly frontWheel: PlanckBody;
  private tick = 0;

  constructor(genome: Genome, terrain: Terrain) {
    this.world = new PlanckWorld({
      gravity: Vec2(0, GRAVITY),
      allowSleep: false,
      continuousPhysics: true
    });
    this.createGround(terrain);

    const shape = vehicleShape(genome);
    const startY =
      terrain.startY +
      genome.height +
      Math.max(genome.rearWheelRadius, genome.frontWheelRadius) +
      0.7;

    this.chassis = this.world.createBody({
      type: "dynamic",
      position: Vec2(0, startY),
      linearDamping: 0.08,
      angularDamping: 0.08,
      allowSleep: false
    });
    this.chassis.createFixture(
      new Polygon(shape.vertices.map((point) => Vec2(point.x, point.y))),
      {
        density: 1,
        friction: VEHICLE_FRICTION,
        restitution: 0.03
      }
    );

    this.rearWheel = this.createWheel(
      shape.rearAnchor.x,
      startY + shape.rearAnchor.y,
      genome.rearWheelRadius
    );
    this.frontWheel = this.createWheel(
      shape.frontAnchor.x,
      startY + shape.frontAnchor.y,
      genome.frontWheelRadius
    );

    this.createMotor(shape.rearAnchor, this.rearWheel, genome);
    this.createMotor(shape.frontAnchor, this.frontWheel, genome);
  }

  step(fixedDeltaSeconds: number): TrialSnapshot {
    this.world.step(fixedDeltaSeconds, 8, 3);
    this.tick += 1;
    return this.snapshot();
  }

  snapshot(): TrialSnapshot {
    const chassis = planckPose(this.chassis);
    const rearWheel = planckPose(this.rearWheel);
    const frontWheel = planckPose(this.frontWheel);
    return {
      tick: this.tick,
      chassis,
      wheels: [rearWheel, frontWheel],
      finite: posesAreFinite([chassis, rearWheel, frontWheel])
    };
  }

  dispose(): void {
    // Planck.js jest zarządzany przez GC; porzucenie świata zwalnia stan prototypu.
  }

  private createGround(terrain: Terrain): void {
    const ground = this.world.createBody();
    for (let index = 0; index < terrain.points.length - 1; index += 1) {
      const first = terrain.points[index];
      const second = terrain.points[index + 1];
      ground.createFixture(
        new Edge(Vec2(first.x, first.y), Vec2(second.x, second.y)),
        {
          friction: GROUND_FRICTION,
          restitution: 0
        }
      );
    }
  }

  private createWheel(x: number, y: number, radius: number): PlanckBody {
    const body = this.world.createBody({
      type: "dynamic",
      position: Vec2(x, y),
      linearDamping: 0.03,
      angularDamping: 0.03,
      allowSleep: false,
      bullet: true
    });
    body.createFixture(new Circle(radius), {
      density: 0.9,
      friction: VEHICLE_FRICTION,
      restitution: 0.02
    });
    return body;
  }

  private createMotor(anchor: { x: number; y: number }, wheel: PlanckBody, genome: Genome): void {
    const worldAnchor = this.chassis.getWorldPoint(Vec2(anchor.x, anchor.y));
    this.world.createJoint(
      new RevoluteJoint(
        {
          enableMotor: true,
          motorSpeed: -genome.motorSpeed,
          maxMotorTorque: genome.motorTorque,
          collideConnected: false
        },
        this.chassis,
        wheel,
        worldAnchor
      )
    );
  }
}

function rapierPose(body: RAPIER.RigidBody): Pose {
  const translation = body.translation();
  return {
    x: translation.x,
    y: translation.y,
    angle: body.rotation()
  };
}

function planckPose(body: PlanckBody): Pose {
  const position = body.getPosition();
  return {
    x: position.x,
    y: position.y,
    angle: body.getAngle()
  };
}

function posesAreFinite(poses: Pose[]): boolean {
  return poses.every(
    (pose) =>
      Number.isFinite(pose.x) &&
      Number.isFinite(pose.y) &&
      Number.isFinite(pose.angle)
  );
}
