// A small seeded random number generator (mulberry32), so the synthetic
// organization is the same on every load and in every test.
export interface Random {
  readonly next: () => number;
  readonly between: (min: number, max: number) => number;
  readonly integer: (min: number, max: number) => number;
  readonly chance: (probability: number) => boolean;
}

export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const between = (min: number, max: number) => min + next() * (max - min);
  return {
    next,
    between,
    integer: (min, max) => Math.floor(between(min, max + 1)),
    chance: (probability) => next() < probability,
  };
}
