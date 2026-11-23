// Give the ops-created players realistic handles on chain (set_name): the
// battery players get generated gamer handles, the keeper's bots an explicit
// bot name. Only profiles whose keys live in ~/.config/darwin-arena are touched.
//
//   npx tsx ops/rename-profiles.ts
import fs from "fs";
import path from "path";
import { ix } from "../src/lib/chain/arena";
import { profilePda } from "../src/lib/chain/pdas";
import { uniqueHandles } from "./lib/handles";
import { baseConnection, baseProgram, KEY_DIR, loadKeypair, namedKeypair, send } from "./lib/env";

async function main() {
  const conn = baseConnection();
  const program = baseProgram();
  const dir = path.join(KEY_DIR, "battery");
  const battery = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => /^p\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1))).map((f) => loadKeypair(path.join(dir, f)))
    : [];
  const handles = uniqueHandles(battery.map((k) => k.publicKey.toBase58()));
  const targets = [
    ...battery.map((key, i) => ({ key, name: handles[i] })),
    { key: namedKeypair("bot1"), name: "Arena Bot 1" },
    { key: namedKeypair("bot2"), name: "Arena Bot 2" },
  ];
  for (const { key, name } of targets) {
    const p = await program.account.profile.fetchNullable(profilePda(key.publicKey));
    if (!p) continue;
    const current = new TextDecoder().decode(Uint8Array.from(p.name)).replace(/\0+$/, "");
    if (current === name) continue;
    await send(conn, [await ix.setName(program, key.publicKey, name)], [key], { label: "set_name" });
    console.log(`  ${current.padEnd(20)} -> ${name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
