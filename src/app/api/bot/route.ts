// Fuel for the in-browser practice bot: the site's server tops the bot's keypair up to BOT_SOL of
// devnet SOL, so seating the bot needs no wallet prompt. Only tops up (never above BOT_SOL), with
// a loose per-IP limit; same server-only key as the SOL faucet (FAUCET_SECRET_KEY).
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RPC = process.env.FAUCET_RPC ?? process.env.NEXT_PUBLIC_BASE_RPC ?? "https://rpc.magicblock.app/devnet";
/// Profile, token account and faucet-claim rent, plus fees for a few duels.
const BOT_SOL = 0.02 * LAMPORTS_PER_SOL;
/// Below this the bot cannot be sure to afford a duel.
const LOW = 0.012 * LAMPORTS_PER_SOL;
const IP_LIMIT = 20;
const IP_WINDOW_MS = 3600 * 1000;

const ipHits = new Map<string, number[]>();

function faucetKey(): Keypair | null {
  const raw = process.env.FAUCET_SECRET_KEY;
  if (!raw) return null;
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const payer = faucetKey();
  if (!payer) return NextResponse.json({ error: "faucet not configured" }, { status: 503 });

  let bot: PublicKey;
  try {
    const body = (await req.json()) as { bot?: string };
    bot = new PublicKey(body.bot ?? "");
    if (!PublicKey.isOnCurve(bot.toBytes())) throw new Error();
  } catch {
    return NextResponse.json({ error: "invalid bot key" }, { status: 400 });
  }

  const conn = new Connection(RPC, "confirmed");
  const balance = await conn.getBalance(bot);
  if (balance >= LOW) return NextResponse.json({ funded: false, balance });

  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  if (hits.length >= IP_LIMIT) return NextResponse.json({ error: "too many bot top-ups from this address" }, { status: 429 });
  hits.push(now);
  ipHits.set(ip, hits);

  const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: bot, lamports: BOT_SOL - balance }));
  tx.feePayer = payer.publicKey;
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.sign(payer);
  try {
    const signature = await conn.sendRawTransaction(tx.serialize());
    await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    return NextResponse.json({ funded: true, signature });
  } catch (e) {
    return NextResponse.json({ error: `top-up failed: ${String((e as Error).message).slice(0, 120)}` }, { status: 502 });
  }
}
