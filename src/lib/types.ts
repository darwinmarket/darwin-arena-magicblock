// Types partagés. Les données sont mockées pour l'instant (src/lib/mock.ts),
// elles viendront ensuite du programme Solana d'Eden.

export type RankTier =
  | "Cell"
  | "Fish"
  | "Amphibian"
  | "Reptile"
  | "Mammal"
  | "Primate"
  | "Apex"
  | "Darwinian";

export type Division = "III" | "II" | "I" | null; // null = palier sans division (Darwinian)

export interface Rank {
  tier: RankTier;
  division: Division;
  points: number;
}

export interface Badge {
  id: string;
  name: string;
  condition: string;
  icon: string; // placeholder emoji, remplacé par les vrais assets à la DA
  progress: number;
  goal: number;
}

export interface Banner {
  id: string;
  color: "grey" | "teal" | "red" | "purple";
  rankIcon: RankTier;
  condition: string;
  unlocked: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string; // placeholder
  rank: Rank;
  bannerId: string;
  showcase: (string | null)[]; // 4 emplacements de badges (vitrine 2x2)
}

export interface Stats {
  wins: number;
  losses: number;
  survived: number; // mutations survécues
  extinct: number; // éliminations subies
  winrate: number; // %
  streak: number;
  avgReturn: number; // % moyen par duel
  bestBasket: number; // meilleur % réalisé
}

export type MatchResult = "VICTORY" | "DEFEAT" | "DRAW";

export interface BasketLeg {
  symbol: string;
  weight: number; // %
}

export interface Match {
  id: string;
  result: MatchResult;
  myScore: number; // % de perf du panier
  oppScore: number;
  stake: number; // USDC
  date: string;
  opponent: string;
  basket: BasketLeg[];
}

export interface Asset {
  symbol: string;
  name: string;
  creature: string; // placeholder de la créature
  price: number;
  change24h: number;
}

export type MutationKind = "DOUBLE" | "FREEZE" | "SWAP";

export interface Mutation {
  at: number; // seconde du duel
  kind: MutationKind;
  symbol: string;
  label: string;
}
