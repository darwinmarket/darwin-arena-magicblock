// 24 h market context for the draft cards: change over 24 h and an hourly
// sparkline per asset. Live prices in the game come from MagicBlock's Pyth Lazer
// feeds on the rollup; Pyth's historical endpoints (Hermes / Benchmarks) now
// require an API key, so the 24 h history comes from Binance's public klines
// mirror. Cached for five minutes.
import { NextResponse } from "next/server";

export const revalidate = 300;

const SYMBOLS = ["SOL", "JUP", "BONK", "WIF", "JTO", "PYTH"];

interface Series {
  change24h: number;
  closes: number[];
}

async function series(symbol: string): Promise<Series | null> {
  const url = `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}USDT&interval=1h&limit=25`;
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) return null;
  const rows = (await res.json()) as [number, string, string, string, string][];
  const closes = rows.map((r) => Number(r[4]));
  if (closes.length < 2) return null;
  const first = Number(rows[0][1]);
  return { change24h: ((closes[closes.length - 1] - first) / first) * 100, closes };
}

export async function GET() {
  const out: Record<string, Series> = {};
  await Promise.all(
    SYMBOLS.map(async (s) => {
      const v = await series(s).catch(() => null);
      if (v) out[s] = v;
    }),
  );
  return NextResponse.json({ source: "binance-klines-1h", assets: out });
}
