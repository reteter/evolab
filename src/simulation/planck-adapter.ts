import {
  Circle,
  Edge,
  Polygon,
  WheelJoint,
  Vec2,
  World,
  type Body
} from "planck";
import { buildPhenotype } from "../domain/phenotype";
import type { Genome, Pose, Terrain, TrialSnapshot } from "../domain/types";
import type { SimulationPort, TrialWorld } from "./simulation-port";

const GRAVITY = -9.81;
const GROUND_FRICTION = 1.15;

export class PlanckSimulationAdapter implements SimulationPort {
  readonly id = "planck";
  readonly label = "Planck.js 1.5.0";

  createTrial(genome: Genome, terrain: Terrain): TrialWorld {
    return new PlanckTrialWorld(genome, terrain);
  }
}

class PlanckTrialWorld implements TrialWorld {
  private readonly world: World;
  private readonly chassis: Body;
  private readonly rearWheel: Body;
  private readonly frontWheel: Body;
  private tick = 0;
  private disposed = false;

  constructor(genome: Genome, terrain: Terrain) {
    this.world = new World({
      gravity: Vec2(0, GRAVITY),
      allowSleep: false,
      continuousPhysics: true
    });
    this.createGround(terrain);

    const phenotype = buildPhenotype(genome);
    const genes = genome.genes;
    const underbodyClearance = Math.max(
      -phenotype.rearWheelCenter.y + phenotype.rearWheelRadius,
      -phenotype.frontWheelCenter.y + phenotype.frontWheelRadius
    );
    const startY = terrain.startY + underbodyClearance + 0.32;

    this.chassis = this.world.createBody({
      type: "dynamic",
      position: Vec2(0, startY),
      linearDamping: 0.08,
      angularDamping: 0.1,
      allowSleep: false
    });
    this.chassis.createFixture(
      new Polygon(phenotype.vertices.map(({ x, y }) => Vec2(x, y))),
      {
        density: genes.chassisDensity,
        friction: 1.05,
        restitution: 0.02,
        filterGroupIndex: -1
      }
    );

    this.chassis.createFixture(
      new Circle(Vec2(phenotype.ballastCenter.x, phenotype.ballastCenter.y), phenotype.ballastRadius),
      {
        density: genes.ballastMass / (Math.PI * phenotype.ballastRadius ** 2),
        filterMaskBits: 0
      }
    );

    this.rearWheel = this.createWheel(
      phenotype.rearWheelCenter.x,
      startY + phenotype.rearWheelCenter.y,
      phenotype.rearWheelRadius,
      genes.rearWheelDensity,
      genes.rearWheelGrip
    );
    this.frontWheel = this.createWheel(
      phenotype.frontWheelCenter.x,
      startY + phenotype.frontWheelCenter.y,
      phenotype.frontWheelRadius,
      genes.frontWheelDensity,
      genes.frontWheelGrip
    );

    this.createMotor(
      phenotype.rearWheelCenter,
      this.rearWheel,
      phenotype.motorSpeed,
      phenotype.motorTorque * 2 * (1 - genes.driveBalance),
      genes.rearSpringFrequency,
      genes.rearSpringDamping
    );
    this.createMotor(
      phenotype.frontWheelCenter,
      this.frontWheel,
      phenotype.motorSpeed * genes.frontSpeedRatio,
      phenotype.motorTorque * 2 * genes.driveBalance,
      genes.frontSpringFrequency,
      genes.frontSpringDamping
    );
  }

  step(fixedDeltaSeconds: number): TrialSnapshot {
    if (this.disposed) {
      throw new Error("Próba została już zwolniona.");
    }
    this.world.step(fixedDeltaSeconds, 8, 3);
    this.tick += 1;
    return this.snapshot();
  }

  snapshot(): TrialSnapshot {
    const chassis = bodyPose(this.chassis);
    const rearWheel = bodyPose(this.rearWheel);
    const frontWheel = bodyPose(this.frontWheel);
    return {
      tick: this.tick,
      chassis,
      wheels: [rearWheel, frontWheel],
      finite: posesAreFinite([chassis, rearWheel, frontWheel])
    };
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.world.destroyBody(this.rearWheel);
    this.world.destroyBody(this.frontWheel);
    this.world.destroyBody(this.chassis);
  }

  private createGround(terrain: Terrain): void {
    const ground = this.world.createBody();
    for (let index = 0; index < terrain.points.length - 1; index += 1) {
      const first = terrain.points[index];
      const second = terrain.points[index + 1];
      if (first === undefined || second === undefined) {
        continue;
      }
      ground.createFixture(
        new Edge(Vec2(first.x, first.y), Vec2(second.x, second.y)),
        {
          friction: GROUND_FRICTION,
          restitution: 0
        }
      );
    }
  }

  private createWheel(x: number, y: number, radius: number, density: number, friction: number): Body {
    const body = this.world.createBody({
      type: "dynamic",
      position: Vec2(x, y),
      linearDamping: 0.025,
      angularDamping: 0.025,
      allowSleep: false,
      bullet: true
    });
    body.createFixture(new Circle(radius), {
      density,
      friction,
      restitution: 0.02,
      filterGroupIndex: -1
    });
    return body;
  }

  private createMotor(
    anchor: { x: number; y: number },
    wheel: Body,
    speed: number,
    torque: number,
    frequency: number,
    damping: number
  ): void {
    const worldAnchor = this.chassis.getWorldPoint(Vec2(anchor.x, anchor.y));
    this.world.createJoint(
      new WheelJoint(
        {
          enableMotor: true,
          motorSpeed: -speed,
          maxMotorTorque: torque,
          frequencyHz: frequency,
          dampingRatio: damping,
          collideConnected: false
        },
        this.chassis,
        wheel,
        worldAnchor,
        Vec2(0, 1)
      )
    );
  }
}

function bodyPose(body: Body): Pose {
  const position = body.getPosition();
  return {
    x: position.x,
    y: position.y,
    angle: body.getAngle()
  };
}

function posesAreFinite(poses: readonly Pose[]): boolean {
  return poses.every(
    ({ x, y, angle }) =>
      Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(angle)
  );
}
