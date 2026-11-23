// A full game through the real front, in headless Chromium, against devnet and
// the MagicBlock ER: burner wallet -> faucet -> 1 USDC table -> the keeper's bot
// joins -> draft + lock -> live duel (crank ticks, VRF mutations, a rebalance)
// -> result -> dashboard. Needs `npm run dev -- -p 3040` and `npm run keeper`,
// or PRACTICE=1 to play the in-browser practice bot instead of the keeper's.
//
//   npx tsx ops/test/ui.ts            (screenshots in $SHOTS, default /tmp/darwin-ui)
import { Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { chromium, type Page } from "playwright";
import { adminKeypair, baseConnection, send } from "../lib/env";

const URL = process.env.APP_URL ?? "http://localhost:3040";
const SHOTS = process.env.SHOTS ?? "/tmp/darwin-ui";

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false });
  console.log(`  [shot] ${name}`);
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const burner = Keypair.generate();
  const conn = baseConnection();
  await send(conn, [SystemProgram.transfer({ fromPubkey: adminKeypair().publicKey, toPubkey: burner.publicKey, lamports: 0.12 * LAMPORTS_PER_SOL })], [adminKeypair()]);
  console.log(`burner ${burner.publicKey.toBase58()} funded with 0.12 SOL`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 300)));
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 300)}`));
  try {
    await play(page, burner, errors);
  } catch (e) {
    await shot(page, "99-failure");
    console.log(`console errors: ${errors.length}`);
    errors.slice(-15).forEach((x) => console.log("  ", x));
    throw e;
  } finally {
    await browser.close();
  }
}

async function play(page: Page, burner: Keypair, errors: string[]) {
  await page.addInitScript((secret) => {
    localStorage.setItem("darwin-arena:burner", JSON.stringify(secret));
    localStorage.setItem("walletName", JSON.stringify("Burner (devnet)"));
  }, Array.from(burner.secretKey));

  const t0 = Date.now();
  const step = (s: string) => console.log(`${String(Math.round((Date.now() - t0) / 1000)).padStart(4)}s ${s}`);

  await page.goto(`${URL}/play`);
  // Wait for the wallet and the config to load (balance shown) before the faucet.
  await page.locator("header").first().getByText(/\d+\.\d\d USDC/).waitFor({ timeout: 60_000 });
  await page.getByText("+ Test USDC").click({ timeout: 60_000 });
  await page.getByText(/100\.00 USDC/).waitFor({ timeout: 60_000 });
  step("faucet: 100 test USDC");
  await shot(page, "01-lobby");

  await page.getByText("Rookie Pit").click();
  await page.getByText("Find a match for 1 USDC").click();
  step("staked 1 USDC, waiting at the table");
  if (process.env.PRACTICE) {
    // No keeper: summon the in-browser practice bot.
    await page.getByText("Play the practice bot").click({ timeout: 30_000 });
    step("practice bot summoned");
  }
  await page.getByText("Draft starts in").waitFor({ timeout: 90_000 });
  step("rival found");
  await shot(page, "02-matched");

  await page.getByText("Build your basket").waitFor({ timeout: 30_000 });
  for (const sym of ["SOL", "JUP", "BONK"]) await page.locator("button", { hasText: sym }).filter({ hasText: "Volatility" }).first().click();
  await shot(page, "03-draft");
  await page.getByRole("button", { name: /Lock basket/ }).click();
  step("basket locked (commitment by session key)");
  await page.getByText("Live score").waitFor({ timeout: 120_000 });
  step("duel live on the ER");
  await page.waitForTimeout(15_000);
  await shot(page, "04-duel");

  await page.getByText("Mutation", { exact: true }).waitFor({ timeout: 120_000 });
  step("first VRF mutation");
  await shot(page, "05-mutation");

  await page.getByRole("button", { name: "Rebalance" }).click();
  const sheet = page.locator("div.fixed.inset-0.z-50");
  const minus = sheet.locator("button", { hasText: "−" });
  const plus = sheet.locator("button", { hasText: "+" });
  // Move 5 % from the first unfrozen leg to the next one.
  await minus.first().click();
  await plus.nth(1).click();
  await shot(page, "06-rebalance-sheet");
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByText(/You rebalanced your basket/).waitFor({ timeout: 30_000 });
  step("rebalanced on the ER");

  await page.getByText(/SURVIVED|EXTINCT|DRAW/).first().waitFor({ timeout: 360_000 });
  step("duel over");
  await page.getByText(/Settled on Solana/).waitFor({ timeout: 120_000 });
  step("settled on Solana, profile updated");
  await shot(page, "07-result");

  await page.goto(`${URL}/menu`);
  await page.waitForTimeout(6000);
  await shot(page, "08-dashboard");

  console.log(`console errors: ${errors.length}`);
  errors.slice(0, 10).forEach((e) => console.log("  ", e));
  console.log("ui ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
