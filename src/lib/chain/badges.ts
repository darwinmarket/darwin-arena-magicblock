// Badges, computed from what is on chain: the profile's counters and its recent
// match history (the last 8 duels, so history-based badges count recent play).
// No badge is granted by the client; each one is a pure function of chain data.
import type { Badge } from "../types";
import { SYMBOLS } from "./constants";
import { scoreToPct } from "./duel";
import { TIER_POINTS, TIER_ORDER } from "./rank";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawProfile = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawRecord = any;

export interface BadgeExtras {
  /// Trophies minted for winning baskets (on chain).
  trophies?: number;
  /// Result cards shared from this browser.
  shares?: number;
}

const n = (x: { toString(): string } | number) => Number(x.toString());
const WIN = 0;
const LOSS = 1;

/// Recent records, most recent first.
export function recentRecords(p: RawProfile | null): RawRecord[] {
  if (!p) return [];
  const len = n(p.historyLen);
  const head = n(p.historyHead);
  const out: RawRecord[] = [];
  for (let i = 0; i < len; i++) out.push(p.history[(head - i + p.history.length) % p.history.length]);
  return out;
}

const idx = (s: string) => SYMBOLS.indexOf(s);
const wins = (rs: RawRecord[]) => rs.filter((r) => r.result === WIN);
const weightOf = (r: RawRecord, ...syms: string[]) => syms.reduce((a, s) => a + (r.weights[idx(s)] ?? 0), 0);

interface Def {
  id: string;
  name: string;
  condition: string;
  goal: number;
  progress: (p: RawProfile, rs: RawRecord[], x: BadgeExtras) => number;
}

export const BADGE_DEFS: Def[] = [
  { id: "first-win", name: "First Win", condition: "Win your first duel", goal: 1, progress: (p) => n(p.wins) },
  { id: "survivor", name: "Survivor", condition: "Win 10 duels", goal: 10, progress: (p) => n(p.wins) },
  { id: "streak", name: "Unstoppable", condition: "10 win streak", goal: 10, progress: (p) => n(p.bestStreak) },
  { id: "veteran", name: "Veteran", condition: "Play 50 duels", goal: 50, progress: (p) => n(p.games) },
  { id: "grinder", name: "Grinder", condition: "Play 2 hours of duels (5 min each)", goal: 24, progress: (p) => n(p.games) },
  { id: "mutant", name: "Mutant", condition: "Win a duel through all 3 mutations", goal: 1, progress: (_p, rs) => wins(rs).filter((r) => r.mutations >= 3).length },
  { id: "diversifier", name: "Diversifier", condition: "Win with 5 assets", goal: 1, progress: (_p, rs) => wins(rs).filter((r) => r.weights.filter((w: number) => w > 0).length === 5).length },
  { id: "all-in", name: "Conviction", condition: "Win with one asset at 60% or more", goal: 1, progress: (_p, rs) => wins(rs).filter((r) => Math.max(...r.weights) >= 60).length },
  {
    id: "comeback",
    name: "Comeback",
    condition: "Win right after a defeat",
    goal: 1,
    progress: (_p, rs) => rs.filter((r, i) => r.result === WIN && rs[i + 1]?.result === LOSS).length,
  },
  {
    id: "revenger",
    name: "Revenger",
    condition: "Beat the player who last beat you",
    goal: 1,
    progress: (_p, rs) =>
      rs.filter((r, i) => r.result === WIN && rs.slice(i + 1).find((o) => o.opponent.equals(r.opponent))?.result === LOSS).length,
  },
  { id: "whale", name: "Whale", condition: "Win at the 20 USDC table", goal: 1, progress: (_p, rs) => wins(rs).filter((r) => n(r.stake) >= 20_000_000).length },
  { id: "rebalancer", name: "Rebalancer", condition: "Win a duel you rebalanced", goal: 1, progress: (_p, rs) => wins(rs).filter((r) => r.rebalances > 0).length },
  { id: "minter", name: "Minter", condition: "Mint a trophy of a winning basket", goal: 1, progress: (_p, _rs, x) => x.trophies ?? 0 },
  {
    id: "sniper",
    name: "Sniper",
    condition: "Win by less than 0.1%",
    goal: 1,
    progress: (_p, rs) => wins(rs).filter((r) => scoreToPct(n(r.myScore)) - scoreToPct(n(r.oppScore)) < 0.1).length,
  },
  { id: "early", name: "Early Adopter", condition: "Play during Season 1", goal: 1, progress: (p) => Math.min(1, n(p.games)) },
  { id: "diamond", name: "Diamond Hands", condition: "Win 5 recent duels without rebalancing", goal: 5, progress: (_p, rs) => wins(rs).filter((r) => r.rebalances === 0).length },
  { id: "sol-maxi", name: "SOL Maxi", condition: "Win with SOL at 50% or more", goal: 1, progress: (_p, rs) => wins(rs).filter((r) => weightOf(r, "SOL") >= 50).length },
  { id: "memelord", name: "Memelord", condition: "Win with BONK + WIF at 50% or more", goal: 1, progress: (_p, rs) => wins(rs).filter((r) => weightOf(r, "BONK", "WIF") >= 50).length },
  { id: "bluechip", name: "Bluechip", condition: "Win 5 recent duels with SOL + JUP at 70% or more", goal: 5, progress: (_p, rs) => wins(rs).filter((r) => weightOf(r, "SOL", "JUP") >= 70).length },
  { id: "flawless", name: "Flawless", condition: "5 wins in a row", goal: 5, progress: (p) => n(p.bestStreak) },
  {
    id: "night-owl",
    name: "Night Owl",
    condition: "Win 3 recent duels between midnight and 5 am",
    goal: 3,
    progress: (_p, rs) => wins(rs).filter((r) => new Date(n(r.ts) * 1000).getHours() < 5).length,
  },
  { id: "social", name: "Social", condition: "Share 10 result cards", goal: 10, progress: (_p, _rs, x) => x.shares ?? 0 },
  { id: "apex", name: "Apex", condition: "Win 50 duels", goal: 50, progress: (p) => n(p.wins) },
  { id: "darwinian", name: "Darwinian", condition: "Reach the Darwinian rank", goal: 1, progress: (p) => (n(p.points) >= TIER_POINTS * (TIER_ORDER.length - 1) ? 1 : 0) },
];

export function badgesFor(p: RawProfile | null, extras: BadgeExtras = {}): Badge[] {
  const rs = recentRecords(p);
  return BADGE_DEFS.map((d) => ({
    id: d.id,
    name: d.name,
    condition: d.condition,
    icon: "",
    goal: d.goal,
    progress: p ? Math.min(d.goal, d.progress(p, rs, extras)) : 0,
  }));
}

/// Up to four earned badges, rarest first, for a player's showcase.
export function autoShowcase(badges: Badge[], rarityRank: (id: string) => number): (string | null)[] {
  const earned = badges.filter((b) => b.progress >= b.goal).sort((a, b) => rarityRank(b.id) - rarityRank(a.id));
  const ids: (string | null)[] = earned.slice(0, 4).map((b) => b.id);
  while (ids.length < 4) ids.push(null);
  return ids;
}
