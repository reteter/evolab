import type {
  Genome,
  RunCheckpoint,
  RunConfig,
  SavedRun,
  VehicleGenes,
  WheelCountMode
} from "./indexed-db";
import { validateRunConfig } from "../domain/evolution";

export interface ExportPayload {
  version: 2;
  run: SavedRun;
}

export function exportRunToJson(run: SavedRun): string {
  const payload: ExportPayload = {
    version: 2,
    run: migrateSavedRun(run)
  };
  return JSON.stringify(payload, null, 2);
}

export function migrateGenes(oldGenes: any): VehicleGenes {
  if (typeof oldGenes?.wheelCount === "number" && typeof oldGenes?.wheel0Radius === "number") {
    return oldGenes as VehicleGenes;
  }

  const rearInset = oldGenes.rearInset ?? 0.6;
  const frontInset = oldGenes.frontInset ?? 0.6;
  const driveBalance = oldGenes.driveBalance ?? 0.5;
  const frontSpeedRatio = oldGenes.frontSpeedRatio ?? 1.0;

  const slot0 = {
    radius: oldGenes.rearWheelRadius ?? 0.5,
    mountX: -rearInset,
    density: oldGenes.rearWheelDensity ?? 1.0,
    grip: oldGenes.rearWheelGrip ?? 1.0,
    rideHeight: oldGenes.rearRideHeight ?? 0.2,
    springFrequency: oldGenes.rearSpringFrequency ?? 4.0,
    springDamping: oldGenes.rearSpringDamping ?? 0.6,
    driveShare: 1 - driveBalance,
    speedRatio: 1.0
  };

  const slot1 = {
    radius: oldGenes.frontWheelRadius ?? 0.5,
    mountX: frontInset,
    density: oldGenes.frontWheelDensity ?? 1.0,
    grip: oldGenes.frontWheelGrip ?? 1.0,
    rideHeight: oldGenes.frontRideHeight ?? 0.2,
    springFrequency: oldGenes.frontSpringFrequency ?? 4.0,
    springDamping: oldGenes.frontSpringDamping ?? 0.6,
    driveShare: driveBalance,
    speedRatio: frontSpeedRatio
  };

  const slot2 = {
    ...slot0,
    mountX: -0.2
  };

  const slot3 = {
    ...slot1,
    mountX: 0.2
  };

  return {
    width: oldGenes.width ?? 1.8,
    height: oldGenes.height ?? 0.8,
    roofScale: oldGenes.roofScale ?? 0.8,
    noseScale: oldGenes.noseScale ?? 1.0,
    tailScale: oldGenes.tailScale ?? 1.0,
    floorTilt: oldGenes.floorTilt ?? 0,
    roofOffset: oldGenes.roofOffset ?? 0,
    chassisDensity: oldGenes.chassisDensity ?? 1.0,
    ballastMass: oldGenes.ballastMass ?? 1.0,
    ballastOffset: oldGenes.ballastOffset ?? 0,
    motorSpeed: oldGenes.motorSpeed ?? 15,
    motorTorque: oldGenes.motorTorque ?? 60,

    wheelCount: 2,
    legacyAnchors: 1,

    wheel0Radius: slot0.radius,
    wheel0MountX: slot0.mountX,
    wheel0Density: slot0.density,
    wheel0Grip: slot0.grip,
    wheel0RideHeight: slot0.rideHeight,
    wheel0SpringFrequency: slot0.springFrequency,
    wheel0SpringDamping: slot0.springDamping,
    wheel0DriveShare: slot0.driveShare,
    wheel0SpeedRatio: slot0.speedRatio,

    wheel1Radius: slot1.radius,
    wheel1MountX: slot1.mountX,
    wheel1Density: slot1.density,
    wheel1Grip: slot1.grip,
    wheel1RideHeight: slot1.rideHeight,
    wheel1SpringFrequency: slot1.springFrequency,
    wheel1SpringDamping: slot1.springDamping,
    wheel1DriveShare: slot1.driveShare,
    wheel1SpeedRatio: slot1.speedRatio,

    wheel2Radius: slot2.radius,
    wheel2MountX: slot2.mountX,
    wheel2Density: slot2.density,
    wheel2Grip: slot2.grip,
    wheel2RideHeight: slot2.rideHeight,
    wheel2SpringFrequency: slot2.springFrequency,
    wheel2SpringDamping: slot2.springDamping,
    wheel2DriveShare: slot2.driveShare,
    wheel2SpeedRatio: slot2.speedRatio,

    wheel3Radius: slot3.radius,
    wheel3MountX: slot3.mountX,
    wheel3Density: slot3.density,
    wheel3Grip: slot3.grip,
    wheel3RideHeight: slot3.rideHeight,
    wheel3SpringFrequency: slot3.springFrequency,
    wheel3SpringDamping: slot3.springDamping,
    wheel3DriveShare: slot3.driveShare,
    wheel3SpeedRatio: slot3.speedRatio
  };
}

