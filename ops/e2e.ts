// End-to-end duel on devnet + MagicBlock's devnet ER, between two ops keypairs
// (bot1, bot2), each acting through its own MagicBlock session key exactly
// like the browser does:
//
//   base  faucet, profile, open / join (stake escrow), session token,
//         commit (session key), delegate
//   ER    reveal (session key), start (oracle prices + tick crank), watch the
//         crank tick, VRF mutations, rebalance (session key), finish
//   base  settle: payout + profiles
//
//   npx tsx ops/e2e.ts [tier=0]
import { createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import assert from "assert";
import { createSessionIx, ix } from "../src/lib/chain/arena";
import { DUEL_SECONDS, MUTATION_AT, PROGRAM_ID, STATUS, STAKES, SYMBOLS } from "../src/lib/chain/constants";
import { commitment, duelView, randomSalt, toLegs, toWeights, type Leg } from "../src/lib/chain/duel";
import { ataOf, configPda, duelPda, profilePda, sessionTokenPda, tablePda } from "../src/lib/chain/pdas";
import { baseConnection, baseProgram, erConnection, erProgram, namedKeypair, sendLogged, short, sleep } from "./lib/env";

const base = baseConnection();
const er = erConnection();
const bp = baseProgram();
const ep = erProgram();
const tier = Number(process.argv[2] ?? 0);

interface Seat {
  name: string;
  wallet: Keypair;
  session: Keypair;
  legs: Leg[];
  salt: Uint8Array;
}

async function ensurePlayer(k: Keypair, name: string, mint: PublicKey) {
  const usdc = ataOf(k.publicKey, mint);
  const bal = await base.getTokenAccountBalance(usdc).then((b) => Number(b.value.amount) / 1e6).catch(() => 0);
  const ixs = [];
  if (bal < STAKES[tier]) {
    ixs.push(createAssociatedTokenAccountIdempotentInstruction(k.publicKey, usdc, k.publicKey, mint));
    ixs.push(await ix.faucet(bp, k.publicKey, mint, usdc));
  }
  if (!(await base.getAccountInfo(profilePda(k.publicKey)))) ixs.push(await ix.initProfile(bp, k.publicKey, name));
  if (ixs.length) await sendLogged(base, `${name}: faucet/profile`, ixs, [k]);
  return usdc;
}

async function waitFor<T>(label: string, f: () => Promise<T | null | undefined | false>, timeoutMs = 60_000, every = 1000): Promise<T> {
  const t = Date.now();
  while (Date.now() - t < timeoutMs) {
    const v = await f().catch(() => null);
    if (v) return v as T;
    await sleep(every);
  }
  throw new Error(`timeout waiting for ${label}`);
}

async function erDuel(id: number) {
  const ai = await er.getAccountInfo(duelPda(id));
  if (!ai || !ai.owner.equals(PROGRAM_ID)) return null;
  return duelView(ep.coder.accounts.decode("duel", ai.data));
}

async function main() {
  const config = await bp.account.config.fetch(configPda());
  const mint = config.usdcMint;
  const vault = config.vault;
  const seats: Seat[] = [
    { name: "bot1", wallet: namedKeypair("bot1"), session: Keypair.generate(), legs: [{ symbol: "SOL", weight: 50 }, { symbol: "JUP", weight: 30 }, { symbol: "BONK", weight: 20 }], salt: randomSalt() },
    { name: "bot2", wallet: namedKeypair("bot2"), session: Keypair.generate(), legs: [{ symbol: "BONK", weight: 40 }, { symbol: "WIF", weight: 30 }, { symbol: "PYTH", weight: 30 }], salt: randomSalt() },
  ];
  console.log(`e2e on ${STAKES[tier]} USDC table, program ${short(PROGRAM_ID)}`);
  const usdc = [await ensurePlayer(seats[0].wallet, "Arena Bot 1", mint), await ensurePlayer(seats[1].wallet, "Arena Bot 2", mint)];
  const before = await Promise.all(usdc.map((u) => base.getTokenAccountBalance(u).then((b) => Number(b.value.amount) / 1e6)));

  // ------------------------------------------------------------ matchmaking
  const table = await bp.account.table.fetch(tablePda(tier));
  if (!table.waiting.equals(PublicKey.default)) {
    const d = await bp.account.duel.fetch(table.waiting);
    const opener = seats.find((s) => s.wallet.publicKey.equals(d.players[0]));
    if (!opener) throw new Error("table busy with a stranger's duel; pick another tier");
    await sendLogged(base, "cancel stale open", [await ix.cancelDuel(bp, opener.wallet.publicKey, tier, d.id.toNumber(), ataOf(opener.wallet.publicKey, mint), null, vault)], [opener.wallet]);
  }
  const id = (await bp.account.config.fetch(configPda())).duelCount.toNumber();
  const until = Math.floor(Date.now() / 1000) + 3600;
  // One wallet transaction per player: stake + session key authorisation.
  await sendLogged(base, "bot1 open + session", [
    await ix.openDuel(bp, seats[0].wallet.publicKey, tier, id, usdc[0], vault),
    createSessionIx(seats[0].wallet.publicKey, seats[0].session.publicKey, until, 0.02 * LAMPORTS_PER_SOL),
  ], [seats[0].wallet, seats[0].session]);
  await sendLogged(base, "bot2 join + session", [
    await ix.joinDuel(bp, seats[1].wallet.publicKey, tier, id, usdc[1], vault),
    createSessionIx(seats[1].wallet.publicKey, seats[1].session.publicKey, until, 0.02 * LAMPORTS_PER_SOL),
  ], [seats[1].wallet, seats[1].session]);
  console.log(`  duel #${id} ${duelPda(id).toBase58()}`);

  // ----------------------------------------------- draft: commit by session key
  for (const [i, s] of seats.entries()) {
    const c = commitment(duelPda(id), s.wallet.publicKey, toWeights(s.legs), s.salt);
    const ixs = [await ix.commitBasket(bp, s.session.publicKey, s.wallet.publicKey, id, c, sessionTokenPda(s.session.publicKey, s.wallet.publicKey))];
    if (i === 1) ixs.push(await ix.delegateDuel(bp, s.session.publicKey, id)); // second committer hands the duel to the ER
    await sendLogged(base, `${s.name} commit${i === 1 ? " + delegate" : ""}`, ixs, [s.session]);
  }
  const t0 = Date.now();
  await waitFor("duel on the ER", () => erDuel(id), 60_000, 500);
  console.log(`  duel visible on the ER after ${Date.now() - t0} ms`);

  // --------------------------------------------- on the ER: reveal and start
  for (const s of seats) {
    await sendLogged(er, `${s.name} reveal (ER)`, [await ix.revealBasket(ep, s.session.publicKey, id, toWeights(s.legs), s.salt)], [s.session]);
  }
  await sendLogged(er, "start + crank (ER)", [await ix.startDuel(ep, seats[0].session.publicKey, id)], [seats[0].session]);
  let d = (await erDuel(id))!;
  assert.equal(d.status, STATUS.LIVE);
  console.log(`  start prices ${d.startPrice.map(String).join(" ")}`);

  // ------------------------------------------------------- live duel watch
  const crank = namedKeypair("crank");
  let rebalanced = false;
  let lastTicks = 0;
  while (d.status === STATUS.LIVE) {
    await sleep(3000);
    d = (await erDuel(id))!;
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - d.startTs;
    for (let m = 0; m < 3; m++) {
      if (elapsed >= MUTATION_AT[m] && d.mutations[m].state === "hidden") {
        await sendLogged(er, `request mutation ${m} (VRF)`, [await ix.requestMutation(ep, crank.publicKey, id, m)], [crank]).catch((e) => console.log("  !", String(e.message).split("\n")[0]));
      }
    }
    if (!rebalanced && elapsed > 100) {
      // Shift 5 % between bot1's first two unfrozen legs.
      const w = [...d.weights[0]];
      const legs = w.map((_, i) => i).filter((i) => w[i] > 0 && d.frozen !== SYMBOLS[i]);
      if (legs.length >= 2 && w[legs[0]] > 5) {
        w[legs[0]] -= 5;
        w[legs[1]] += 5;
        await sendLogged(er, "bot1 rebalance (ER)", [await ix.rebalance(ep, seats[0].session.publicKey, id, w)], [seats[0].session]).catch((e) => console.log("  !", String(e.message).split("\n")[0]));
      }
      rebalanced = true;
    }
    if (elapsed % 30 < 3 || d.status !== STATUS.LIVE) {
      console.log(
        `  t=${String(elapsed).padStart(3)}s ticks=${d.ticks} (+${d.ticks - lastTicks}) bot1 ${d.score[0].toFixed(4)}% bot2 ${d.score[1].toFixed(4)}%` +
          `${d.frozen ? ` frozen=${d.frozen}` : ""} ${d.mutations.filter((m) => m.state === "applied").map((m) => `[${m.label}]`).join(" ")}`,
      );
      lastTicks = d.ticks;
    }
    if (elapsed > DUEL_SECONDS + 60) throw new Error("duel did not finish: crank stalled?");
  }
  assert.equal(d.status, STATUS.FINISHED);
  console.log(`  finished: winner ${d.winner} after ${d.ticks} ticks; mutations ${d.mutations.map((m) => m.label ?? m.state).join(" | ")}`);

  // ------------------------------------------- back to Solana and settle
  await sendLogged(er, "finish (commit+undelegate)", [await ix.finishDuel(ep, crank.publicKey, id)], [crank]);
  const t1 = Date.now();
  await waitFor("duel back on base", async () => {
    const ai = await base.getAccountInfo(duelPda(id));
    return ai?.owner.equals(PROGRAM_ID) && bp.coder.accounts.decode("duel", ai.data).status === STATUS.FINISHED;
  }, 120_000, 1000);
  console.log(`  undelegated after ${Date.now() - t1} ms`);
  await sendLogged(base, "settle", [await ix.settle(bp, crank.publicKey, id, [seats[0].wallet.publicKey, seats[1].wallet.publicKey], [usdc[0], usdc[1]], vault)], [crank]);

  const after = await Promise.all(usdc.map((u) => base.getTokenAccountBalance(u).then((b) => Number(b.value.amount) / 1e6)));
  const p = await Promise.all(seats.map((s) => bp.account.profile.fetch(profilePda(s.wallet.publicKey))));
  console.log(`  balances bot1 ${before[0]} -> ${after[0]}, bot2 ${before[1]} -> ${after[1]}`);
  console.log(`  profiles bot1 ${p[0].points} pts ${p[0].wins}W/${p[0].losses}L, bot2 ${p[1].points} pts ${p[1].wins}W/${p[1].losses}L`);
  const stake = STAKES[tier];
  if (d.winner === 2) assert.deepEqual(after, before);
  else assert.equal(Math.round((after[d.winner] - before[d.winner]) * 100) / 100, Math.round((stake * 2 * 0.95 - stake) * 100) / 100);
  const final = await bp.account.duel.fetch(duelPda(id));
  assert.equal(final.status, STATUS.SETTLED);
  console.log("e2e ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
