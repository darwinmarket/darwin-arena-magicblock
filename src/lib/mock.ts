import type {
  Asset,
  Badge,
  Banner,
  Match,
  Mutation,
  Player,
  RankTier,
  Stats,
} from "./types";

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

// Icône placeholder par palier (remplacée à la DA)
export const TIER_ICON: Record<RankTier, string> = {
  Cell: "🦠",
  Fish: "🐟",
  Amphibian: "🐸",
  Reptile: "🦎",
  Mammal: "🐺",
  Primate: "🦍",
  Apex: "🦅",
  Darwinian: "🧬",
};

// Barème de points (équivalent du "Kill +20 / Death -16" de la référence)
export const POINTS = { win: 20, loss: -16 };
export const PROGRESSION = { from: 560, to: 690 };

export const BADGES: Badge[] = [
  { id: "first-win", name: "First Win", condition: "Win your first duel", icon: "🏆", progress: 1, goal: 1 },
  { id: "survivor", name: "Survivor", condition: "Win 10 duels", icon: "🛡️", progress: 10, goal: 10 },
  { id: "streak", name: "Unstoppable", condition: "10 win streak", icon: "🔥", progress: 10, goal: 10 },
  { id: "veteran", name: "Veteran", condition: "Play 50 duels", icon: "🎖️", progress: 50, goal: 50 },
  { id: "grinder", name: "Grinder", condition: "Play 20 hours", icon: "⏳", progress: 20, goal: 20 },
  { id: "mutant", name: "Mutant", condition: "Win after a bad mutation", icon: "🧪", progress: 1, goal: 1 },
  { id: "diversifier", name: "Diversifier", condition: "Win with 5 assets", icon: "🧺", progress: 0, goal: 1 },
  { id: "all-in", name: "All-in", condition: "Win with one asset at 100%", icon: "🎯", progress: 0, goal: 1 },
  { id: "comeback", name: "Comeback", condition: "Win after trailing by 2%", icon: "↩️", progress: 0, goal: 1 },
  { id: "revenger", name: "Revenger", condition: "Beat the player who just beat you", icon: "⚔️", progress: 1, goal: 1 },
  { id: "whale", name: "Whale", condition: "Win at max stake", icon: "🐋", progress: 0, goal: 1 },
  { id: "rebalancer", name: "Rebalancer", condition: "Win thanks to a rebalance", icon: "⚖️", progress: 0, goal: 1 },
  { id: "minter", name: "Minter", condition: "Mint a winning basket", icon: "🪙", progress: 0, goal: 1 },
  { id: "sniper", name: "Sniper", condition: "Win by less than 0.1%", icon: "🔭", progress: 0, goal: 1 },
  { id: "early", name: "Early Adopter", condition: "Play during Season 1", icon: "🌱", progress: 1, goal: 1 },
  { id: "diamond", name: "Diamond Hands", condition: "Win without rebalancing", icon: "💎", progress: 3, goal: 5 },
  { id: "sol-maxi", name: "SOL Maxi", condition: "Win with SOL above 50%", icon: "☀️", progress: 0, goal: 1 },
  { id: "memelord", name: "Memelord", condition: "Win with memes above 50%", icon: "🐶", progress: 0, goal: 1 },
  { id: "bluechip", name: "Bluechip", condition: "Win 5 duels with SOL+JUP only", icon: "🔵", progress: 2, goal: 5 },
  { id: "flawless", name: "Flawless", condition: "5-0 series", icon: "✨", progress: 0, goal: 1 },
  { id: "night-owl", name: "Night Owl", condition: "Win 10 duels after midnight", icon: "🦉", progress: 4, goal: 10 },
  { id: "social", name: "Social", condition: "Share 10 result cards", icon: "📣", progress: 2, goal: 10 },
  { id: "apex", name: "Apex", condition: "Win 50 duels", icon: "🦖", progress: 62, goal: 50 },
  { id: "darwinian", name: "Darwinian", condition: "Reach the Darwinian rank", icon: "🧬", progress: 0, goal: 1 },
];

