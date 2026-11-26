// Test-USDC faucet sent by the site: the server pays the fee and calls the program's `faucet_to`,
// so 1000 test USDC land in the player's token account with no wallet prompt, in one devnet slot.
// Test money, no limit per wallet; a loose per-IP rate limit only keeps a script from burning the
// server's devnet SOL (each claim costs it a transaction fee, plus the token account's rent the
// first time). Signed with the same server-only key as the SOL faucet (FAUCET_SECRET_KEY).
import { createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { arenaProgram, ix } from "@/lib/chain/arena";
import { ataOf, configPda } from "@/lib/chain/pdas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RPC = process.env.FAUCET_RPC ?? process.env.NEXT_PUBLIC_BASE_RPC ?? "https://rpc.magicblock.app/devnet";
const IP_LIMIT = 60;
const IP_WINDOW_MS = 10 * 60 * 1000;

const ipHits = new Map<string, number[]>();
let mintCache: PublicKey | null = null;

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

  let wallet: PublicKey;
  try {
    const body = (await req.json()) as { wallet?: string };
    wallet = new PublicKey(body.wallet ?? "");
    if (!PublicKey.isOnCurve(wallet.toBytes())) throw new Error();
  } catch {
    return NextResponse.json({ error: "invalid wallet" }, { status: 400 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  if (hits.length >= IP_LIMIT) return NextResponse.json({ error: "too many requests, slow down a little" }, { status: 429 });
  hits.push(now);
  ipHits.set(ip, hits);

  const conn = new Connection(RPC, "confirmed");
  const program = arenaProgram(conn);
  if (!mintCache) mintCache = (await program.account.config.fetch(configPda())).usdcMint as PublicKey;
  const ata = ataOf(wallet, mintCache);
  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, ata, wallet, mintCache),
    await ix.faucetTo(program, payer.publicKey, mintCache, ata),
  );
  tx.feePayer = payer.publicKey;
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.sign(payer);
  try {
    const signature = await conn.sendRawTransaction(tx.serialize());
    await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    return NextResponse.json({ signature, amount: 1000 });
  } catch (e) {
    return NextResponse.json({ error: `faucet failed: ${String((e as Error).message).slice(0, 120)}` }, { status: 502 });
  }
}
