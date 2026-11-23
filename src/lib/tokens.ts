// Identité visuelle des actifs jouables : vrai logo (public/tokens, récupérés via l'API tokens de
// Jupiter par adresse de mint, Pyth via CoinGecko), couleurs de marque, classe et profil de risque.

export type TokenClass = "Layer 1" | "DEX" | "Meme" | "Liquid staking" | "Oracle";

export interface TokenMeta {
  logo: string;
  mint: string;
  color: string; // couleur de marque principale
  accent: string; // seconde couleur (dégradé de l'anneau)
  klass: TokenClass;
  volatility: 1 | 2 | 3 | 4 | 5;
}

export const TOKENS: Record<string, TokenMeta> = {
  SOL: { logo: "/tokens/sol.png", mint: "So11111111111111111111111111111111111111112", color: "#9945FF", accent: "#14F195", klass: "Layer 1", volatility: 2 },
  JUP: { logo: "/tokens/jup.png", mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", color: "#00BEF0", accent: "#C7F284", klass: "DEX", volatility: 3 },
  BONK: { logo: "/tokens/bonk.png", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", color: "#FF8A00", accent: "#FFD23F", klass: "Meme", volatility: 5 },
  WIF: { logo: "/tokens/wif.png", mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", color: "#E9A07A", accent: "#FF6FA8", klass: "Meme", volatility: 5 },
  JTO: { logo: "/tokens/jto.png", mint: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL", color: "#2FE6A8", accent: "#E8FFF6", klass: "Liquid staking", volatility: 3 },
  PYTH: { logo: "/tokens/pyth.png", mint: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3", color: "#A57BFF", accent: "#E6DAFE", klass: "Oracle", volatility: 4 },
};

export const TOKEN_CLASSES: TokenClass[] = ["Layer 1", "DEX", "Meme", "Liquid staking", "Oracle"];

/** Mini-historique de prix déterministe (mock), orienté selon la variation 24 h. */
export function sparkline(symbol: string, change: number, n = 28): number[] {
  let seed = [...symbol].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) >>> 0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const vol = TOKENS[symbol]?.volatility ?? 3;
  const pts: number[] = [];
  let v = 0;
  for (let i = 0; i < n; i++) {
    v += (rand() - 0.5) * vol * 0.6 + change / n;
    pts.push(v);
  }
  return pts;
}

export function formatPrice(p: number) {
  if (p < 0.001) return `$${p.toFixed(7)}`;
  if (p < 1) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(2)}`;
}
