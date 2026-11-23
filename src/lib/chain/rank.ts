// Rank points (on chain: +20 per win, -16 per loss, floored at 0) to the
// front's tiers and divisions. Each tier spans three divisions of 40 points;
// Darwinian has no division.
import type { Division, Rank, RankTier } from "../types";

export const TIER_ORDER: RankTier[] = ["Cell", "Fish", "Amphibian", "Reptile", "Mammal", "Primate", "Apex", "Darwinian"];
export const DIVISION_POINTS = 40;
export const TIER_POINTS = DIVISION_POINTS * 3;

export function rankFromPoints(points: number): Rank {
  const t = Math.floor(points / TIER_POINTS);
  if (t >= TIER_ORDER.length - 1) return { tier: "Darwinian", division: null, points };
  const d = Math.floor((points % TIER_POINTS) / DIVISION_POINTS);
  const division: Division = (["III", "II", "I"] as const)[d];
  return { tier: TIER_ORDER[t], division, points };
}

/// Point range of the current division (for the progression bar).
export function progression(points: number): { from: number; to: number } {
  const darwinian = TIER_POINTS * (TIER_ORDER.length - 1);
  if (points >= darwinian) return { from: darwinian, to: darwinian + TIER_POINTS };
  const from = Math.floor(points / DIVISION_POINTS) * DIVISION_POINTS;
  return { from, to: from + DIVISION_POINTS };
}
