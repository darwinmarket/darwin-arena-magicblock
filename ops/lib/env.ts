// Node-side wiring for the ops scripts: keypairs, connections, sending.
//
// Keypairs live outside the repo, under ~/.config/darwin-arena/ (admin = the
// Solana CLI default keypair). Nothing here prints a secret.
import fs from "fs";
import os from "os";
import path from "path";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import { BASE_RPC, ER_RPC } from "../../src/lib/chain/constants";
import { arenaProgram } from "../../src/lib/chain/arena";

export const LOCAL = process.env.ARENA_ENV === "local";
export const KEY_DIR = process.env.ARENA_KEYS ?? path.join(os.homedir(), ".config", "darwin-arena");

export function loadKeypair(file: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8"))));
}
export const adminKeypair = () =>
  loadKeypair(process.env.ADMIN_KEYPAIR ?? path.join(os.homedir(), ".config", "solana", "id.json"));
export const namedKeypair = (name: string) => loadKeypair(path.join(KEY_DIR, `${name}.json`));

export const baseConnection = () => new Connection(LOCAL ? "http://127.0.0.1:8899" : BASE_RPC, "confirmed");
export const erConnection = () => new Connection(ER_RPC, "confirmed");

export const baseProgram = () => arenaProgram(baseConnection());
export const erProgram = () => arenaProgram(erConnection());

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/// Send and wait by polling `getSignatureStatuses` (works the same on the base
/// layer and on the rollup, and surfaces the program error when there is one).
export async function send(
  connection: Connection,
  ixs: TransactionInstruction[],
  signers: Keypair[],
  { tries = 60, delayMs = 500, label = "", attempts = 3 } = {},
): Promise<string> {
  // Devnet occasionally drops a transaction: if it is still unknown when its
  // wait runs out, sign it again with a fresh blockhash (the old one can no
  // longer land once its blockhash expires, so this cannot double-apply).
  let last = "";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const tx = new Transaction().add(...ixs);
    tx.feePayer = signers[0].publicKey;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.sign(...signers);
    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
    last = sig;
    for (let i = 0; i < tries; i++) {
      await sleep(delayMs);
      const { value } = await connection.getSignatureStatuses([sig]);
      const st = value[0];
      if (!st) continue;
      if (st.err) {
        const logs = (await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" }).catch(() => null))?.meta?.logMessages;
        throw new Error(`${label} ${sig} failed: ${JSON.stringify(st.err)}\n${(logs ?? []).slice(-12).join("\n")}`);
      }
      if (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized") return sig;
    }
    // Wait for the blockhash to expire before resending, so the first copy is dead.
    while ((await connection.getBlockHeight("confirmed").catch(() => 0)) <= lastValidBlockHeight) {
      const { value } = await connection.getSignatureStatuses([sig]);
      if (value[0]?.confirmationStatus === "confirmed" || value[0]?.confirmationStatus === "finalized") return sig;
      if (value[0]?.err) throw new Error(`${label} ${sig} failed: ${JSON.stringify(value[0].err)}`);
      await sleep(2000);
    }
    console.log(`  ${label}: ${sig.slice(0, 16)}… dropped, resending (attempt ${attempt + 1})`);
  }
  throw new Error(`${label} ${last} not confirmed after ${attempts} attempts`);
}

export async function sendLogged(connection: Connection, label: string, ixs: TransactionInstruction[], signers: Keypair[]) {
  const t = Date.now();
  const sig = await send(connection, ixs, signers, { label });
  console.log(`  ${label.padEnd(22)} ${String(Date.now() - t).padStart(5)} ms  ${sig.slice(0, 20)}…`);
  return sig;
}

export function short(k: PublicKey) {
  const s = k.toBase58();
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}
