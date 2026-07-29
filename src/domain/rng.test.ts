import { describe, expect, it } from "vitest";
import { createRng, deriveSeed } from "./rng";

describe("RNG", () => {
  it("powtarza sekwencję dla tego samego seedu i domeny", () => {
    const first = createRng(deriveSeed("seed-1", "mutation", 3, 7));
    const second = createRng(deriveSeed("seed-1", "mutation", 3, 7));

    expect(Array.from({ length: 20 }, first)).toEqual(
      Array.from({ length: 20 }, second)
    );
  });

  it("izoluje domeny losowości", () => {
    const world = createRng(deriveSeed("seed-1", "world"));
    const mutation = createRng(deriveSeed("seed-1", "mutation"));

    expect(Array.from({ length: 4 }, world)).not.toEqual(
      Array.from({ length: 4 }, mutation)
    );
  });
});
