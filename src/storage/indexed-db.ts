import type {
  BestRecord,
  GenerationSummary,
  Genome,
  RunConfig,
  RunManifest
} from "../domain/types";

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
}

const DB_NAME = "evolution_lab_db";
const DB_VERSION = 1;
const RUNS_STORE = "runs";
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

      req.onsuccess = () => resolve(req.result as SavedRun | undefined);
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
        const runs = (req.result as SavedRun[]) || [];
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
}
