export type RandomSource = () => number;

export function createRng(seedText: string): RandomSource {
  let state = hashString(seedText);

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function deriveSeed(seed: string, ...domain: Array<string | number>): string {
  return [seed, ...domain].join("|");
}

export function hashString(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function randomBetween(
  random: RandomSource,
  minimum: number,
  maximum: number
): number {
  return minimum + random() * (maximum - minimum);
}
