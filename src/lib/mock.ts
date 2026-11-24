// Static game definitions: tiers, banner styles, the playable assets (names and
// fallback prices shown until the oracle answers), stake tables and timings, and
// the guest card shown before a wallet connects. Everything a player owns, scores
// or earns comes from chain (src/lib/chain).
import type { Asset, Banner, Player, RankTier } from "./types";

export const TIERS: RankTier[] = [
  "Cell",
  "Fish",
  "Amphibian",
  "Reptile",
  "Mammal",
  "Primate",
  "Apex",
  "Darwinian",
];

// Barème de points (équivalent du "Kill +20 / Death -16" de la référence)
export const POINTS = { win: 20, loss: -16 };

const COLORS: Banner["color"][] = ["grey", "teal", "red", "purple"];
// 4 couleurs x 8 paliers = 32 bannières, paginées par 8 (4 colonnes x 2 rangées)
export const BANNERS: Banner[] = TIERS.flatMap((tier, i) =>
  COLORS.map((color) => ({
    id: `${tier}-${color}`,
    color,
    rankIcon: tier,
    condition: `Reach ${tier.toUpperCase()} during S1`,
    unlocked: i === 0, // recalculé depuis le rang on-chain (ProfilTab)
  })),
);

/** The card shown before a wallet connects. */
export const GUEST: Player = {
  id: "guest",
  name: "guest",
  avatar: "",
  rank: { tier: "Cell", division: "III", points: 0 },
  bannerId: "Cell-grey",
  showcase: [null, null, null, null],
};

export const ASSETS: Asset[] = [
  { symbol: "SOL", name: "Solana", creature: "🐉", price: 184.2, change24h: 2.1 },
  { symbol: "JUP", name: "Jupiter", creature: "🦁", price: 0.92, change24h: -1.4 },
  { symbol: "BONK", name: "Bonk", creature: "🐕", price: 0.000021, change24h: 5.3 },
  { symbol: "WIF", name: "dogwifhat", creature: "🐶", price: 1.87, change24h: -3.2 },
  { symbol: "JTO", name: "Jito", creature: "🦊", price: 2.41, change24h: 0.7 },
  { symbol: "PYTH", name: "Pyth", creature: "🦉", price: 0.31, change24h: 1.2 },
];

export const STAKES = [1, 5, 20]; // USDC
export const DUEL_SECONDS = 60;
export const DRAFT_SECONDS = 60;
export const MAX_REBALANCES = 2;

