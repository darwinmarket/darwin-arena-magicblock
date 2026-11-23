// The browser-held MagicBlock session key.
//
// One wallet approval (bundled with the stake) authorises this key through a
// `SessionTokenV2`; from then on it commits the basket on Solana and signs every
// rollup transaction (reveal, rebalance, start, mutation triggers). Wallets will
// not sign rollup transactions at all, so this is not just convenience.
//
// Stored in localStorage per wallet. It can only act on this program's duels for
// its own wallet, never move tokens, and expires (default 6 h).
import { Keypair, PublicKey } from "@solana/web3.js";

export const SESSION_HOURS = 6;
/// What the wallet tops the session key up with: fees for the commit and the
/// rent the delegation program takes when the duel is handed to the ER.
export const SESSION_TOP_UP_SOL = 0.02;

interface Stored {
  secret: number[];
  validUntil: number;
}

const key = (wallet: PublicKey) => `darwin-arena:session:${wallet.toBase58()}`;

export function loadSession(wallet: PublicKey): { keypair: Keypair; validUntil: number } | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(key(wallet));
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Stored;
    return { keypair: Keypair.fromSecretKey(Uint8Array.from(s.secret)), validUntil: s.validUntil };
  } catch {
    return null;
  }
}

export function saveSession(wallet: PublicKey, keypair: Keypair, validUntil: number) {
  localStorage.setItem(key(wallet), JSON.stringify({ secret: Array.from(keypair.secretKey), validUntil } satisfies Stored));
}

/// The committed basket and its salt, kept until the reveal on the rollup.
export interface StoredBasket {
  weights: number[];
  salt: number[];
}
const basketKey = (wallet: PublicKey, duelId: number) => `darwin-arena:basket:${wallet.toBase58()}:${duelId}`;

export function saveBasket(wallet: PublicKey, duelId: number, b: StoredBasket) {
  localStorage.setItem(basketKey(wallet, duelId), JSON.stringify(b));
}
export function loadBasket(wallet: PublicKey, duelId: number): StoredBasket | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(basketKey(wallet, duelId));
  return raw ? (JSON.parse(raw) as StoredBasket) : null;
}

const currentKey = (wallet: PublicKey) => `darwin-arena:current:${wallet.toBase58()}`;
export const saveCurrentDuel = (wallet: PublicKey, id: number | null) =>
  id === null ? localStorage.removeItem(currentKey(wallet)) : localStorage.setItem(currentKey(wallet), String(id));
export const loadCurrentDuel = (wallet: PublicKey): number | null => {
  if (typeof localStorage === "undefined") return null;
  const v = localStorage.getItem(currentKey(wallet));
  return v === null ? null : Number(v);
};
