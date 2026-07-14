/**
 * Pure single-elimination bracket math — no DB, no side effects.
 * The DB layer (lib/db.ts) uses these to lay out and advance matches.
 */

/** Smallest power of two >= n, floored at 2. */
export function bracketSize(n: number): number {
  let size = 2;
  while (size < n) size *= 2;
  return size;
}

export function totalRounds(size: number): number {
  return Math.log2(size);
}

/**
 * Standard seeding order for a bracket of `size` slots. Returns the seed
 * number (1..size) that belongs in each slot, so the top seed meets the
 * bottom seed, byes fall against the strongest seeds, etc.
 */
export function seedOrder(size: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < size) {
    const sum = seeds.length * 2 + 1;
    const next: number[] = [];
    for (const s of seeds) {
      next.push(s);
      next.push(sum - s);
    }
    seeds = next;
  }
  return seeds;
}

/** Human label for a round given how many rounds the bracket has. */
export function roundLabel(round: number, rounds: number): string {
  const fromEnd = rounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  return `Round ${round}`;
}

/**
 * Where a match's winner flows next. Match at (round, position) feeds
 * (round + 1, position >> 1), into the "a" slot when position is even,
 * "b" slot when odd.
 */
export function feeder(position: number): { pos: number; slot: "a" | "b" } {
  return { pos: position >> 1, slot: position % 2 === 0 ? "a" : "b" };
}
