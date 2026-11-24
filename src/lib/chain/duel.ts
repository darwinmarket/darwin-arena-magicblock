// Baskets, commitments and a readable view of the on-chain Duel account.
import { sha256 } from "@noble/hashes/sha2";
import { PublicKey } from "@solana/web3.js";
import { ASSETS, KIND, MUT, SCORE_PER_PCT, SYMBOLS } from "./constants";

export interface Leg {
  symbol: string;
  weight: number;
}

/// Basket legs -> the on-chain weights array (one entry per asset, % or 0).
export function toWeights(legs: Leg[]): number[] {
  const w = new Array(ASSETS.length).fill(0);
  for (const l of legs) {
    const i = SYMBOLS.indexOf(l.symbol);
    if (i < 0) throw new Error(`unknown asset ${l.symbol}`);
    w[i] += l.weight;
  }
  return w;
}

export function toLegs(weights: ArrayLike<number>): Leg[] {
  const legs: Leg[] = [];
  for (let i = 0; i < ASSETS.length; i++) if (weights[i] > 0) legs.push({ symbol: SYMBOLS[i], weight: weights[i] });
  return legs;
}

/// sha256(duel || player || weights || salt): what goes on chain during the draft.
export function commitment(duel: PublicKey, player: PublicKey, weights: number[], salt: Uint8Array): Uint8Array {
  const buf = new Uint8Array(32 + 32 + ASSETS.length + 32);
  buf.set(duel.toBytes(), 0);
  buf.set(player.toBytes(), 32);
  buf.set(Uint8Array.from(weights), 64);
  buf.set(salt, 64 + ASSETS.length);
  return sha256(buf);
}

export function randomSalt(): Uint8Array {
  const s = new Uint8Array(32);
  crypto.getRandomValues(s);
  return s;
}

export const scoreToPct = (s: number | bigint) => Number(s) / SCORE_PER_PCT;

export type MutationKind = "DOUBLE" | "FREEZE" | "SWAP";
export const KIND_NAMES: MutationKind[] = ["DOUBLE", "FREEZE", "SWAP"];

export interface MutationView {
  index: number;
  state: "hidden" | "drawing" | "applied";
  kind?: MutationKind;
  at: number;
  symbol?: string;
  /// SWAP: the asset leaving player 1's basket.
  other?: string;
  label?: string;
}

export interface DuelView {
  id: number;
  tier: number;
  stake: number; // USDC
  players: [PublicKey, PublicKey | null];
  status: number;
  createdTs: number;
  draftDeadline: number;
  committed: [boolean, boolean];
  session: [PublicKey, PublicKey];
  revealed: [boolean, boolean];
  revealDeadline: number;
  weights: [number[], number[]];
  startWeights: [number[], number[]];
  startTs: number;
  lastTickTs: number;
  endTs: number;
  startPrice: bigint[];
  lastPrice: bigint[];
  /// % move of each asset since the duel started.
  moves: Record<string, number>;
  score: [number, number]; // %
  mult: number[];
  frozen: string | null;
  frozenUntil: number;
  mutations: MutationView[];
  rebalancesLeft: [number, number];
  ticks: number;
  winner: number;
  forfeit: boolean;
}

const MUT_AT = [15, 30, 45];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function duelView(d: any): DuelView {
  const n = (x: { toNumber?: () => number } | number) => (typeof x === "number" ? x : Number(x.toString()));
  const startPrice = (d.startPrice as { toString(): string }[]).map((x) => BigInt(x.toString()));
  const lastPrice = (d.lastPrice as { toString(): string }[]).map((x) => BigInt(x.toString()));
  const moves: Record<string, number> = {};
  SYMBOLS.forEach((s, i) => {
    moves[s] = startPrice[i] > 0n ? (Number(lastPrice[i] - startPrice[i]) / Number(startPrice[i])) * 100 : 0;
  });
  const zero = (c: number[]) => c.every((b) => b === 0);
  const p1 = d.players[1] as PublicKey;
  const mutations: MutationView[] = (d.mutations as { state: number; kind: number; a: number; b: number; at: { toString(): string } }[]).map(
    (m, i) => {
      if (m.state === MUT.APPLIED) {
        const kind = KIND_NAMES[m.kind];
        const symbol = SYMBOLS[m.a];
        const other = m.kind === KIND.SWAP ? SYMBOLS[m.b] : undefined;
        const label =
          m.kind === KIND.DOUBLE
            ? `${symbol} weight x2`
            : m.kind === KIND.FREEZE
              ? `${symbol} frozen for 30s`
              : symbol === other
                ? `Swap fizzles: both hold ${symbol}`
                : `Swap: ${symbol} <-> ${other}`;
        return { index: i, state: "applied", kind, at: Number(m.at.toString()), symbol, other, label };
      }
      return { index: i, state: m.state === MUT.REQUESTED ? "drawing" : "hidden", at: MUT_AT[i] };
    },
  );
  return {
    id: n(d.id),
    tier: d.tier,
    stake: n(d.stake) / 1e6,
    players: [d.players[0], p1.equals(PublicKey.default) ? null : p1],
    status: d.status,
    createdTs: n(d.createdTs),
    draftDeadline: n(d.draftDeadline),
    committed: [!zero(d.commits[0]), !zero(d.commits[1])],
    session: d.session,
    revealed: d.revealed,
    revealDeadline: n(d.revealDeadline),
    weights: [Array.from(d.weights[0]), Array.from(d.weights[1])],
    startWeights: [Array.from(d.startWeights[0]), Array.from(d.startWeights[1])],
    startTs: n(d.startTs),
    lastTickTs: n(d.lastTickTs),
    endTs: n(d.endTs),
    startPrice,
    lastPrice,
    moves,
    score: [scoreToPct(n(d.score[0])), scoreToPct(n(d.score[1]))],
    mult: Array.from(d.mult),
    frozen: d.frozenAsset !== 255 && n(d.frozenUntil) > 0 ? SYMBOLS[d.frozenAsset] : null,
    frozenUntil: n(d.frozenUntil),
    mutations,
    rebalancesLeft: d.rebalancesLeft,
    ticks: d.ticks,
    winner: d.winner,
    forfeit: d.forfeit,
  };
}
