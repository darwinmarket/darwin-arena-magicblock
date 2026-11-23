// On-chain Profile -> the front's Player / Stats / Match shapes.
import { PublicKey } from "@solana/web3.js";
import type { Match, Player, Stats } from "../types";
import { HISTORY_RESULTS } from "./labels";
import { scoreToPct, toLegs } from "./duel";
import { BADGE_ART } from "../../components/game/emblems";
import { autoShowcase, badgesFor } from "./badges";
import { rankFromPoints } from "./rank";

const RARITY_ORDER = ["common", "rare", "epic", "legendary", "mythic"];
export const rarityRank = (id: string) => RARITY_ORDER.indexOf(BADGE_ART[id]?.rarity ?? "common");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawProfile = any;

const num = (x: { toString(): string } | number) => Number(x.toString());
const decodeName = (bytes: number[]) => new TextDecoder().decode(Uint8Array.from(bytes)).replace(/\0+$/, "");
export const shortKey = (k: PublicKey) => `${k.toBase58().slice(0, 4)}…${k.toBase58().slice(-4)}`;

const BANNER_BY_TIER = ["grey", "teal", "red", "purple"];

export function playerFromProfile(authority: PublicKey, p: RawProfile | null, fallbackName?: string): Player {
  const points = p ? num(p.points) : 0;
  const rank = rankFromPoints(points);
  const name = (p && decodeName(p.name)) || fallbackName || shortKey(authority);
  // A stable banner colour per wallet until the player picks one.
  const color = BANNER_BY_TIER[authority.toBytes()[0] % BANNER_BY_TIER.length];
  return {
    id: authority.toBase58(),
    name,
    avatar: "",
    rank,
    bannerId: `${rank.tier}-${color}`,
    // The four rarest badges this profile has earned on chain.
    showcase: autoShowcase(badgesFor(p), rarityRank),
  };
}

export function statsFromProfile(p: RawProfile | null): Stats {
  if (!p) return { wins: 0, losses: 0, survived: 0, extinct: 0, winrate: 0, streak: 0, avgReturn: 0, bestBasket: 0 };
  const games = num(p.games);
  const wins = num(p.wins);
  return {
    wins,
    losses: num(p.losses),
    survived: num(p.mutationsSurvived),
    extinct: num(p.losses),
    winrate: games ? Math.round((wins / games) * 100) : 0,
    streak: Math.max(0, num(p.streak)),
    avgReturn: games ? scoreToPct(num(p.sumScore)) / games : 0,
    bestBasket: games ? scoreToPct(num(p.bestScore)) : 0,
  };
}

/// The ring buffer of the last matches, most recent first.
export function matchesFromProfile(p: RawProfile | null): Match[] {
  if (!p) return [];
  const len = num(p.historyLen);
  const head = num(p.historyHead);
  const out: Match[] = [];
  for (let i = 0; i < len; i++) {
    const r = p.history[(head - i + p.history.length) % p.history.length];
    const ts = num(r.ts);
    out.push({
      id: (r.duel as PublicKey).toBase58(),
      result: HISTORY_RESULTS[r.result] ?? "DRAW",
      myScore: scoreToPct(num(r.myScore)),
      oppScore: scoreToPct(num(r.oppScore)),
      stake: num(r.stake) / 1e6,
      date: new Date(ts * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase(),
      opponent: decodeName(r.opponentName) || shortKey(r.opponent),
      basket: toLegs(r.weights),
    });
  }
  return out;
}
