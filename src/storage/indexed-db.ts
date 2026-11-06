import type {
  BestRecord,
  GenerationSummary,
  Genome,
  RunConfig,
  RunManifest,
  VehicleGenes,
  WheelCountMode
} from "../domain/types";
import { migrateSavedRun } from "./export-import";

export type { Genome, RunConfig, VehicleGenes, WheelCountMode };

export interface RunCheckpoint {
  completedGenerations: number;
  nextPopulation: Genome[];
  history: GenerationSummary[];
  samplingStride: number;
  bestRecord: BestRecord | null;
  config: RunConfig;
  manifest: RunManifest;
  updatedAt: number;
}

export interface GarageVehicleSourceRun {
  runId?: string;
  seed: string;
  generation: number;
  trainingMode: "single" | "triple";
  buildId?: string;
}

export interface GarageVehicle {
  id: string;
  name: string;
  createdAt: number;
  updatedAt?: number;
  sourceRun: GarageVehicleSourceRun;
  genome: Genome;
}

export interface SavedRun {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  checkpoint: RunCheckpoint;
}

export interface StoragePort {
  saveRun(run: SavedRun): Promise<void>;
  getRun(id: string): Promise<SavedRun | undefined>;
  listRuns(): Promise<SavedRun[]>;
  deleteRun(id: string): Promise<void>;
  renameRun(id: string, newName: string): Promise<void>;
  getLastActiveRunId(): Promise<string | null>;
  setLastActiveRunId(id: string): Promise<void>;

  saveVehicle(vehicle: GarageVehicle): Promise<void>;
  getVehicle(id: string): Promise<GarageVehicle | undefined>;
  listVehicles(): Promise<GarageVehicle[]>;
  deleteVehicle(id: string): Promise<void>;
  renameVehicle(id: string, newName: string): Promise<void>;
}

const DB_NAME = "evolution_lab_db";
const DB_VERSION = 2;
const RUNS_STORE = "runs";
const GARAGE_STORE = "garage";
const META_STORE = "meta";
const LAST_ACTIVE_KEY = "lastActiveRunId";

export class IndexedDbStorage implements StoragePort {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB is not supported in this environment"));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(RUNS_STORE)) {
          db.createObjectStore(RUNS_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(GARAGE_STORE)) {
          db.createObjectStore(GARAGE_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  async saveRun(run: SavedRun): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(RUNS_STORE, "readwrite");
      const store = tx.objectStore(RUNS_STORE);
      store.put(run);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
    });
  }

  async getRun(id: string): Promise<SavedRun | undefined> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(RUNS_STORE, "readonly");
      const store = tx.objectStore(RUNS_STORE);
      const req = store.get(id);

      req.onsuccess = () => {
        const result = req.result as SavedRun | undefined;
        resolve(result ? migrateSavedRun(result) : undefined);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async listRuns(): Promise<SavedRun[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(RUNS_STORE, "readonly");
      const store = tx.objectStore(RUNS_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const rawRuns = (req.result as SavedRun[]) || [];
        const runs = rawRuns.map((r) => migrateSavedRun(r));
        runs.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(runs);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteRun(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([RUNS_STORE, META_STORE], "readwrite");
      const runsStore = tx.objectStore(RUNS_STORE);
      runsStore.delete(id);

      const metaStore = tx.objectStore(META_STORE);
      const lastReq = metaStore.get(LAST_ACTIVE_KEY);
      lastReq.onsuccess = () => {
        if (lastReq.result === id) {
          metaStore.delete(LAST_ACTIVE_KEY);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async renameRun(id: string, newName: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(RUNS_STORE, "readwrite");
      const store = tx.objectStore(RUNS_STORE);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const record = getReq.result as SavedRun | undefined;
        if (record) {
          record.name = newName;
          record.updatedAt = Date.now();
          store.put(record);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getLastActiveRunId(): Promise<string | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, "readonly");
      const store = tx.objectStore(META_STORE);
      const req = store.get(LAST_ACTIVE_KEY);

      req.onsuccess = () => resolve((req.result as string) || null);
      req.onerror = () => reject(req.error);
    });
  }

  async setLastActiveRunId(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, "readwrite");
      const store = tx.objectStore(META_STORE);
      store.put(id, LAST_ACTIVE_KEY);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async saveVehicle(vehicle: GarageVehicle): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GARAGE_STORE, "readwrite");
      const store = tx.objectStore(GARAGE_STORE);
      store.put(vehicle);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
    });
  }

  async getVehicle(id: string): Promise<GarageVehicle | undefined> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GARAGE_STORE, "readonly");
      const store = tx.objectStore(GARAGE_STORE);
      const req = store.get(id);

      req.onsuccess = () => {
        const result = req.result as GarageVehicle | undefined;
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async listVehicles(): Promise<GarageVehicle[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GARAGE_STORE, "readonly");
      const store = tx.objectStore(GARAGE_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const vehicles = (req.result as GarageVehicle[]) || [];
        vehicles.sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt));
        resolve(vehicles);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteVehicle(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GARAGE_STORE, "readwrite");
      const store = tx.objectStore(GARAGE_STORE);
      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async renameVehicle(id: string, newName: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GARAGE_STORE, "readwrite");
      const store = tx.objectStore(GARAGE_STORE);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const record = getReq.result as GarageVehicle | undefined;
        if (record) {
          record.name = newName;
          record.updatedAt = Date.now();
          store.put(record);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
