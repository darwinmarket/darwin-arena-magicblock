"use client";

// A practice opponent that runs in the player's own browser, for when nobody
// (and no keeper bot) sits down at the table. It is a real second player: its
// own keypair (kept in localStorage), its own test USDC from the faucet, its own
// on-chain profile; it stakes, commits, reveals on the rollup and rebalances once,
// signing for itself. Its fees come from the site's server (/api/bot), so seating it needs no
// wallet prompt; the player's wallet funds it only if the server cannot.
import { createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, type Connection, type TransactionInstruction } from "@solana/web3.js";
import { useEffect, useRef } from "react";
import { ix, type ArenaProgram } from "./arena";
import { useArena, useDuel } from "./ArenaProvider";
import { STATUS, SYMBOLS } from "./constants";
import { commitment, randomSalt } from "./duel";
import { ataOf, configPda, duelPda, profilePda } from "./pdas";

const KEY = "darwin-arena:practice-bot";
const PLAN = (id: number) => `darwin-arena:practice-bot:${id}`;
/// Its profile, token account and faucet claim rent, plus fees.
const BOT_SOL = 0.02;

export function botKeypair(): Keypair {
  let raw = localStorage.getItem(KEY);
  if (!raw) {
    raw = JSON.stringify(Array.from(Keypair.generate().secretKey));
    localStorage.setItem(KEY, raw);
  }
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

function randomBasket(): number[] {
  const n = 3 + Math.floor(Math.random() * 3);
  const picks = [...SYMBOLS.keys()].sort(() => Math.random() - 0.5).slice(0, n);
  const w = new Array(SYMBOLS.length).fill(0);
  for (const i of picks) w[i] = 5;
  for (let left = 100 - 5 * n; left > 0; left -= 5) w[picks[Math.floor(Math.random() * n)]] += 5;
  return w;
}

async function sendAs(conn: Connection, ixs: TransactionInstruction[], signer: Keypair) {
  const tx = new Transaction().add(...ixs);
  tx.feePayer = signer.publicKey;
  tx.recentBlockhash = (await conn.getLatestBlockhash("confirmed")).blockhash;
  tx.sign(signer);
  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: true });
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const st = (await conn.getSignatureStatuses([sig])).value[0];
    if (st?.err) throw new Error(`practice bot: ${JSON.stringify(st.err)}`);
    if (st?.confirmationStatus === "confirmed" || st?.confirmationStatus === "finalized") return sig;
  }
  throw new Error("practice bot: not confirmed");
}

/// Asks the site's server to top the bot's SOL up (no wallet prompt). True when it has enough.
export async function fuelBot(base: Connection): Promise<boolean> {
  const bot = botKeypair();
  if ((await base.getBalance(bot.publicKey)) >= 0.012 * LAMPORTS_PER_SOL) return true;
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/bot`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bot: bot.publicKey.toBase58() }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/// Seat the practice bot in the duel waiting at the table: the server fuels it, then the bot signs
/// its own stake and commitment. No wallet prompt (the wallet funds it only as a fallback).
export async function summonPracticeBot(opts: {
  base: Connection;
  program: ArenaProgram;
  fundWith: (ixs: TransactionInstruction[], label: string) => Promise<string>;
  wallet: Keypair["publicKey"];
  duelId: number;
}) {
  const { base, program, fundWith, wallet, duelId } = opts;
  const bot = botKeypair();
  const config = await program.account.config.fetch(configPda());
  await fuelBot(base);
  const lamports = await base.getBalance(bot.publicKey);
  if (lamports < 0.012 * LAMPORTS_PER_SOL) {
    await fundWith(
      [SystemProgram.transfer({ fromPubkey: wallet, toPubkey: bot.publicKey, lamports: BOT_SOL * LAMPORTS_PER_SOL - lamports })],
      "Fund the practice bot",
    );
  }
  const d = await program.account.duel.fetch(duelPda(duelId));
  const stake = d.stake.toNumber() / 1e6;
  const usdc = ataOf(bot.publicKey, config.usdcMint);
  const balance = await base.getTokenAccountBalance(usdc).then((b) => Number(b.value.amount) / 1e6).catch(() => 0);
  const ixs: TransactionInstruction[] = [];
  if (balance < stake) {
    ixs.push(createAssociatedTokenAccountIdempotentInstruction(bot.publicKey, usdc, bot.publicKey, config.usdcMint));
    ixs.push(await ix.faucet(program, bot.publicKey, config.usdcMint, usdc));
  }
  if (!(await base.getAccountInfo(profilePda(bot.publicKey)))) ixs.push(await ix.initProfile(program, bot.publicKey, "Practice Bot"));
  const weights = randomBasket();
  const salt = randomSalt();
  localStorage.setItem(PLAN(duelId), JSON.stringify({ weights, salt: Array.from(salt), rebalanced: false }));
  ixs.push(await ix.joinDuel(program, bot.publicKey, d.tier, duelId, usdc, config.vault));
  ixs.push(await ix.commitBasket(program, bot.publicKey, bot.publicKey, duelId, commitment(duelPda(duelId), bot.publicKey, weights, salt), null));
  return sendAs(base, ixs, bot);
}

/// Plays the bot's side of the current duel: reveal on the rollup, one rebalance.
export function PracticeBotAutopilot({ erProgram }: { erProgram: ArenaProgram }) {
  const { currentDuel, er } = useArena();
  const live = useDuel(currentDuel, 1000);
  const busy = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!live || live.layer !== "er" || currentDuel === null || typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(PLAN(currentDuel));
    if (!raw) return;
    const bot = botKeypair();
    const slot = live.view.players[0].equals(bot.publicKey) ? 0 : live.view.players[1]?.equals(bot.publicKey) ? 1 : null;
    if (slot === null) return;
    const plan = JSON.parse(raw) as { weights: number[]; salt: number[]; rebalanced: boolean };
    const id = currentDuel;
    const once = (k: string, f: () => Promise<TransactionInstruction[]>) => {
      if (Date.now() - (busy.current[k] ?? 0) < 6000) return;
      busy.current[k] = Date.now();
      f()
        .then((ixs) => sendAs(er, ixs, bot))
        .catch(() => {});
    };
    const v = live.view;
    if (v.status === STATUS.DRAFTING && !v.revealed[slot]) {
      once("reveal", async () => [await ix.revealBasket(erProgram, bot.publicKey, id, plan.weights, Uint8Array.from(plan.salt))]);
    }
    const elapsed = Math.floor(Date.now() / 1000) - v.startTs;
    if (v.status === STATUS.LIVE && !plan.rebalanced && elapsed > 20) {
      // Shift up to 10 % from its worst asset to its best one.
      const w = [...v.weights[slot]];
      const legs = w.map((_, i) => i).filter((i) => w[i] > 0 && SYMBOLS[i] !== v.frozen);
      if (legs.length >= 2) {
        legs.sort((a, b) => (v.moves[SYMBOLS[a]] ?? 0) - (v.moves[SYMBOLS[b]] ?? 0));
        const [worst, best] = [legs[0], legs[legs.length - 1]];
        const shift = Math.min(10, w[worst] - 5);
        if (shift > 0) {
          w[worst] -= shift;
          w[best] += shift;
          once("rebalance", async () => [await ix.rebalance(erProgram, bot.publicKey, id, w)]);
        }
      }
      localStorage.setItem(PLAN(id), JSON.stringify({ ...plan, rebalanced: true }));
    }
  }, [live, currentDuel, er, erProgram]);
  return null;
}
