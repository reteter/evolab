import type { SavedRun } from "./indexed-db";
import { validateRunConfig } from "../domain/evolution";

export interface ExportPayload {
  version: 1;
  run: SavedRun;
}

export function exportRunToJson(run: SavedRun): string {
  const payload: ExportPayload = {
    version: 1,
    run
  };
  return JSON.stringify(payload, null, 2);
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
  if (record.version !== 1) {
    throw new Error(`Nieobsługiwana wersja pliku (${String(record.version)}). Oczekiwana wersja: 1.`);
  }

  if (typeof record.run !== "object" || record.run === null) {
    throw new Error("Brak danych przebiegu (pole 'run') w pliku importu.");
  }

  const runObj = record.run as Record<string, unknown>;
  if (typeof runObj.name !== "string" || !runObj.name.trim()) {
    throw new Error("Nieprawidłowa nazwa przebiegu w pliku.");
  }

  if (typeof runObj.checkpoint !== "object" || runObj.checkpoint === null) {
    throw new Error("Brak danych checkpointu w pliku.");
  }

  const cp = runObj.checkpoint as Record<string, unknown>;
  if (typeof cp.completedGenerations !== "number" || !Array.isArray(cp.nextPopulation)) {
    throw new Error("Uszkodzony checkpoint w pliku importu.");
  }

  if (typeof cp.config !== "object" || cp.config === null) {
    throw new Error("Brak konfiguracji w checkpoincie.");
  }

  const issues = validateRunConfig(cp.config as any);
  if (issues.length > 0) {
    throw new Error(`Nieprawidłowa konfiguracja w pliku: ${issues[0]}`);
  }

  // Create clean imported run with new UUID and appended name
  const newId = crypto.randomUUID();
  const rawName = runObj.name.trim();
  const name = rawName.endsWith("(import)") ? rawName : `${rawName} (import)`;
  const now = Date.now();

  const importedRun: SavedRun = {
    id: newId,
    name,
    createdAt: typeof runObj.createdAt === "number" ? runObj.createdAt : now,
    updatedAt: now,
    checkpoint: {
      completedGenerations: cp.completedGenerations,
      nextPopulation: cp.nextPopulation as any,
      history: Array.isArray(cp.history) ? (cp.history as any) : [],
      samplingStride: typeof cp.samplingStride === "number" ? cp.samplingStride : 1,
      bestRecord: (cp.bestRecord as any) ?? null,
      config: cp.config as any,
      manifest: cp.manifest as any,
      updatedAt: now
    }
  };

  return importedRun;
}
