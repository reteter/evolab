import {
  TRIPLE_TRACK_PROFILES,
  type Genome,
  type RunMode,
  type Terrain,
  type TerrainProfile,
  type TrackTrialSummary,
  type TrialResult,
  type TrialSnapshot
} from "../domain/types";
import { createTerrain } from "../domain/world";
import { deriveSeed } from "../domain/rng";
import { calculateTrackProgress } from "../domain/evolution";
import type { SimulationExecutor } from "../simulation/simulation-executor";
import type { GarageVehicle } from "../storage/indexed-db";
import { browserScheduler, type RunScheduler } from "./run-controller";

export interface ArenaConfig {
  seed: string;
  difficulty: number;
}

export interface ArenaTrackResult {
  profile: TerrainProfile;
  result: TrialResult;
  progressPercent: number;
  terrain: Terrain;
}

export interface ArenaParticipantResult {
  vehicleId: string;
  name: string;
  genome: Genome;
  score: number; // 50% avg progress + 50% min progress
  averageSpeed: number;
  trackResults: ArenaTrackResult[];
}

export type ArenaStatus = "idle" | "running" | "paused" | "finished" | "stopped" | "replay";

export interface ArenaLiveVehicle {
  vehicleId: string;
  name: string;
  genome: Genome;
  snapshot: TrialSnapshot;
  distance: number;
  done: boolean;
}

export interface ArenaState {
  status: ArenaStatus;
  mode: RunMode;
  config: ArenaConfig | null;
  trackIndex: number; // 1, 2, 3
  currentProfile: TerrainProfile;
  terrain: Terrain | null;
  liveVehicles: ArenaLiveVehicle[];
  leaderVehicleId: string | null;
  results: ArenaParticipantResult[] | null;
  message: string;
}

export class ArenaController {
  private state: ArenaState = this.initialState();
  private readonly listeners = new Set<(state: ArenaState) => void>();
  private token = 0;
  private stopRequested = false;
  private paused = false;

  constructor(
    private readonly executor: SimulationExecutor,
    private readonly scheduler: RunScheduler = browserScheduler
  ) {}