const COLORS: Banner["color"][] = ["grey", "teal", "red", "purple"];
// 4 couleurs x 8 paliers = 32 bannières, paginées par 8 (4 colonnes x 2 rangées)
export const BANNERS: Banner[] = TIERS.flatMap((tier, i) =>
  COLORS.map((color) => ({
    id: `${tier}-${color}`,
    color,
    rankIcon: tier,
    condition: `Reach ${tier.toUpperCase()} during S1`,
    unlocked: i <= 3, // débloquées jusqu'au rang actuel
  })),
);

export const ME: Player = {
  id: "me",
  name: "tom.sol",
  avatar: "🧑",
  rank: { tier: "Reptile", division: "III", points: 670 },
  bannerId: "Reptile-teal",
  showcase: ["first-win", "streak", "survivor", "mutant"],
};

export const OPPONENT: Player = {
  id: "opp",
  name: "Teknique",
  avatar: "👩",
  rank: { tier: "Mammal", division: "I", points: 712 },
  bannerId: "Mammal-red",
  showcase: [null, "streak", "grinder", "survivor"],
};

export const STATS: Record<string, Stats> = {
  me: { wins: 62, losses: 38, survived: 151, extinct: 100, winrate: 62, streak: 2, avgReturn: 1.5, bestBasket: 9.4 },
  opp: { wins: 60, losses: 90, survived: 200, extinct: 140, winrate: 40, streak: 3, avgReturn: 1.9, bestBasket: 7.1 },
};

const b = (...legs: [string, number][]) => legs.map(([symbol, weight]) => ({ symbol, weight }));

export const MATCHES: Record<string, Match[]> = {
  me: [
    { id: "m1", result: "VICTORY", myScore: 4.2, oppScore: 1.1, stake: 5, date: "19 NOV", opponent: "Teknique", basket: b(["SOL", 50], ["JUP", 30], ["BONK", 20]) },
    { id: "m2", result: "DEFEAT", myScore: -1.3, oppScore: 2.5, stake: 5, date: "18 NOV", opponent: "0x9f…a1", basket: b(["WIF", 60], ["BONK", 40]) },
    { id: "m3", result: "VICTORY", myScore: 3.0, oppScore: 0.4, stake: 1, date: "18 NOV", opponent: "kaito", basket: b(["SOL", 100]) },
    { id: "m4", result: "DRAW", myScore: 1.4, oppScore: 1.4, stake: 20, date: "17 NOV", opponent: "Teknique", basket: b(["SOL", 40], ["JTO", 30], ["PYTH", 30]) },
    { id: "m5", result: "VICTORY", myScore: 2.0, oppScore: -0.6, stake: 5, date: "16 NOV", opponent: "degen.sol", basket: b(["JUP", 50], ["JTO", 50]) },
  ],
  opp: [
    { id: "o1", result: "VICTORY", myScore: 3.0, oppScore: 1.7, stake: 5, date: "19 NOV", opponent: "lune", basket: b(["BONK", 70], ["WIF", 30]) },
    { id: "o2", result: "VICTORY", myScore: 1.2, oppScore: 0.2, stake: 5, date: "18 NOV", opponent: "kaito", basket: b(["SOL", 60], ["JUP", 40]) },
    { id: "o3", result: "DEFEAT", myScore: -2.4, oppScore: 0.4, stake: 1, date: "17 NOV", opponent: "tom.sol", basket: b(["WIF", 100]) },
    { id: "o4", result: "VICTORY", myScore: 4.0, oppScore: 2.1, stake: 20, date: "17 NOV", opponent: "0x3c…e2", basket: b(["SOL", 50], ["BONK", 50]) },
    { id: "o5", result: "DEFEAT", myScore: 0.8, oppScore: 1.9, stake: 5, date: "15 NOV", opponent: "degen.sol", basket: b(["PYTH", 100]) },
  ],
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
export const DUEL_SECONDS = 300;
export const DRAFT_SECONDS = 60;
export const MAX_REBALANCES = 2;

export const MUTATIONS: Mutation[] = [
  { at: 60, kind: "DOUBLE", symbol: "BONK", label: "BONK weight x2" },
  { at: 150, kind: "FREEZE", symbol: "SOL", label: "SOL frozen for 30s" },
  { at: 240, kind: "SWAP", symbol: "JUP", label: "Players swap JUP" },
];
