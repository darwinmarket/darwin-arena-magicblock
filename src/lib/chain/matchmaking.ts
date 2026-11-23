// Sitting at a table, race-proof. Used by the front, the keeper, the practice
// bot and the battery.
//
// Two players can act on the same table at the same moment: both open (the
// second finds the table busy), both join the same waiting duel (the second
// finds it taken), or two tables' openers pick the same new duel id. Each of
// those fails cleanly on chain, so on any of them we re-read the table and the
// counter, rebuild (joining the duel that is now waiting, if any) and resend.
import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { ix, type ArenaProgram } from "./arena";
import { errorCode, errorName } from "./errors";
import { configPda, tablePda } from "./pdas";

/// A free id somewhere in the window above the counter (see open_duel).
export function pickDuelId(count: number): number {
  return count + Math.floor(Math.random() * 256);
}

const RACE_NAMES = new Set(["TableBusy", "NotWaiting", "BadStatus", "BadDuelId"]);
export function isSeatRace(e: unknown): boolean {
  const code = errorCode(e);
  if (code === null) return false;
  if (code === 0 || code === 2006) return true; // id taken, seeds moved
  const name = errorName(code);
  return !!name && RACE_NAMES.has(name);
}

export interface SeatResult {
  id: number;
  joined: boolean;
  signature: string | null;
  attempts: number;
}

export async function seatAtTable(o: {
  program: ArenaProgram;
  player: PublicKey;
  tier: number;
  playerUsdc: PublicKey;
  vault: PublicKey;
  /// Sent with the seat (profile, faucet, session key...). Reverted with it on failure.
  extra?: TransactionInstruction[];
  /// Also sent with the seat when joining (e.g. a bot's commitment), given the duel id.
  afterJoin?: (id: number) => Promise<TransactionInstruction[]>;
  send: (ixs: TransactionInstruction[]) => Promise<string>;
  tries?: number;
}): Promise<SeatResult> {
  const tries = o.tries ?? 5;
  for (let attempt = 1; ; attempt++) {
    const table = await o.program.account.table.fetch(tablePda(o.tier));
    let id: number;
    let joined = false;
    const seat: TransactionInstruction[] = [];
    if (!table.waiting.equals(PublicKey.default)) {
      const w = await o.program.account.duel.fetch(table.waiting);
      id = w.id.toNumber();
      if (w.players[0].equals(o.player)) return { id, joined: false, signature: null, attempts: attempt };
      joined = true;
      seat.push(await ix.joinDuel(o.program, o.player, o.tier, id, o.playerUsdc, o.vault));
      if (o.afterJoin) seat.push(...(await o.afterJoin(id)));
    } else {
      const count = (await o.program.account.config.fetch(configPda())).duelCount.toNumber();
      id = pickDuelId(count);
      seat.push(await ix.openDuel(o.program, o.player, o.tier, id, o.playerUsdc, o.vault));
    }
    try {
      const signature = await o.send([...(o.extra ?? []), ...seat]);
      return { id, joined, signature, attempts: attempt };
    } catch (e) {
      if (attempt >= tries || !isSeatRace(e)) throw e;
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 900));
    }
  }
}
