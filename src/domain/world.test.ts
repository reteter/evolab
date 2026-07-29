import { describe, expect, it } from "vitest";
import { createTerrain, interpolateTerrainHeight } from "./world";

describe("World Generator", () => {
  it("tworzy ten sam świat dla tego samego seedu", () => {
    expect(createTerrain("world-17")).toEqual(createTerrain("world-17"));
  });

  it("różnicuje świat innym seedem i zachowuje płaski start", () => {
    const first = createTerrain("world-17");
    const second = createTerrain("world-18");

    expect(first.points).not.toEqual(second.points);
    expect(interpolateTerrainHeight(first.points, 0)).toBe(0);
    expect(first.points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(
      true
    );
    expect(first.endX).toBeGreaterThan(800);
  });
});
