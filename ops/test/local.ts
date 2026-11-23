// Base-layer integration tests against a local validator.
//
//   npm run test:local   (starts solana-test-validator with the program and
//                         MagicBlock's session-keys program, runs this, stops it)
//
// Covers everything that lives on Solana: setup, faucet and its cooldown,
// profiles, the table queue, stake escrow, commitments by wallet and by session
// key (and the refusals), cancellation refunds. The rollup half (reveal, ticks,
// VRF, finish, settle) needs a real ER and is covered by ops/e2e.ts on devnet.
import { createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import assert from "assert";
import { createSessionIx, ix } from "../../src/lib/chain/arena";
import { STATUS } from "../../src/lib/chain/constants";
import { commitment, randomSalt, toWeights } from "../../src/lib/chain/duel";
import { ataOf, configPda, duelPda, sessionTokenPda, tablePda } from "../../src/lib/chain/pdas";
import idl from "../../src/lib/chain/idl/darwin_arena.json";
import { adminKeypair, baseConnection, baseProgram, send } from "../lib/env";

const conn: Connection = baseConnection();
const program = baseProgram();
let passed = 0;
let failed = 0;

async function it(name: string, f: () => Promise<void>) {
  try {
    await f();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}\n       ${String((e as Error).message).split("\n").slice(0, 6).join("\n       ")}`);
  }
}

async function rejects(p: Promise<unknown>, needle: string) {
  try {
    await p;
  } catch (e) {
    const msg = String((e as Error).message);
    const code = (idl.errors ?? []).find((x) => x.name.toLowerCase() === needle.toLowerCase())?.code;
    assert(msg.includes(needle) || (code !== undefined && msg.includes(`"Custom":${code}`)), `expected "${needle}", got: ${msg.slice(0, 300)}`);
    return;
  }
  throw new Error(`expected failure "${needle}"`);
}

async function fund(k: PublicKey, sol = 2) {
  const sig = await conn.requestAirdrop(k, sol * LAMPORTS_PER_SOL);
  await conn.confirmTransaction(sig, "confirmed");
}

async function main() {
  const admin = adminKeypair();
  await fund(admin.publicKey, 10);
  const { execSync } = await import("child_process");
  execSync("npx tsx ops/setup.ts", { stdio: "inherit", env: { ...process.env, ARENA_ENV: "local" } });
  const config = await program.account.config.fetch(configPda());
  const mint = config.usdcMint;
  const vault = config.vault;

  const alice = Keypair.generate();
  const bob = Keypair.generate();
  await Promise.all([fund(alice.publicKey), fund(bob.publicKey)]);
  const usdc = (k: PublicKey) => ataOf(k, mint);
  const balance = async (k: PublicKey) => Number((await conn.getTokenAccountBalance(k)).value.amount) / 1e6;

  console.log("\nbase layer");
  await it("faucet mints 100 test USDC", async () => {
    for (const k of [alice, bob]) {
      await send(conn, [
        createAssociatedTokenAccountIdempotentInstruction(k.publicKey, usdc(k.publicKey), k.publicKey, mint),
        await ix.faucet(program, k.publicKey, mint, usdc(k.publicKey)),
      ], [k]);
    }
    assert.equal(await balance(usdc(alice.publicKey)), 100);
  });

  await it("faucet refuses a second claim within the cooldown", async () => {
    await rejects(send(conn, [await ix.faucet(program, alice.publicKey, mint, usdc(alice.publicKey))], [alice]), "FaucetCooldown");
  });

  await it("profiles are created with a name", async () => {
    await send(conn, [await ix.initProfile(program, alice.publicKey, "alice.sol")], [alice]);
    await send(conn, [await ix.initProfile(program, bob.publicKey, "bob")], [bob]);
  });

  let duelId = 0;
  await it("open_duel escrows the stake and queues the duel at the table", async () => {
    duelId = (await program.account.config.fetch(configPda())).duelCount.toNumber();
    await send(conn, [await ix.openDuel(program, alice.publicKey, 1, duelId, usdc(alice.publicKey), vault)], [alice]);
    const t = await program.account.table.fetch(tablePda(1));
    assert(t.waiting.equals(duelPda(duelId)));
    assert.equal(await balance(usdc(alice.publicKey)), 95);
    assert.equal(await balance(vault), 5);
  });

  await it("a second open at a busy table is refused", async () => {
    const id = (await program.account.config.fetch(configPda())).duelCount.toNumber();
    await rejects(send(conn, [await ix.openDuel(program, bob.publicKey, 1, id, usdc(bob.publicKey), vault)], [bob]), "TableBusy");
  });

  await it("the opener cannot join their own duel", async () => {
    await rejects(send(conn, [await ix.joinDuel(program, alice.publicKey, 1, duelId, usdc(alice.publicKey), vault)], [alice]), "SelfDuel");
  });

  await it("join_duel seats the rival and starts the draft", async () => {
    await send(conn, [await ix.joinDuel(program, bob.publicKey, 1, duelId, usdc(bob.publicKey), vault)], [bob]);
    const d = await program.account.duel.fetch(duelPda(duelId));
    assert.equal(d.status, STATUS.DRAFTING);
    assert.equal(await balance(vault), 10);
    assert((await program.account.table.fetch(tablePda(1))).waiting.equals(PublicKey.default));
  });

  const aliceSession = Keypair.generate();
  await it("a session key commits for its wallet (MagicBlock session token)", async () => {
    const until = Math.floor(Date.now() / 1000) + 3600;
    await send(conn, [createSessionIx(alice.publicKey, aliceSession.publicKey, until, 0.01 * LAMPORTS_PER_SOL)], [alice, aliceSession]);
    const w = toWeights([{ symbol: "SOL", weight: 50 }, { symbol: "JUP", weight: 30 }, { symbol: "BONK", weight: 20 }]);
    const c = commitment(duelPda(duelId), alice.publicKey, w, randomSalt());
    await send(conn, [await ix.commitBasket(program, aliceSession.publicKey, alice.publicKey, duelId, c, sessionTokenPda(aliceSession.publicKey, alice.publicKey))], [aliceSession]);
    const d = await program.account.duel.fetch(duelPda(duelId));
    assert(d.session[0].equals(aliceSession.publicKey));
    assert.equal(d.sessionUntil[0].toNumber(), until);
  });

  await it("a session key cannot commit for another player", async () => {
    const c = new Uint8Array(32).fill(7);
    await rejects(
      send(conn, [await ix.commitBasket(program, aliceSession.publicKey, bob.publicKey, duelId, c, sessionTokenPda(aliceSession.publicKey, alice.publicKey))], [aliceSession]),
      "Unauthorized",
    );
  });

  await it("a stranger without a session token cannot commit", async () => {
    const eve = Keypair.generate();
    await fund(eve.publicKey, 1);
    await rejects(send(conn, [await ix.commitBasket(program, eve.publicKey, bob.publicKey, duelId, new Uint8Array(32).fill(1), null)], [eve]), "Unauthorized");
  });

  await it("the wallet itself can commit", async () => {
    const w = toWeights([{ symbol: "WIF", weight: 40 }, { symbol: "JTO", weight: 30 }, { symbol: "PYTH", weight: 30 }]);
    await send(conn, [await ix.commitBasket(program, bob.publicKey, bob.publicKey, duelId, commitment(duelPda(duelId), bob.publicKey, w, randomSalt()), null)], [bob]);
    const d = await program.account.duel.fetch(duelPda(duelId));
    assert(d.session[1].equals(bob.publicKey));
  });

  await it("a draft cannot be cancelled before its deadline", async () => {
    await rejects(send(conn, [await ix.cancelDuel(program, bob.publicKey, 1, duelId, usdc(alice.publicKey), usdc(bob.publicKey), vault)], [bob]), "DraftNotOver");
  });

  await it("the opener can walk away from an empty table and is refunded", async () => {
    const id = (await program.account.config.fetch(configPda())).duelCount.toNumber();
    await send(conn, [await ix.openDuel(program, alice.publicKey, 0, id, usdc(alice.publicKey), vault)], [alice]);
    const before = await balance(usdc(alice.publicKey));
    await rejects(send(conn, [await ix.cancelDuel(program, bob.publicKey, 0, id, usdc(alice.publicKey), null, vault)], [bob]), "Unauthorized");
    await send(conn, [await ix.cancelDuel(program, alice.publicKey, 0, id, usdc(alice.publicKey), null, vault)], [alice]);
    assert.equal(await balance(usdc(alice.publicKey)), before + 1);
    assert.equal((await program.account.duel.fetch(duelPda(id))).status, STATUS.CANCELLED);
  });

  await it("refunds go only to the players' own token accounts", async () => {
    const id = (await program.account.config.fetch(configPda())).duelCount.toNumber();
    await send(conn, [await ix.openDuel(program, alice.publicKey, 2, id, usdc(alice.publicKey), vault)], [alice]);
    await rejects(send(conn, [await ix.cancelDuel(program, alice.publicKey, 2, id, usdc(bob.publicKey), null, vault)], [alice]), "BadTokenAccount");
  });

  void SystemProgram;
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
