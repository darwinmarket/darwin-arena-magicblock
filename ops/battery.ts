// On-chain test battery: many players, many duels in parallel on devnet + the
// MagicBlock ER, normal and adversarial paths, every result checked on chain.
//
//   npx tsx ops/battery.ts [players=14] [rounds=1]
//
// Scenarios per round (all in parallel):
//   - one regular duel per stake table (1 / 5 / 20), session keys, random
//     baskets, rebalances, all three VRF mutations, payout + profile checks
//   - an identical-baskets duel (scores track each other; draw unless a SWAP
//     breaks the symmetry)
//   - a forfeit: one player never reveals, the other wins after the window
//   - a double no-show: nobody reveals -> draw, both refunded
//   - an abandoned draft: nobody commits -> cancel, both refunded
// And refusals, checked against the live duels: third rebalance, rebalance
// changing assets, wrong salt, a stranger's session key, the rival's session on
// my seat, a forged VRF callback, an early / repeated mutation request, early
// finish, early / double settle, settle to the wrong token account.
//
// Results go to stdout and to BATTERY.md.
import { createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { createSessionIx, ix } from "../src/lib/chain/arena";
import idl from "../src/lib/chain/idl/darwin_arena.json";
import { DELEGATION_PROGRAM_ID, DUEL_SECONDS, MUTATION_AT, PROGRAM_ID, STAKES, STATUS, SYMBOLS } from "../src/lib/chain/constants";
import { commitment, duelView, randomSalt, type DuelView } from "../src/lib/chain/duel";
import { ataOf, configPda, duelPda, profilePda, sessionTokenPda, tablePda, trophyPda } from "../src/lib/chain/pdas";
import { uniqueHandles } from "./lib/handles";
import { adminKeypair, baseConnection, baseProgram, erConnection, erProgram, KEY_DIR, loadKeypair, namedKeypair, send, short, sleep } from "./lib/env";

const base = baseConnection();
const er = erConnection();
const bp = baseProgram();
const ep = erProgram();
const crank = namedKeypair("crank");
const N_PLAYERS = Math.max(14, Number(process.argv[2] ?? 14));
const ROUNDS = Number(process.argv[3] ?? 1);
const DRAFT_GRACE = 30;
const REVEAL_SECONDS = 45;

type Check = { name: string; ok: boolean; detail: string };
const checks: Check[] = [];
const notes: string[] = [];
const timings: Record<string, number[]> = {};
function check(name: string, ok: boolean, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`);
}
function time(label: string, ms: number) {
  (timings[label] ??= []).push(ms);
}
const ANCHOR_ERRORS: Record<number, string> = { 0: "already in use", 2006: "ConstraintSeeds", 2012: "ConstraintAddress", 3007: "AccountOwnedByWrongProgram", 3012: "AccountNotInitialized" };
const errName = (code: number) => idl.errors.find((e) => e.code === code)?.name ?? ANCHOR_ERRORS[code] ?? String(code);

async function tx(conn: typeof base, ixs: TransactionInstruction[], signers: Keypair[], label: string) {
  const t = Date.now();
  const sig = await send(conn, ixs, signers, { label, tries: 80, delayMs: 400 });
  time(label, Date.now() - t);
  return sig;
}
/// Expect a refusal with a given program error name.
async function refused(name: string, p: Promise<unknown>, expected: string) {
  try {
    await p;
    check(name, false, "was accepted");
  } catch (e) {
    const m = String((e as Error).message);
    const code = /"Custom":(\d+)/.exec(m)?.[1];
    const got = code ? errName(Number(code)) : m.includes(expected) ? expected : m.split("\n")[0].slice(0, 120);
    check(name, got === expected, `refused with ${got}`);
  }
}

interface Player {
  key: Keypair;
  session: Keypair;
  usdc: PublicKey;
}

async function loadPlayers(mint: PublicKey): Promise<Player[]> {
  const dir = path.join(KEY_DIR, "battery");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const admin = adminKeypair();
  const players: Player[] = [];
  for (let i = 0; i < N_PLAYERS; i++) {
    const f = path.join(dir, `p${i}.json`);
    if (!fs.existsSync(f)) fs.writeFileSync(f, JSON.stringify(Array.from(Keypair.generate().secretKey)), { mode: 0o600 });
    const key = loadKeypair(f);
    players.push({ key, session: Keypair.generate(), usdc: ataOf(key.publicKey, mint) });
  }
  // Fund SOL (only what is missing), then USDC + profile.
  const top: TransactionInstruction[] = [];
  for (const p of players) {
    const bal = await base.getBalance(p.key.publicKey);
    const want = 0.1 * LAMPORTS_PER_SOL;
    if (bal < 0.06 * LAMPORTS_PER_SOL) top.push(SystemProgram.transfer({ fromPubkey: admin.publicKey, toPubkey: p.key.publicKey, lamports: want - bal }));
  }
  for (let i = 0; i < top.length; i += 8) await tx(base, top.slice(i, i + 8), [admin], "fund players");
  const names = uniqueHandles(players.map((p) => p.key.publicKey.toBase58()));
  await Promise.all(
    players.map(async (p, i) => {
      const ixs: TransactionInstruction[] = [];
      const usdc = await base.getTokenAccountBalance(p.usdc).then((b) => Number(b.value.amount) / 1e6).catch(() => 0);
      if (usdc < 25) {
        ixs.push(createAssociatedTokenAccountIdempotentInstruction(p.key.publicKey, p.usdc, p.key.publicKey, mint));
        ixs.push(await ix.faucet(bp, p.key.publicKey, mint, p.usdc));
      }
      if (!(await base.getAccountInfo(profilePda(p.key.publicKey)))) ixs.push(await ix.initProfile(bp, p.key.publicKey, names[i]));
      // One session key per player for the whole run (a player can sit in
      // several duels at once); it pays the delegation rent when it commits second.
      ixs.push(createSessionIx(p.key.publicKey, p.session.publicKey, Math.floor(Date.now() / 1000) + 3 * 3600, 0.04 * LAMPORTS_PER_SOL));
      await tx(base, ixs, [p.key, p.session], "player setup + session");
    }),
  );
  return players;
}

async function erDuel(id: number): Promise<DuelView | null> {
  const ai = await er.getAccountInfo(duelPda(id));
  if (!ai || !ai.owner.equals(PROGRAM_ID)) return null;
  return duelView(ep.coder.accounts.decode("duel", ai.data));
}
async function baseDuel(id: number): Promise<{ view: DuelView | null; owner: PublicKey | null }> {
  const ai = await base.getAccountInfo(duelPda(id));
  if (!ai) return { view: null, owner: null };
  return { view: ai.owner.equals(PROGRAM_ID) ? duelView(bp.coder.accounts.decode("duel", ai.data)) : null, owner: ai.owner };
}
async function until<T>(f: () => Promise<T | null | undefined | false>, ms: number, every = 1000): Promise<T | null> {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const v = await f().catch(() => null);
    if (v) return v as T;
    await sleep(every);
  }
  return null;
}
const usdcOf = (p: Player) => base.getTokenAccountBalance(p.usdc).then((b) => Number(b.value.amount) / 1e6);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const profileOf = (p: Player): Promise<any> => bp.account.profile.fetch(profilePda(p.key.publicKey));

function randomWeights(): number[] {
  const n = 3 + Math.floor(Math.random() * 3);
  const picks = [...SYMBOLS.keys()].sort(() => Math.random() - 0.5).slice(0, n);
  const w = new Array(SYMBOLS.length).fill(0);
  for (const i of picks) w[i] = 5;
  for (let left = 100 - 5 * n; left > 0; left -= 5) w[picks[Math.floor(Math.random() * n)]] += 5;
  return w;
}

/// Serialise table access: one open+join at a time per table.
const tableLocks = new Map<number, Promise<void>>();
async function seat(tier: number, a: Player, b: Player): Promise<number> {
  const prev = tableLocks.get(tier) ?? Promise.resolve();
  let release!: () => void;
  tableLocks.set(tier, new Promise<void>((r) => (release = r)));
  await prev;
  try {
    const { vault } = await bp.account.config.fetch(configPda());
    const t = await bp.account.table.fetch(tablePda(tier));
    if (!t.waiting.equals(PublicKey.default)) throw new Error(`table ${tier} busy (keeper bot or stranger running?)`);
    let id = 0;
    for (let attempt = 0; attempt < 5; attempt++) {
      id = (await bp.account.config.fetch(configPda())).duelCount.toNumber();
      try {
        await tx(base, [await ix.openDuel(bp, a.key.publicKey, tier, id, a.usdc, vault)], [a.key], "open");
        break;
      } catch (e) {
        if (attempt === 4) throw e;
        await sleep(500 + Math.random() * 1500); // another duel took this id
      }
    }
    try {
      await tx(base, [await ix.joinDuel(bp, b.key.publicKey, tier, id, b.usdc, vault)], [b.key], "join");
    } catch (e) {
      // Leave the table clean for the next scenario.
      await tx(base, [await ix.cancelDuel(bp, a.key.publicKey, tier, id, a.usdc, null, vault)], [a.key], "cancel open").catch(() => {});
      throw e;
    }
    return id;
  } finally {
    release();
  }
}

interface DuelPlan {
  label: string;
  tier: number;
  a: Player;
  b: Player;
  weights: [number[], number[]];
  commit: [boolean, boolean];
  reveal: [boolean, boolean];
  adversarial?: boolean;
}

async function commitAll(id: number, plan: DuelPlan, salts: [Uint8Array, Uint8Array]) {
  const ps = [plan.a, plan.b];
  for (const s of [0, 1] as const) {
    if (!plan.commit[s]) continue;
    const p = ps[s];
    const c = commitment(duelPda(id), p.key.publicKey, plan.weights[s], salts[s]);
    const ixs = [await ix.commitBasket(bp, p.session.publicKey, p.key.publicKey, id, c, sessionTokenPda(p.session.publicKey, p.key.publicKey))];
    if (s === 1 && plan.commit[0]) ixs.push(await ix.delegateDuel(bp, p.session.publicKey, id));
    await tx(base, ixs, [p.session], s === 1 && plan.commit[0] ? "commit + delegate" : "commit");
  }
}

async function runDuel(plan: DuelPlan) {
  const { a, b, tier } = plan;
  const stake = STAKES[tier];
  const before = { usdc: [await usdcOf(a), await usdcOf(b)], prof: [await profileOf(a), await profileOf(b)] };
  const id = await seat(tier, a, b);
  const tag = `[#${id} ${plan.label}]`;
  console.log(`${tag} ${short(a.key.publicKey)} vs ${short(b.key.publicKey)} on ${stake} USDC`);
  const salts: [Uint8Array, Uint8Array] = [randomSalt(), randomSalt()];
  const { vault } = await bp.account.config.fetch(configPda());

  if (plan.adversarial) {
    const stranger = Keypair.generate();
    await refused(`${tag} commit with a session token for another player`, tx(base, [await ix.commitBasket(bp, a.session.publicKey, b.key.publicKey, id, new Uint8Array(32).fill(9), sessionTokenPda(a.session.publicKey, a.key.publicKey))], [a.session], "x"), "Unauthorized");
    await send(base, [SystemProgram.transfer({ fromPubkey: crank.publicKey, toPubkey: stranger.publicKey, lamports: 0.002 * LAMPORTS_PER_SOL })], [crank]);
    await refused(`${tag} commit by a stranger without a session token`, tx(base, [await ix.commitBasket(bp, stranger.publicKey, a.key.publicKey, id, new Uint8Array(32).fill(9), null)], [stranger], "x"), "Unauthorized");
    await refused(`${tag} delegate before both commitments`, tx(base, [await ix.delegateDuel(bp, crank.publicKey, id)], [crank], "x"), "NotCommitted");
  }

  await commitAll(id, plan, salts);

  // Abandoned draft: nobody (or one) committed -> cancel after the grace period.
  if (!(plan.commit[0] && plan.commit[1])) {
    const d = (await baseDuel(id)).view!;
    await refused(`${tag} cancel before the draft deadline`, tx(base, [await ix.cancelDuel(bp, crank.publicKey, tier, id, a.usdc, b.usdc, vault)], [crank], "x"), "DraftNotOver");
    const wait = (d.draftDeadline + DRAFT_GRACE + 2) * 1000 - Date.now();
    await sleep(Math.max(0, wait));
    await tx(base, [await ix.cancelDuel(bp, crank.publicKey, tier, id, a.usdc, b.usdc, vault)], [crank], "cancel draft");
    const after = [await usdcOf(a), await usdcOf(b)];
    check(`${tag} abandoned draft refunds both stakes`, after[0] === before.usdc[0] && after[1] === before.usdc[1], `${before.usdc} -> ${after}`);
    check(`${tag} cancelled duel status`, (await baseDuel(id)).view?.status === STATUS.CANCELLED);
    return;
  }

  const t0 = Date.now();
  const onEr = await until(() => erDuel(id), 60_000, 300);
  time("delegation visible on ER", Date.now() - t0);
  check(`${tag} delegated: base owner is the delegation program`, !!onEr && !!(await baseDuel(id)).owner?.equals(DELEGATION_PROGRAM_ID));

  // Reveal on the ER (session keys).
  const ps = [a, b];
  if (plan.adversarial) {
    await refused(`${tag} reveal with a wrong salt`, tx(er, [await ix.revealBasket(ep, a.session.publicKey, id, plan.weights[0], randomSalt())], [a.session], "x"), "BadReveal");
    await refused(`${tag} reveal a different basket`, tx(er, [await ix.revealBasket(ep, a.session.publicKey, id, randomWeights(), salts[0])], [a.session], "x"), "BadReveal");
    const stranger = Keypair.generate();
    await refused(`${tag} reveal signed by a stranger on the ER`, tx(er, [await ix.revealBasket(ep, stranger.publicKey, id, plan.weights[0], salts[0])], [stranger], "x"), "Unauthorized");
    await refused(`${tag} start before both reveals`, tx(er, [await ix.startDuel(ep, crank.publicKey, id)], [crank], "x"), "NotRevealed");
  }
  for (const s of [0, 1] as const) {
    if (plan.reveal[s]) await tx(er, [await ix.revealBasket(ep, ps[s].session.publicKey, id, plan.weights[s], salts[s])], [ps[s].session], "reveal (ER)");
  }

  // Forfeit paths: wait out the reveal window, then start resolves it.
  if (!(plan.reveal[0] && plan.reveal[1])) {
    const d = (await erDuel(id))!;
    const deadline = d.revealDeadline || d.draftDeadline + DRAFT_GRACE + REVEAL_SECONDS;
    await sleep(Math.max(0, (deadline + 2) * 1000 - Date.now()));
    await tx(er, [await ix.startDuel(ep, crank.publicKey, id)], [crank], "start (forfeit)");
    const f = (await erDuel(id))!;
    const expectWinner = plan.reveal[0] ? 0 : plan.reveal[1] ? 1 : 2;
    check(`${tag} forfeit resolves: winner ${expectWinner}`, f.status === STATUS.FINISHED && f.forfeit && f.winner === expectWinner, `status ${f.status} winner ${f.winner}`);
  } else {
    await tx(er, [await ix.startDuel(ep, a.session.publicKey, id)], [a.session], "start + crank (ER)");
    let d = (await erDuel(id))!;
    check(`${tag} live with oracle reference prices`, d.status === STATUS.LIVE && d.startPrice.every((p) => p > 0n));
    if (plan.adversarial) {
      await refused(`${tag} mutation requested before its second`, tx(er, [await ix.requestMutation(ep, crank.publicKey, id, 0)], [crank], "x"), "TooEarly");
      await refused(`${tag} rebalance changing the asset set`, tx(er, [await ix.rebalance(ep, a.session.publicKey, id, randomWeights().map((x, i) => (d.weights[0][i] > 0 ? 0 : x)))], [a.session], "x"), "BadBasket");
      // A forged VRF callback: signed by a random key instead of the VRF program identity.
      const forger = Keypair.generate();
      const forged = await ep.methods.applyMutation(Array(32).fill(7), 0).accountsPartial({ vrfProgramIdentity: forger.publicKey, duel: duelPda(id) }).instruction();
      await refused(`${tag} forged VRF callback`, tx(er, [forged], [crank, forger], "x"), "ConstraintAddress");
      await refused(`${tag} finish before the end`, tx(er, [await ix.finishDuel(ep, crank.publicKey, id)], [crank], "x"), "BadStatus");
      await refused(`${tag} settle while the duel is on the ER`, tx(base, [await ix.settle(bp, crank.publicKey, id, [a.key.publicKey, b.key.publicKey], [a.usdc, b.usdc], vault)], [crank], "x"), "AccountOwnedByWrongProgram");
    }
    const requested = new Set<number>();
    const rebalances = [0, 0];
    let ticksSeen = 0;
    const tStart = d.startTs;
    while (d.status === STATUS.LIVE) {
      await sleep(2000);
      d = (await erDuel(id)) ?? d;
      const el = Math.floor(Date.now() / 1000) - tStart;
      for (let m = 0; m < 3; m++) {
        if (el >= MUTATION_AT[m] && !requested.has(m) && d.mutations[m].state === "hidden") {
          requested.add(m);
          const t = Date.now();
          await tx(er, [await ix.requestMutation(ep, crank.publicKey, id, m)], [crank], "VRF request (ER)").catch(() => {});
          const landed = await until(async () => ((await erDuel(id))?.mutations[m].state === "applied" ? true : null), 30_000, 300);
          time("VRF request -> callback applied", Date.now() - t);
          check(`${tag} VRF mutation ${m} applied`, !!landed);
          if (plan.adversarial && m === 0) await refused(`${tag} same mutation requested twice`, tx(er, [await ix.requestMutation(ep, crank.publicKey, id, 0)], [crank], "x"), "AlreadyRequested");
        }
      }
      // Rebalance each player twice at ~100 s and ~200 s, then try a third.
      for (const s of [0, 1] as const) {
        const due = rebalances[s] < 2 && el > 100 + 100 * rebalances[s] + s * 5;
        if (!due) continue;
        const w = [...d.weights[s]];
        const legs = w.map((_, i) => i).filter((i) => w[i] > 0 && SYMBOLS[i] !== d.frozen);
        if (legs.length < 2 || w[legs[0]] <= 5) {
          rebalances[s]++;
          continue;
        }
        w[legs[0]] -= 5;
        w[legs[1]] += 5;
        await tx(er, [await ix.rebalance(ep, ps[s].session.publicKey, id, w)], [ps[s].session], "rebalance (ER)");
        rebalances[s]++;
        if (rebalances[s] === 2 && s === 0) {
          const w3 = [...w];
          w3[legs[1]] -= 5;
          w3[legs[0]] += 5;
          await refused(`${tag} third rebalance`, tx(er, [await ix.rebalance(ep, a.session.publicKey, id, w3)], [a.session], "x"), "NoRebalanceLeft");
        }
      }
      ticksSeen = d.ticks;
      if (el > DUEL_SECONDS + 60) break;
    }
    check(`${tag} finished on time by the crank`, d.status === STATUS.FINISHED, `ticks ${ticksSeen}, status ${d.status}`);
    check(`${tag} crank ticked ~1/s`, d.ticks >= DUEL_SECONDS * 0.9, `${d.ticks} ticks in ${DUEL_SECONDS}s`);
    const kinds = d.mutations.map((m) => m.kind).sort().join(",");
    check(`${tag} three different mutation kinds`, kinds === "DOUBLE,FREEZE,SWAP", d.mutations.map((m) => m.label).join(" | "));
    check(`${tag} winner matches scores`, d.winner === (d.score[0] > d.score[1] ? 0 : d.score[1] > d.score[0] ? 1 : 2), `${d.score[0].toFixed(4)}% vs ${d.score[1].toFixed(4)}%`);
  }

  const final = (await erDuel(id))!;
  const t1 = Date.now();
  await tx(er, [await ix.finishDuel(ep, crank.publicKey, id)], [crank], "finish (commit+undelegate)");
  const back = await until(async () => {
    const x = await baseDuel(id);
    return x.view?.status === STATUS.FINISHED ? x.view : null;
  }, 90_000, 500);
  time("undelegation back on Solana", Date.now() - t1);
  check(`${tag} committed state on Solana equals the ER state`, !!back && back.score[0] === final.score[0] && back.score[1] === final.score[1] && back.winner === final.winner && back.ticks === final.ticks);

  if (plan.adversarial) {
    await refused(`${tag} settle paying the winner's share to a wrong account`, tx(base, [await ix.settle(bp, crank.publicKey, id, [a.key.publicKey, b.key.publicKey], [b.usdc, a.usdc], vault)], [crank], "x"), "BadTokenAccount");
  }
  await tx(base, [await ix.settle(bp, crank.publicKey, id, [a.key.publicKey, b.key.publicKey], [a.usdc, b.usdc], vault)], [crank], "settle");
  if (plan.adversarial) {
    await refused(`${tag} settle twice`, tx(base, [await ix.settle(bp, crank.publicKey, id, [a.key.publicKey, b.key.publicKey], [a.usdc, b.usdc], vault)], [crank], "x"), "BadStatus");
  }

  // Trophy: only the winner of a settled duel, once.
  if (final.winner < 2) {
    const winner = ps[final.winner];
    const loser = ps[1 - final.winner];
    await refused(`${tag} loser minting the trophy`, tx(base, [await ix.mintTrophy(bp, loser.key.publicKey, id)], [loser.key], "x"), "NotTheWinner");
    await tx(base, [await ix.mintTrophy(bp, winner.key.publicKey, id)], [winner.key], "mint trophy");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t: any = await bp.account.trophy.fetch(trophyPda(duelPda(id)));
    check(`${tag} trophy records the winning basket`, t.owner.equals(winner.key.publicKey) && Array.from(t.weights as number[]).join() === final.startWeights[final.winner].join());
    if (plan.adversarial) await refused(`${tag} trophy minted twice`, tx(base, [await ix.mintTrophy(bp, winner.key.publicKey, id)], [winner.key], "x"), "already in use");
  } else {
    await refused(`${tag} trophy for a draw`, tx(base, [await ix.mintTrophy(bp, a.key.publicKey, id)], [a.key], "x"), "NotTheWinner");
  }

  const after = { usdc: [await usdcOf(a), await usdcOf(b)], prof: [await profileOf(a), await profileOf(b)] };
  const w = final.winner;
  const delta = after.usdc.map((x, i) => Math.round((x - before.usdc[i]) * 100) / 100);
  const pot = Math.round(stake * 2 * 0.95 * 100) / 100;
  const expected = w === 2 ? [0, 0] : w === 0 ? [Math.round((pot - stake) * 100) / 100, -stake] : [-stake, Math.round((pot - stake) * 100) / 100];
  check(`${tag} payout (winner ${w})`, delta[0] === expected[0] && delta[1] === expected[1], `deltas ${delta} expected ${expected}`);
  for (const s of [0, 1]) {
    const pb = before.prof[s];
    const pa = after.prof[s];
    const res = w === 2 ? "draw" : w === s ? "win" : "loss";
    const pts = res === "win" ? pb.points + 20 : res === "loss" ? Math.max(0, pb.points - 16) : pb.points;
    const ok = pa.points === pts && pa.games === pb.games + 1 && pa.wins === pb.wins + (res === "win" ? 1 : 0) && pa.losses === pb.losses + (res === "loss" ? 1 : 0) && pa.draws === pb.draws + (res === "draw" ? 1 : 0);
    const head = pa.history[pa.historyHead];
    check(`${tag} profile ${s} (${res}): points, record, history`, ok && head.duel.equals(duelPda(id)), `${pb.points} -> ${pa.points} pts, streak ${pa.streak}`);
  }
}

async function main() {
  const t0 = Date.now();
  const admin = adminKeypair();
  const sol0 = (await base.getBalance(admin.publicKey)) / LAMPORTS_PER_SOL;
  const config = await bp.account.config.fetch(configPda());
  const players = await loadPlayers(config.usdcMint);
  console.log(`battery: ${players.length} players, ${ROUNDS} round(s), program ${short(PROGRAM_ID)}, admin ${sol0.toFixed(3)} SOL`);
  // Clear tables a previous interrupted run left with a battery player waiting.
  for (let tier = 0; tier < STAKES.length; tier++) {
    const t = await bp.account.table.fetch(tablePda(tier));
    if (t.waiting.equals(PublicKey.default)) continue;
    const d = await bp.account.duel.fetch(t.waiting);
    const opener = players.find((x) => x.key.publicKey.equals(d.players[0]));
    if (opener) await tx(base, [await ix.cancelDuel(bp, opener.key.publicKey, tier, d.id.toNumber(), opener.usdc, null, config.vault)], [opener.key], "cancel stale open");
  }
  const p = (i: number) => players[i % players.length];
  for (let r = 0; r < ROUNDS; r++) {
    // Every seat in a round is a different player, so balance and profile
    // deltas can be checked per duel; pairings rotate between rounds.
    const o = r * 3;
    const same = randomWeights();
    const plans: DuelPlan[] = [
      { label: "regular 1", tier: 0, a: p(o), b: p(o + 1), weights: [randomWeights(), randomWeights()], commit: [true, true], reveal: [true, true], adversarial: true },
      { label: "regular 5", tier: 1, a: p(o + 2), b: p(o + 3), weights: [randomWeights(), randomWeights()], commit: [true, true], reveal: [true, true] },
      { label: "regular 20", tier: 2, a: p(o + 4), b: p(o + 5), weights: [randomWeights(), randomWeights()], commit: [true, true], reveal: [true, true] },
      { label: "mirror", tier: 0, a: p(o + 6), b: p(o + 7), weights: [same, [...same]], commit: [true, true], reveal: [true, true] },
      { label: "forfeit", tier: 1, a: p(o + 8), b: p(o + 9), weights: [randomWeights(), randomWeights()], commit: [true, true], reveal: [true, false] },
      { label: "no-show", tier: 2, a: p(o + 10), b: p(o + 11), weights: [randomWeights(), randomWeights()], commit: [true, true], reveal: [false, false] },
      { label: "abandoned", tier: 0, a: p(o + 12), b: p(o + 13), weights: [randomWeights(), randomWeights()], commit: [true, false], reveal: [false, false] },
    ];
    const only = process.env.ONLY?.split(",");
    const run = only ? plans.filter((x) => only.includes(x.label)) : plans;
    const res = await Promise.allSettled(run.map(runDuel));
    res.forEach((x, i) => {
      if (x.status === "rejected") check(`[${run[i].label}] completed`, false, String(x.reason?.message ?? x.reason).split("\n").slice(0, 4).join(" | "));
    });
  }
  const sol1 = (await base.getBalance(admin.publicKey)) / LAMPORTS_PER_SOL;
  const passed = checks.filter((c) => c.ok).length;
  const lines = [
    `# Battery report`,
    ``,
    `Run ${new Date().toISOString()} · program \`${PROGRAM_ID.toBase58()}\` · ${players.length} players · ${ROUNDS} round(s) · ${Math.round((Date.now() - t0) / 1000)} s`,
    ``,
    `**${passed} / ${checks.length} checks passed.** Admin SOL ${sol0.toFixed(4)} -> ${sol1.toFixed(4)} (funding players).`,
    ``,
    `## Latencies`,
    ``,
    `| step | n | median ms | max ms |`,
    `|---|---|---|---|`,
    ...Object.entries(timings)
      .filter(([k]) => k !== "x")
      .map(([k, v]) => {
        const s = [...v].sort((x, y) => x - y);
        return `| ${k} | ${s.length} | ${s[Math.floor(s.length / 2)]} | ${s[s.length - 1]} |`;
      }),
    ``,
    `## Checks`,
    ``,
    ...checks.map((c) => `- ${c.ok ? "✅" : "❌"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`),
    ...(notes.length ? ["", "## Notes", "", ...notes.map((n) => `- ${n}`)] : []),
    ``,
  ];
  fs.writeFileSync(path.join(__dirname, "..", "BATTERY.md"), lines.join("\n"));
  console.log(`\n${passed}/${checks.length} checks passed; admin SOL ${sol0.toFixed(4)} -> ${sol1.toFixed(4)}; report in BATTERY.md`);
  process.exit(passed === checks.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
