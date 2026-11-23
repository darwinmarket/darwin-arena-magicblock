// The arena keeper: the little that cannot be scheduled on chain, plus a bot
// opponent so a solo player always finds a match.
//
// Everything it sends is permissionless (any client may send the same
// instructions, and the front does), so the keeper is a convenience, not a
// trusted party: it cannot choose a mutation, move a basket or redirect a payout.
//
//   delegate   a duel whose two baskets are committed, if nobody delegated it
//   start      once both baskets are revealed (or the reveal window passed)
//   mutations  ask MagicBlock's VRF for mutation i once its second has come
//   tick       only if the on-chain crank stalls (it normally runs itself)
//   finish     commit + undelegate when the clock has run out
//   settle     pay out on Solana and update both profiles
//   cancel     refund a draft that ran out
//   bot        sit at a table where a human has been waiting BOT_WAIT seconds
//
//   npx tsx ops/keeper.ts            (BOT_WAIT=8, BOTS=bot1,bot2)
import { createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import { Keypair, PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { utils } from "@coral-xyz/anchor";
import { ix } from "../src/lib/chain/arena";
import { DELEGATION_PROGRAM_ID, DRAFT_SECONDS, DUEL_SECONDS, MUTATION_AT, PROGRAM_ID, STAKES, STATUS, SYMBOLS } from "../src/lib/chain/constants";
import { commitment, duelView, randomSalt, type DuelView } from "../src/lib/chain/duel";
import { ataOf, configPda, duelPda, profilePda, tablePda } from "../src/lib/chain/pdas";
import { baseConnection, baseProgram, erConnection, erProgram, namedKeypair, send, short, sleep } from "./lib/env";

const base = baseConnection();
const er = erConnection();
const bp = baseProgram();
const ep = erProgram();
const crank = namedKeypair("crank");
const BOT_WAIT = Number(process.env.BOT_WAIT ?? 8);
const BOTS = (process.env.BOTS ?? "bot1,bot2").split(",").filter(Boolean).map((n) => ({ name: n, key: namedKeypair(n) }));
const BOT_NAMES: Record<string, string> = { bot1: "Arena Bot 1", bot2: "Arena Bot 2" };
const DRAFT_GRACE = 30;

/// Baskets the bots hold until revealed: duel id -> weights + salt.
const botBaskets = new Map<number, { bot: Keypair; weights: number[]; salt: Uint8Array; rebalanced: boolean }>();
/// Avoid re-sending the same action every loop while it confirms.
const inflight = new Map<string, number>();

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function act(key: string, label: string, conn: typeof base, ixs: () => Promise<TransactionInstruction[]>, signers: Keypair[], cooldown = 8000) {
  const last = inflight.get(key) ?? 0;
  if (Date.now() - last < cooldown) return;
  inflight.set(key, Date.now());
  try {
    const sig = await send(conn, await ixs(), signers, { tries: 40, delayMs: 400, label });
    log(`${label.padEnd(30)} ${sig.slice(0, 16)}…`);
  } catch (e) {
    log(`${label.padEnd(30)} failed: ${String((e as Error).message).split("\n").slice(0, 3).join(" | ").slice(0, 300)}`);
  }
}

function randomBasket(): number[] {
  const n = 3 + Math.floor(Math.random() * 3);
  const picks = [...SYMBOLS.keys()].sort(() => Math.random() - 0.5).slice(0, n);
  const w = new Array(SYMBOLS.length).fill(0);
  let left = 100 - 5 * n;
  for (const i of picks) w[i] = 5;
  while (left > 0) {
    w[picks[Math.floor(Math.random() * n)]] += 5;
    left -= 5;
  }
  return w;
}

async function ensureBotReady(bot: { name: string; key: Keypair }, mint: PublicKey, stake: number) {
  const usdc = ataOf(bot.key.publicKey, mint);
  const bal = await base.getTokenAccountBalance(usdc).then((b) => Number(b.value.amount) / 1e6).catch(() => 0);
  const ixs: TransactionInstruction[] = [];
  if (bal < stake) {
    ixs.push(createAssociatedTokenAccountIdempotentInstruction(bot.key.publicKey, usdc, bot.key.publicKey, mint));
    ixs.push(await ix.faucet(bp, bot.key.publicKey, mint, usdc));
  }
  if (!(await base.getAccountInfo(profilePda(bot.key.publicKey)))) ixs.push(await ix.initProfile(bp, bot.key.publicKey, BOT_NAMES[bot.name] ?? bot.name));
  if (ixs.length) await send(base, ixs, [bot.key], { label: `${bot.name} ready` });
  return usdc;
}

async function botTables(mint: PublicKey, vault: PublicKey, busyBots: Set<string>) {
  const now = Math.floor(Date.now() / 1000);
  for (let tier = 0; tier < STAKES.length; tier++) {
    const t = await bp.account.table.fetch(tablePda(tier));
    if (t.waiting.equals(PublicKey.default) || now - t.waitingSince.toNumber() < BOT_WAIT) continue;
    const d = await bp.account.duel.fetch(t.waiting);
    if (BOTS.some((b) => b.key.publicKey.equals(d.players[0]))) continue;
    const bot = BOTS.find((b) => !busyBots.has(b.name));
    if (!bot) continue;
    busyBots.add(bot.name);
    const id = d.id.toNumber();
    const weights = randomBasket();
    const salt = randomSalt();
    await act(`join-${id}`, `bot ${bot.name} joins #${id}`, base, async () => {
      const usdc = await ensureBotReady(bot, mint, STAKES[tier]);
      return [
        await ix.joinDuel(bp, bot.key.publicKey, tier, id, usdc, vault),
        // The bot signs as itself (a keypair can sign rollup transactions), so
        // its wallet is its "session key".
        await ix.commitBasket(bp, bot.key.publicKey, bot.key.publicKey, id, commitment(duelPda(id), bot.key.publicKey, weights, salt), null),
      ];
    }, [bot.key]);
    botBaskets.set(id, { bot: bot.key, weights, salt, rebalanced: false });
  }
}

async function erDuel(id: number): Promise<DuelView | null> {
  const ai = await er.getAccountInfo(duelPda(id));
  if (!ai || !ai.owner.equals(PROGRAM_ID)) return null;
  return duelView(ep.coder.accounts.decode("duel", ai.data));
}

async function handle(id: number, mint: PublicKey, vault: PublicKey, busyBots: Set<string>) {
  const ai = await base.getAccountInfo(duelPda(id));
  if (!ai) return "gone";
  const now = Math.floor(Date.now() / 1000);
  const bot = botBaskets.get(id);
  const botName = bot && BOTS.find((b) => b.key.publicKey.equals(bot.bot.publicKey))?.name;

  if (ai.owner.equals(DELEGATION_PROGRAM_ID)) {
    if (botName) busyBots.add(botName);
    const d = await erDuel(id);
    if (!d) return "delegated";
    if (d.status === STATUS.DRAFTING) {
      if (bot) {
        const slot = d.players[1]?.equals(bot.bot.publicKey) ? 1 : 0;
        if (!d.revealed[slot]) await act(`reveal-${id}`, `bot reveals #${id}`, er, async () => [await ix.revealBasket(ep, bot.bot.publicKey, id, bot.weights, bot.salt)], [bot.bot], 4000);
      }
      const deadline = d.revealDeadline || d.draftDeadline + DRAFT_GRACE + 45;
      if ((d.revealed[0] && d.revealed[1]) || now > deadline) {
        await act(`start-${id}`, `start #${id}`, er, async () => [await ix.startDuel(ep, crank.publicKey, id)], [crank], 4000);
      }
    } else if (d.status === STATUS.LIVE) {
      const elapsed = now - d.startTs;
      for (let m = 0; m < 3; m++) {
        if (elapsed >= MUTATION_AT[m] && d.mutations[m].state === "hidden") {
          await act(`mut-${id}-${m}`, `VRF mutation ${m} #${id}`, er, async () => [await ix.requestMutation(ep, crank.publicKey, id, m)], [crank], 10_000);
        }
      }
      if (now - d.lastTickTs > 6) {
        await act(`tick-${id}`, `fallback tick #${id}`, er, async () => [await ix.tick(ep, id)], [crank], 3000);
      }
      if (bot && !bot.rebalanced && elapsed > 90 + Math.random() * 120) {
        bot.rebalanced = true;
        const slot = d.players[1]?.equals(bot.bot.publicKey) ? 1 : 0;
        const w = [...d.weights[slot]];
        const legs = w.map((_, i) => i).filter((i) => w[i] > 0 && SYMBOLS[i] !== d.frozen);
        if (legs.length >= 2) {
          const [from, to] = [...legs].sort((a, b) => (d.moves[SYMBOLS[a]] ?? 0) - (d.moves[SYMBOLS[b]] ?? 0));
          const shift = Math.min(w[from] - 5, 10);
          if (shift > 0) {
            w[from] -= shift;
            w[to] += shift;
            await act(`rebal-${id}`, `bot rebalances #${id}`, er, async () => [await ix.rebalance(ep, bot.bot.publicKey, id, w)], [bot.bot]);
          }
        }
      }
      if (elapsed > DUEL_SECONDS + 15) {
        await act(`finish-${id}`, `finish (late) #${id}`, er, async () => [await ix.finishDuel(ep, crank.publicKey, id)], [crank], 10_000);
      }
    } else if (d.status === STATUS.FINISHED) {
      await act(`finish-${id}`, `finish #${id} winner ${d.winner}`, er, async () => [await ix.finishDuel(ep, crank.publicKey, id)], [crank], 10_000);
    }
    return "delegated";
  }

  if (!ai.owner.equals(PROGRAM_ID)) return "gone";
  const d = duelView(bp.coder.accounts.decode("duel", ai.data));
  if (d.status === STATUS.DRAFTING) {
    if (botName) busyBots.add(botName);
    if (d.committed[0] && d.committed[1]) {
      await act(`delegate-${id}`, `delegate #${id}`, base, async () => [await ix.delegateDuel(bp, crank.publicKey, id)], [crank], 6000);
    } else if (now > d.draftDeadline + DRAFT_GRACE + 2) {
      const [p0, p1] = d.players;
      await act(`cancel-${id}`, `cancel draft #${id}`, base, async () => [await ix.cancelDuel(bp, crank.publicKey, d.tier, id, ataOf(p0, mint), ataOf(p1!, mint), vault)], [crank], 20_000);
    }
    return "draft";
  }
  if (d.status === STATUS.FINISHED) {
    const [p0, p1] = d.players;
    await act(`settle-${id}`, `settle #${id}`, base, async () => [await ix.settle(bp, crank.publicKey, id, [p0, p1!], [ataOf(p0, mint), ataOf(p1!, mint)], vault)], [crank], 10_000);
    return "settling";
  }
  if (d.status === STATUS.OPEN) return "open";
  botBaskets.delete(id);
  return "done";
}

async function main() {
  const config = await bp.account.config.fetch(configPda());
  const mint = config.usdcMint;
  const vault = config.vault;
  log(`keeper up: program ${short(PROGRAM_ID)}, crank ${short(crank.publicKey)}, bots ${BOTS.map((b) => `${b.name}=${short(b.key.publicKey)}`).join(" ")}, bot wait ${BOT_WAIT}s`);
  // Duel ids are picked in a window above the counter, so they are sparse: find
  // the duels that need attention by status (on Solana), and keep following
  // them while they live on the rollup.
  const tracked = new Set<number>();
  const STATUS_OFFSET = 8 + 8 + 1 + 8 + 64;
  for (;;) {
    try {
      for (const status of [STATUS.OPEN, STATUS.DRAFTING, STATUS.FINISHED]) {
        const found = await bp.account.duel.all([{ memcmp: { offset: STATUS_OFFSET, bytes: utils.bytes.bs58.encode(Uint8Array.of(status)) } }]);
        for (const { account } of found) tracked.add(account.id.toNumber());
      }
      const busyBots = new Set<string>();
      for (const id of [...tracked]) {
        const st = await handle(id, mint, vault, busyBots);
        if (st === "done" || st === "gone") tracked.delete(id);
      }
      await botTables(mint, vault, busyBots);
    } catch (e) {
      log("loop error", String((e as Error).message).slice(0, 200));
    }
    await sleep(1500);
  }
}

void DRAFT_SECONDS;
main();
