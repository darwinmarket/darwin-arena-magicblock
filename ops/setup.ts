// One-time setup: the test-USDC mint (mint authority = the config PDA), the
// vault (the config's token account), the config itself and the three tables.
// Idempotent: re-running only does what is missing.
//
//   npx tsx ops/setup.ts                 # devnet
//   ARENA_ENV=local npx tsx ops/setup.ts # local validator
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
} from "@solana/spl-token";
import { Keypair, SystemProgram } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { ix } from "../src/lib/chain/arena";
import { PROGRAM_ID, STAKES, TOKEN_PROGRAM_ID, USDC_DECIMALS } from "../src/lib/chain/constants";
import { ataOf, configPda, tablePda } from "../src/lib/chain/pdas";
import { adminKeypair, baseConnection, baseProgram, KEY_DIR, LOCAL, loadKeypair, sendLogged } from "./lib/env";

async function main() {
  const conn = baseConnection();
  const program = baseProgram();
  const admin = adminKeypair();
  const config = configPda();
  console.log(`program ${PROGRAM_ID.toBase58()} on ${LOCAL ? "localnet" : "devnet"}`);

  const existing = await program.account.config.fetchNullable(config);
  if (!existing) {
    // A fresh mint per program id, kept so re-runs agree.
    const mintFile = path.join(KEY_DIR, `usdc-mint-${PROGRAM_ID.toBase58().slice(0, 8)}${LOCAL ? "-local" : ""}.json`);
    let mint: Keypair;
    if (fs.existsSync(mintFile)) mint = loadKeypair(mintFile);
    else {
      mint = Keypair.generate();
      fs.writeFileSync(mintFile, JSON.stringify(Array.from(mint.secretKey)), { mode: 0o600 });
    }
    const vault = ataOf(config, mint.publicKey);
    const ixs = [];
    if (!(await conn.getAccountInfo(mint.publicKey))) {
      ixs.push(
        SystemProgram.createAccount({
          fromPubkey: admin.publicKey,
          newAccountPubkey: mint.publicKey,
          lamports: await getMinimumBalanceForRentExemptMint(conn),
          space: MINT_SIZE,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMint2Instruction(mint.publicKey, USDC_DECIMALS, config, null),
      );
    }
    ixs.push(createAssociatedTokenAccountIdempotentInstruction(admin.publicKey, vault, config, mint.publicKey));
    ixs.push(await ix.initialize(program, admin.publicKey, mint.publicKey, vault));
    await sendLogged(conn, "initialize", ixs, ixs.length > 2 ? [admin, mint] : [admin]);
  } else {
    console.log("  config exists");
  }

  for (let tier = 0; tier < STAKES.length; tier++) {
    if (await conn.getAccountInfo(tablePda(tier))) continue;
    await sendLogged(conn, `init_table ${STAKES[tier]} USDC`, [await ix.initTable(program, admin.publicKey, tier)], [admin]);
  }
  const c = await program.account.config.fetch(config);
  console.log(`  config ${config.toBase58()}\n  usdc   ${c.usdcMint.toBase58()}\n  vault  ${c.vault.toBase58()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
