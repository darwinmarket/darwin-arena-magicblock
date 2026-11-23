// Print a duel as both layers see it.  npx tsx ops/inspect.ts <id>
import { DELEGATION_PROGRAM_ID, PROGRAM_ID } from "../src/lib/chain/constants";
import { duelView } from "../src/lib/chain/duel";
import { duelPda } from "../src/lib/chain/pdas";
import { baseConnection, baseProgram, erConnection } from "./lib/env";

async function main() {
  const id = Number(process.argv[2]);
  const bp = baseProgram();
  for (const [name, conn] of [["base", baseConnection()], ["er", erConnection()]] as const) {
    const ai = await conn.getAccountInfo(duelPda(id));
    if (!ai) {
      console.log(name, "missing");
      continue;
    }
    const owner = ai.owner.equals(PROGRAM_ID) ? "program" : ai.owner.equals(DELEGATION_PROGRAM_ID) ? "delegation" : ai.owner.toBase58();
    if (!ai.owner.equals(PROGRAM_ID)) {
      console.log(name, "owner", owner);
      continue;
    }
    const v = duelView(bp.coder.accounts.decode("duel", ai.data));
    const { startPrice, lastPrice, moves, ...rest } = v;
    void startPrice; void lastPrice; void moves;
    console.log(name, "owner", owner, JSON.stringify(rest, (_k, x) => (typeof x === "bigint" ? x.toString() : x?._bn ? x.toBase58() : x), 0));
  }
}
main();
