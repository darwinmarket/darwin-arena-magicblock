// Turn chain errors into short sentences for the UI (never raw InstructionError JSON).
import idl from "./idl/darwin_arena.json";

const SYSTEM_AND_ANCHOR: Record<number, string> = {
  0: "That seat was just taken, try again",
  1: "Not enough SOL for this transaction",
  2006: "Someone just took that seat, try again",
  2012: "Unexpected account",
  3007: "This duel is on the rollup right now",
  3012: "Account not created yet",
};

const FRIENDLY: Record<string, string> = {
  FaucetCooldown: "Test USDC faucet busy, try again",
  TableBusy: "Someone just sat at this table, try again",
  NotWaiting: "That duel was just taken, try again",
  SelfDuel: "You are already waiting at this table",
  InsufficientFunds: "Not enough test USDC for this table",
  SessionExpired: "Your session key expired: find a new match to renew it",
  DraftOver: "The draft is over",
  NoRebalanceLeft: "No rebalance left this duel",
  FrozenAsset: "A frozen asset cannot be rebalanced",
  BadBasket: "Invalid basket: 3 to 5 assets, 5 % steps, 100 % total",
  BadDuelId: "Someone just opened a duel, try again",
};

/// The program / system / Anchor error code in a failed transaction, if any.
export function errorCode(e: unknown): number | null {
  const m = /"Custom":(\d+)/.exec(String((e as Error)?.message ?? e));
  return m ? Number(m[1]) : null;
}

export function errorName(code: number): string | null {
  return idl.errors.find((x) => x.code === code)?.name ?? null;
}

/// A short, human sentence for any error thrown while sending a transaction.
export function friendlyError(e: unknown): string {
  const msg = String((e as Error)?.message ?? e);
  const code = errorCode(e);
  if (code !== null) {
    const name = errorName(code);
    if (name) return FRIENDLY[name] ?? idl.errors.find((x) => x.code === code)?.msg ?? name;
    if (SYSTEM_AND_ANCHOR[code]) return SYSTEM_AND_ANCHOR[code];
    return `Transaction refused (code ${code})`;
  }
  if (/User rejected|rejected the request/i.test(msg)) return "Cancelled in the wallet";
  if (/insufficient lamports|InsufficientFunds|0x1\b/.test(msg)) return "Not enough SOL for this transaction";
  if (/not confirmed/i.test(msg)) return "The network did not confirm in time, try again";
  if (/InstructionError|\{"/.test(msg)) return "Transaction refused by the network";
  return msg.slice(0, 140);
}