export function migrateGenome(genome: any): Genome {
  return {
    ...genome,
    genes: migrateGenes(genome.genes)
  };
}

export function migrateConfig(config: any): RunConfig {
  const wheelCountMode: WheelCountMode = config.wheelCountMode ?? "2";
  return {
    ...config,
    wheelCountMode
  };
}

export function migrateSavedRun(run: SavedRun): SavedRun {
  const cp = run.checkpoint;
  const migratedConfig = migrateConfig(cp.config);
  const migratedNextPopulation = (cp.nextPopulation || []).map(migrateGenome);
  let migratedBestRecord = cp.bestRecord;
  if (migratedBestRecord?.result?.genome) {
    migratedBestRecord = {
      ...migratedBestRecord,
      result: {
        ...migratedBestRecord.result,
        genome: migrateGenome(migratedBestRecord.result.genome)
      }
    };
  }

  const migratedManifest = {
    ...cp.manifest,
    config: migratedConfig
  };

  return {
    ...run,
    checkpoint: {
      ...cp,
      config: migratedConfig,
      manifest: migratedManifest,
      nextPopulation: migratedNextPopulation,
      bestRecord: migratedBestRecord
    }
  };
}

export function importRunFromJson(jsonText: string): SavedRun {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Plik nie jest poprawnym plikiem JSON.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Nieprawidłowa struktura pliku importu.");
  }

  const record = parsed as Record<string, unknown>;
  if (record.version !== 1 && record.version !== 2) {
    throw new Error(`Nieobsługiwana wersja pliku (${String(record.version)}). Oczekiwana wersja: 1 lub 2.`);
  }

  if (typeof record.run !== "object" || record.run === null) {
    throw new Error("Brak danych przebiegu (pole 'run') w pliku importu.");
  }

  const rawRun = record.run as SavedRun;
  if (typeof rawRun.name !== "string" || !rawRun.name.trim()) {
    throw new Error("Nieprawidłowa nazwa przebiegu w pliku.");
  }

  if (typeof rawRun.checkpoint !== "object" || rawRun.checkpoint === null) {
    throw new Error("Brak danych checkpointu w pliku.");
  }

  const migratedRun = migrateSavedRun(rawRun);
  const cp = migratedRun.checkpoint;

  if (typeof cp.completedGenerations !== "number" || !Array.isArray(cp.nextPopulation)) {
    throw new Error("Uszkodzony checkpoint w pliku importu.");
  }

  if (typeof cp.config !== "object" || cp.config === null) {
    throw new Error("Brak konfiguracji w checkpoincie.");
  }

  const issues = validateRunConfig(cp.config);
  if (issues.length > 0) {
    throw new Error(`Nieprawidłowa konfiguracja w pliku: ${issues[0]}`);
  }

  const newId = crypto.randomUUID();
  const rawName = rawRun.name.trim();
  const name = rawName.endsWith("(import)") ? rawName : `${rawName} (import)`;
  const now = Date.now();

  const importedRun: SavedRun = {
    id: newId,
    name,
    createdAt: typeof rawRun.createdAt === "number" ? rawRun.createdAt : now,
    updatedAt: now,
    checkpoint: {
      ...cp,
      updatedAt: now
    }
  };

  return importedRun;
}
