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
  { tries = 60, delayMs = 500, label = "" } = {},
): Promise<string> {
  const tx = new Transaction().add(...ixs);
  tx.feePayer = signers[0].publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
  tx.sign(...signers);
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
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
  throw new Error(`${label} ${sig} not confirmed after ${(tries * delayMs) / 1000}s`);
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
