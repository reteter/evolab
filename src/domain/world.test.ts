import { describe, expect, it } from "vitest";
import { createTerrain, interpolateTerrainHeight } from "./world";

describe("World Generator", () => {
  it("tworzy ten sam świat dla tego samego seedu, profilu i trudności", () => {
    expect(createTerrain("world-17", "smooth", 3)).toEqual(createTerrain("world-17", "smooth", 3));
    expect(createTerrain("world-17", "steep-hills", 4)).toEqual(createTerrain("world-17", "steep-hills", 4));
    expect(createTerrain("world-17", "bumpy", 2)).toEqual(createTerrain("world-17", "bumpy", 2));
  });

  it("różnicuje świat profilem i trudnością", () => {
    const smooth = createTerrain("world-17", "smooth", 3);
    const steep = createTerrain("world-17", "steep-hills", 3);
    const bumpy = createTerrain("world-17", "bumpy", 3);
    const smoothHard = createTerrain("world-17", "smooth", 5);

    expect(smooth.points).not.toEqual(steep.points);
    expect(smooth.points).not.toEqual(bumpy.points);
    expect(smooth.points).not.toEqual(smoothHard.points);

    // bumpy ma krok 1 m, smooth i steep-hills krok 4 m
    expect(bumpy.points.length).toBeGreaterThan(smooth.points.length * 3);
    expect(smooth.points[1]!.x - smooth.points[0]!.x).toBe(4);
    expect(bumpy.points[1]!.x - bumpy.points[0]!.x).toBe(1);
    expect(smooth.endX).toBe(bumpy.endX);
  });

  it("zachowuje płaski start i właściwe ograniczenia wysokości", () => {
    for (const profile of ["smooth", "steep-hills", "bumpy"] as const) {
      for (const difficulty of [1, 3, 5]) {
        const terrain = createTerrain("world-17", profile, difficulty);
        expect(interpolateTerrainHeight(terrain.points, 0)).toBe(0);
        expect(interpolateTerrainHeight(terrain.points, 12)).toBe(0);
        expect(terrain.points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
        expect(terrain.points.every(({ y }) => y >= -5.0 && y <= 7.0)).toBe(true);
      }
    }
  });

  it("zachowuje dokładną wsteczną kompatybilność dla smooth z trudnością 3", () => {
    const terrain = createTerrain("world-17", "smooth", 3);
    expect(terrain.points.every(({ y }) => y >= -3.8 && y <= 5.4)).toBe(true);
    expect(terrain.points.length).toBe(220);
    expect(terrain.endX).toBe(856);
  });
});