  subscribe(listener: (state: ArenaState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): ArenaState {
    return this.state;
  }

  private initialState(): ArenaState {
    return {
      status: "idle",
      mode: "normal",
      config: null,
      trackIndex: 1,
      currentProfile: "smooth",
      terrain: null,
      liveVehicles: [],
      leaderVehicleId: null,
      results: null,
      message: "Arena gotowa do startu"
    };
  }

  setMode(mode: RunMode): void {
    this.state = {
      ...this.state,
      mode,
      message:
        mode === "normal"
          ? "Tempo: 1× (obserwuj)"
          : mode === "fast"
            ? "Tempo: 10× (szybko)"
            : "Tempo: ∞ (bez obrazu)"
    };
    this.executor.setMode(mode, this.token);
    this.emit();
  }

  pause(): Promise<void> | void {
    if (this.state.status !== "running") return;
    this.paused = true;
    this.state = { ...this.state, status: "paused", message: "Arena: pauza" };
    this.emit();
    return this.executor.pause(this.token);
  }

  resume(): void {
    if (this.state.status !== "paused") return;
    this.paused = false;
    this.executor.resume(this.token);
    this.state = { ...this.state, status: "running", message: "Arena: wznowiono zawody" };
    this.emit();
  }

  stop(): void {
    if (this.state.status === "idle" || this.state.status === "stopped") return;
    this.stopRequested = true;
    this.paused = false;
    this.executor.terminate();
    this.state = {
      ...this.state,
      status: "stopped",
      liveVehicles: [],
      message: "Zawody zostały przerwane"
    };
    this.emit();
  }

  async startTournament(vehicles: GarageVehicle[], config: ArenaConfig): Promise<void> {
    if (vehicles.length < 2 || vehicles.length > 4) {
      throw new Error("Arena wymaga wyboru od 2 do 4 pojazdów.");
    }

    const currentToken = ++this.token;
    this.stopRequested = false;
    this.paused = false;

    // Create unique genome wrappers per participant using vehicle.id
    // This ensures identical genome IDs from different runs don't collide in SimulationExecutor!
    const participantGenomes: { vehicleId: string; name: string; simGenome: Genome }[] = vehicles.map(
      (v) => ({
        vehicleId: v.id,
        name: v.name,
        simGenome: {
          ...v.genome,
          id: `arena-${v.id}`
        }
      })
    );

    const accumulatedResults = new Map<string, ArenaTrackResult[]>();
    for (const p of participantGenomes) {
      accumulatedResults.set(p.vehicleId, []);
    }

    this.state = {
      status: "running",
      mode: this.state.mode,
      config,
      trackIndex: 1,
      currentProfile: TRIPLE_TRACK_PROFILES[0]!,
      terrain: null,
      liveVehicles: [],
      leaderVehicleId: null,
      results: null,
      message: "Start zawodów na Arenie"
    };
    this.emit();

    for (let phase = 0; phase < TRIPLE_TRACK_PROFILES.length; phase++) {
      if (this.stopRequested || currentToken !== this.token) {
        break;
      }

      const profile = TRIPLE_TRACK_PROFILES[phase]!;
      // Seed derivation as required: deriveSeed(arenaSeed, "arena", "track", profile)
      const trackSeed = deriveSeed(config.seed, "arena", "track", profile);
      const trackTerrain = createTerrain(trackSeed, profile, config.difficulty);

      this.state = {
        ...this.state,
        trackIndex: phase + 1,
        currentProfile: profile,
        terrain: trackTerrain,
        liveVehicles: [],
        leaderVehicleId: null,
        message: `Trasa ${phase + 1}/3 (${this.profileLabel(profile)})`
      };
      this.emit();

      const phaseResults = await this.runPhase(
        participantGenomes,
        trackTerrain,
        currentToken,
        phase + 1
      );

      if (this.stopRequested || currentToken !== this.token || phaseResults.size !== participantGenomes.length) {
        break;
      }

      for (const [vehicleId, res] of phaseResults.entries()) {
        const progressPercent = calculateTrackProgress(res, trackTerrain);
        accumulatedResults.get(vehicleId)!.push({
          profile,
          result: res,
          progressPercent,
          terrain: trackTerrain
        });
      }

      await this.scheduler.nextTask();
    }

    if (this.stopRequested || currentToken !== this.token) {
      if (this.state.status !== "stopped") {
        this.state = {
          ...this.state,
          status: "stopped",
          message: "Zawody zostały przerwane"
        };
        this.emit();
      }
      return;
    }

    // Calculate final tournament results
    const finalResults: ArenaParticipantResult[] = participantGenomes.map((p) => {
      const tracks = accumulatedResults.get(p.vehicleId)!;
      const progresses = tracks.map((t) => t.progressPercent);
      const avgProgress = progresses.reduce((a, b) => a + b, 0) / (progresses.length || 1);
      const minProgress = Math.min(...progresses);
      const score = 0.5 * avgProgress + 0.5 * minProgress;

      const totalSpeed = tracks.reduce((sum, t) => sum + t.result.averageSpeed, 0);
      const averageSpeed = totalSpeed / (tracks.length || 1);

      return {
        vehicleId: p.vehicleId,
        name: p.name,
        genome: p.simGenome,
        score,
        averageSpeed,
        trackResults: tracks
      };
    });

    // Tie-breaking:
    // 1) score descending
    // 2) averageSpeed descending
    // 3) vehicleId ascending
    finalResults.sort((a, b) => {
      const diffScore = b.score - a.score;
      if (Math.abs(diffScore) > 1e-9) return diffScore;
      const diffSpeed = b.averageSpeed - a.averageSpeed;
      if (Math.abs(diffSpeed) > 1e-9) return diffSpeed;
      return a.vehicleId.localeCompare(b.vehicleId);
    });

    this.state = {
      ...this.state,
      status: "finished",
      results: finalResults,
      liveVehicles: [],
      message: `Zawody zakończone! Zwycięzca: ${finalResults[0]?.name ?? "—"}`
    };
    this.emit();
  }

  private async runPhase(
    participants: { vehicleId: string; name: string; simGenome: Genome }[],
    terrain: Terrain,
    currentToken: number,
    phaseNumber: number
  ): Promise<Map<string, TrialResult>> {
    const resultsMap = new Map<string, TrialResult>();
    const liveMap = new Map<string, ArenaLiveVehicle>();
    let lastEmitTime = 0;

    const pByGenomeId = new Map<string, { vehicleId: string; name: string; simGenome: Genome }>();
    for (const p of participants) {
      pByGenomeId.set(p.simGenome.id, p);
    }

    const publish = (force = false) => {
      if (currentToken !== this.token || this.stopRequested) return;
      const now = this.scheduler.now();
      const mode = this.state.mode;

      if (!force) {
        if (mode === "headless" && now - lastEmitTime < 200) return;
        if (mode !== "headless" && now - lastEmitTime < 15) return;
      }
      lastEmitTime = now;

      const liveVehicles = Array.from(liveMap.values());
      const leader = liveVehicles.reduce<ArenaLiveVehicle | null>(
        (best, cur) => (best === null || cur.distance > best.distance ? cur : best),
        null
      );

      this.state = {
        ...this.state,
        liveVehicles,
        leaderVehicleId: leader?.vehicleId ?? null,
        message: `Trasa ${phaseNumber}/3 (${this.profileLabel(terrain.profile)}) · ${resultsMap.size}/${participants.length} ukończyło`
      };
      this.emit();
    };

    const observer = {
      onSnapshot: (simGenome: Genome, snapshot: TrialSnapshot, distance: number) => {
        if (currentToken !== this.token || this.stopRequested) return;
        const p = pByGenomeId.get(simGenome.id);
        if (!p) return;
        liveMap.set(p.vehicleId, {
          vehicleId: p.vehicleId,
          name: p.name,
          genome: p.simGenome,
          snapshot,
          distance,
          done: false
        });
        publish();
      },
      onResult: (result: TrialResult) => {
        if (currentToken !== this.token || this.stopRequested) return;
        const p = pByGenomeId.get(result.genome.id);
        if (!p) return;
        resultsMap.set(p.vehicleId, result);
        const existing = liveMap.get(p.vehicleId);
        if (existing) {
          existing.done = true;
          existing.distance = result.maxDistance;
        }
        publish(true);
      }
    };

    await this.executor.evaluatePopulation({
      population: participants.map((p) => p.simGenome),
      terrain,
      generation: phaseNumber,
      mode: this.state.mode,
      runToken: currentToken,
      observer,
      shouldStop: () => this.stopRequested || currentToken !== this.token,
      isPaused: () => this.paused || this.state.status === "paused"
    });

    return resultsMap;
  }

  private profileLabel(profile: TerrainProfile): string {
    switch (profile) {
      case "smooth":
        return "Łagodny";
      case "steep-hills":
        return "Strome wzgórza";
      case "bumpy":
        return "Wyboisty";
    }
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
