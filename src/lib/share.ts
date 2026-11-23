// Share links: the public duel page, Solana explorer links, and the X intent.
import type { BasketLeg } from "./types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const CLUSTER = "?cluster=devnet";

export const siteOrigin = () => (typeof window !== "undefined" ? window.location.origin : "https://darwin.market");
export const duelUrl = (id: number) => `${siteOrigin()}${BASE}/duel?id=${id}`;
export const explorerAddress = (a: string) => `https://explorer.solana.com/address/${a}${CLUSTER}`;
export const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}${CLUSTER}`;

const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

export function shareOnX(o: {
  result: "SURVIVED" | "EXTINCT" | "DRAW";
  myScore: number;
  oppScore: number;
  basket: BasketLeg[];
  prize: number;
  duelId: number;
}) {
  const basket = o.basket.map((l) => `${l.symbol} ${l.weight}%`).join(" · ");
  const head =
    o.result === "SURVIVED"
      ? `🧬 SURVIVED in Darwin Arena: ${pct(o.myScore)} vs ${pct(o.oppScore)}, +${o.prize.toFixed(2)} USDC`
      : o.result === "DRAW"
        ? `🧬 Dead heat in Darwin Arena: ${pct(o.myScore)} vs ${pct(o.oppScore)}`
        : `🧬 Went EXTINCT in Darwin Arena: ${pct(o.myScore)} vs ${pct(o.oppScore)}. Rematch incoming`;
  const text = `${head}\nMy basket: ${basket}\nLive prices, VRF mutations, all on a @magicblock Ephemeral Rollup.`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(duelUrl(o.duelId))}`;
  window.open(url, "_blank", "noopener");
  const k = "darwin-arena:shares";
  localStorage.setItem(k, String(Number(localStorage.getItem(k) ?? 0) + 1));
}
