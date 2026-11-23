// Devnet SOL faucet, so a judge can play with a fresh wallet (the Burner, or
// Phantom on devnet) without hunting for devnet SOL.
//
// Small and hard to drain:
//   - devnet only, a fixed small amount (FAUCET_LAMPORTS)
//   - refused if the wallet already holds enough to play
//   - one drip per wallet per 24 h, checked on chain (the wallet's recent
//     transactions), so it holds across serverless instances
//   - a best-effort per-IP limit on top
// The key comes from a server-only env var (FAUCET_SECRET_KEY, never NEXT_PUBLIC).
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RPC = process.env.FAUCET_RPC ?? process.env.NEXT_PUBLIC_BASE_RPC ?? "https://rpc.magicblock.app/devnet";
const DRIP = Number(process.env.FAUCET_LAMPORTS ?? 0.08 * LAMPORTS_PER_SOL);
/// A wallet holding this much can already play a duel (stake tx, session key, rent).
const ENOUGH = 0.05 * LAMPORTS_PER_SOL;
const WALLET_WINDOW_S = 24 * 3600;
const IP_LIMIT = 4;
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

function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  ipHits.set(ip, hits);
  return hits.length < IP_LIMIT;
}

/// Did this wallet already get a drip from the faucet in the last 24 h?
async function recentlyFunded(conn: Connection, wallet: PublicKey, faucet: PublicKey): Promise<boolean> {
  const since = Math.floor(Date.now() / 1000) - WALLET_WINDOW_S;
  const sigs = await conn.getSignaturesForAddress(wallet, { limit: 25 });
  const recent = sigs.filter((s) => (s.blockTime ?? 0) >= since).map((s) => s.signature);
  if (!recent.length) return false;
  const txs = await conn.getTransactions(recent, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
  return txs.some((tx) => tx?.transaction.message.staticAccountKeys.some((k) => k.equals(faucet)));
}

export async function POST(req: Request) {
  const faucet = faucetKey();
  if (!faucet) return NextResponse.json({ error: "faucet not configured" }, { status: 503 });

  let wallet: PublicKey;
  try {
    const body = (await req.json()) as { wallet?: string };
    wallet = new PublicKey(body.wallet ?? "");
    if (!PublicKey.isOnCurve(wallet.toBytes())) throw new Error();
  } catch {
    return NextResponse.json({ error: "invalid wallet" }, { status: 400 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!ipAllowed(ip)) return NextResponse.json({ error: "too many requests from this address, try later" }, { status: 429 });

  const conn = new Connection(RPC, "confirmed");
  const balance = await conn.getBalance(wallet);
  if (balance >= ENOUGH) return NextResponse.json({ error: "this wallet already has enough devnet SOL", balance }, { status: 409 });
  if (await recentlyFunded(conn, wallet, faucet.publicKey)) {
    return NextResponse.json({ error: "this wallet was already funded today" }, { status: 429 });
  }

  ipHits.get(ip)?.push(Date.now());
  const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: faucet.publicKey, toPubkey: wallet, lamports: DRIP }));
  tx.feePayer = faucet.publicKey;
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.sign(faucet);
  try {
    const signature = await conn.sendRawTransaction(tx.serialize());
    await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    return NextResponse.json({ signature, lamports: DRIP });
  } catch (e) {
    return NextResponse.json({ error: `transfer failed: ${String((e as Error).message).slice(0, 120)}` }, { status: 502 });
  }
}
