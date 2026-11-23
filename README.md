# Darwin Arena on MagicBlock

**1v1 crypto basket duels, settled on Solana, played on an Ephemeral Rollup.**

[Darwin](https://app.darwin.market) sells crypto baskets. Arena is the game version:
two players each draft a basket of Solana assets, the basket that performs best
over five minutes of live prices takes the pot. Mutations drawn by verifiable
randomness shake the duel up; each player can rebalance twice.

Built for MagicBlock's Solana Blitz (Entertainment Finance). Everything runs on
**Solana devnet + MagicBlock's devnet Ephemeral Rollup**, with real Pyth Lazer prices.

**Play it:** https://darwin.market/arena-magicblock

## How a duel runs

```
 Solana devnet (base layer)                    MagicBlock Ephemeral Rollup (devnet-as)
 ──────────────────────────                    ───────────────────────────────────────
 faucet ─ test USDC
 open_duel / join_duel ─ stake escrowed
   + create_session_v2 (MagicBlock session key)   ← the only wallet approval of a duel
 commit_basket ─ sha256(basket ‖ salt)
   (signed by the session key)
 delegate_duel ───────────────────────────────▶   reveal_basket  (session key, no fee)
                                                  start_duel     reads 6 Pyth Lazer feeds,
                                                                 ScheduleTask: tick every 1 s
                                                  tick ×300      crank, on chain, free
                                                  request_mutation ─ ephemeral VRF ─▶ apply_mutation
                                                  rebalance ×2   (session key, no fee)
                                                  finish_duel    commit + undelegate
 settle ◀─────────────────────────────────────
   pot = 2 × stake × 95 % to the winner (draw: refunds)
   both profiles: rank points, W/L, streak, last 8 matches
```

## MagicBlock features used

| Feature | Where | What it does here |
|---|---|---|
| **Ephemeral Rollups** | `delegate_duel`, `finish_duel` | The `Duel` PDA is delegated once both baskets are committed; the whole live duel (reveals, 300 ticks, mutations, rebalances) runs on the ER at zero fee; `commit_and_undelegate` brings it back for settlement. Money never leaves Solana. |
| **Cranks** (`ScheduleTask`) | `start_duel` → `tick` | The duel ticks itself every second on the ER. No off-chain ticking loop. Task ids are derived per duel (they are validator-global on 1.1.1). |
| **Real-time price oracle** | `tick`, `start_duel`, the Draft market | MagicBlock's Pyth Lazer feeds (`PriCems5…`), read on the ER for SOL, JUP, BONK, WIF, JTO, PYTH. Addresses pinned, owner checked, positive price, staleness bound (a stale asset is held still for that tick). |
| **Ephemeral VRF** | `request_mutation` → `apply_mutation` | Each of the three mutations is drawn by a VRF request made inside the ER at its second (60 / 150 / 240 s): kind and asset(s). The callback is only accepted from the VRF program's scoped identity. Nobody knows a mutation before it lands. |
| **Session keys** (`session-keys`, `SessionTokenV2`) | `commit_basket` | The wallet approves one transaction per duel (stake + session token). The browser-held session key then commits, reveals, rebalances and pulls VRF triggers. Wallets cannot sign rollup transactions anyway. |

### Draft privacy: commit-reveal, not a private ER

During the 60 s draft only `sha256(duel ‖ player ‖ weights ‖ salt)` is on chain; the
salt never leaves the browser until the reveal on the ER, which happens only once
*both* commitments exist. A player who never reveals forfeits.

We considered running the duel on MagicBlock's private ER (TEE) instead. It would
hide the baskets for the whole duel, but the game *wants* both baskets visible once
the duel starts (the rival's basket is half the fun on screen), and a TEE adds an
attestation trust assumption and an auth flow for a property commit-reveal already
gives. So: commit-reveal, no extra trust.

### Prices: no keeper needed

All six assets have live MagicBlock feeds on the devnet ERs (checked: 1 s old or
less). The fallback we planned (a keeper pushing Pyth Hermes prices into our own
account) is therefore not built. If a feed ever goes stale, `tick` simply holds that
asset still until it is fresh again.

The draft's market cards also show a 24 h change and an hourly sparkline. Pyth's
historical endpoints (Hermes `updates/price/{time}`, Benchmarks) now require an API key,
so that context comes from Binance's public klines mirror through a cached route
(`/api/market`). It is display only: scoring and settlement use MagicBlock's feeds.

## What lives where

| | Solana (base) | Ephemeral Rollup | Off-chain |
|---|---|---|---|
| Test USDC, faucet, escrow, payouts | ✓ | | |
| Tables (matchmaking queue) | ✓ | | |
| Basket commitments, session authorisation | ✓ | | |
| Reveal, ticks, scores, mutations, rebalances | | ✓ | |
| Profiles: rank points, W/L, streak, history | ✓ | | |
| Trophies: winning baskets minted by their winner (`mint_trophy`) | ✓ | | |
| Badges, leaderboard: computed from profiles and history | read | | front |
| Devnet SOL faucet for new wallets (`/api/faucet`, rate limited) | | | ✓ (Next.js route) |
| Keeper: delegate / start / VRF trigger / finish / settle if nobody else did, bot opponent | | | ✓ (`ops/keeper.ts`) |

Every instruction the keeper sends is permissionless and also sent by the front, so
the keeper is a convenience: it cannot pick a mutation, move a basket or redirect a
payout.

## Deployed (devnet)

| | Address |
|---|---|
| Program | see [DEPLOYMENTS.md](DEPLOYMENTS.md) |
| ER endpoint | `https://devnet-as.magicblock.app` (validator `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57`) |
| Base RPC | `https://rpc.magicblock.app/devnet` |
| Delegation program | `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh` |
| Session keys program | `KeyspM2ssCJbqUhQ4k7sveSiY4WjnYsrXkC8oDbwde5` |
| VRF program / ER queue | `Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz` / `5hBR571xnXppuCPveTrctfTU7tJLSN94nq7kv7FRK5Tc` |
| Price oracle | `PriCems5tHihc6UDXDjzjeawomAwBduWMGAi8ZUjppd` |

## Play it, watch it, verify it

- **Play:** https://darwin.market/arena-magicblock (devnet). Connect Phantom on devnet or the
  built-in Burner wallet; the site's faucet sends devnet SOL automatically, and the first
  **Find a match** mints test USDC in the same approval as the stake.
- **Watch any duel:** `https://darwin.market/arena-magicblock/duel?id=<n>`: players, live scores,
  baskets, VRF mutations, and explorer links to the duel account and every Solana
  transaction of the duel (open, join, commitments, delegation, settlement, trophy).
- **Program on the explorer:** [GnQC4Mjz…zFNp](https://explorer.solana.com/address/GnQC4MjzjS8AZvtj5VR64ovJupSm93yCiYz1ZkLyzFNp?cluster=devnet).

## Run it

```bash
npm install
npm run dev -- -p 3040      # the game, on devnet
npm run keeper              # optional: bot opponent + keeper (needs keys, see below)
```

Open http://localhost:3040, connect Phantom (devnet) or pick **Burner (devnet)**. A wallet
without devnet SOL gets 0.08 SOL from the site's faucet automatically (once a day per
wallet; locally it needs `FAUCET_SECRET_KEY`, otherwise fund the wallet yourself). Pick a
table, **Find a match**: the first stake transaction also mints 100 test USDC.

Nobody else around? With the keeper running, its bot sits down after 8 s. Without
it, after 10 s alone the lobby offers **Play the practice bot**: a second player that
runs in your own browser (its own keypair, test USDC and on-chain profile) and plays
its seat for real; your wallet only funds its fees once (0.02 SOL).

After a win, **Mint this basket** records the winning basket as an on-chain trophy
(shown in the Profile tab); **Share on X** posts the result with a link to the duel's
public page.

### Hosting

The live front is a static Next.js build served at `darwin.market/arena-magicblock`.
It is built with `NEXT_PUBLIC_BASE_PATH=/arena-magicblock` (see `next.config.ts`); public
files referenced from plain `<img>` tags go through `src/lib/asset.ts` so they pick up the
prefix. Locally the variable stays unset and the app lives at `/`.

The faucet route signs with `FAUCET_SECRET_KEY` (a server-only env var set on the Vercel
project, never `NEXT_PUBLIC_`). It sends 0.08 devnet SOL, refuses wallets holding 0.05 SOL
or more, refuses a wallet it funded in the last 24 h (checked from the wallet's own
transactions, so it holds across serverless instances) and limits requests per IP.

### Ops scripts (keys live in `~/.config/darwin-arena/`, never in the repo)

| Command | |
|---|---|
| `npm run chain:build` | `anchor build` in `chain/` |
| `npm run chain:test` | Rust unit tests of the game rules |
| `npm run test:local` | base-layer integration tests on a throwaway local validator |
| `npm run setup` | one-time: mint, vault, config, tables (idempotent) |
| `npm run e2e` | full duel on devnet + ER between two session-keyed keypairs |
| `npx tsx ops/test/ui.ts` | full duel through the real front in headless Chromium |
| `npm run keeper` | keeper + bot opponent |

## Tests and results

| Suite | Command | Result |
|---|---|---|
| Game rules (Rust unit) | `npm run chain:test` | 12 / 12 |
| Base layer on a local validator | `npm run test:local` | 14 / 14 (faucet + cooldown, tables, escrow, session-key commits, refusals, refunds) |
| Devnet + ER, two session-keyed players | `npm run e2e` | full duel: 301 crank ticks in 300 s, 3 VRF mutations, rebalance, commit + undelegate, settle |
| Browser, keeper's bot | `npx tsx ops/test/ui.ts` | full duel through the UI in 328 s, 0 console errors |
| Browser, practice bot, no server | `PRACTICE=1 npx tsx ops/test/ui.ts` | full duel through the UI in 331 s, 0 console errors |
| Hosted site, empty wallet | `APP_URL=https://darwin.market/arena-magicblock ONBOARD=1 PRACTICE=1 npx tsx ops/test/ui.ts` | SOL from the site faucet with no click, test USDC + stake in one approval, full duel, settled in 333 s, spectator page, 0 console errors |
| On-chain battery | `npm run battery -- 14 3` | 21 duels, 293 / 293 checks incl. trophies ([BATTERY.md](BATTERY.md)) |

## Repository

```
chain/programs/darwin-arena/src/
  lib.rs     instructions (base layer and rollup), account contexts
  game.rs    duel + profile state, scoring, mutations, rebalance rules, unit tests
  token.rs   minimal SPL token helpers (no anchor-spl: half the binary, half the rent)
src/lib/chain/   isomorphic client: constants, PDAs, instruction builders, duel view,
                 session keys, React context (ArenaProvider), hooks
src/components/  the game screens (Lobby, Draft, Duel, Result, menu)
ops/             setup, keeper + bot, e2e scripts and tests
```

## Integration notes (what we learned)

1. **Pick the ER by validator version.** On 23 Nov 2026 `getVersion` reported devnet-eu
   at 2.0.3 and devnet-us at 2.0.0; only devnet-as (`MAS1Dt9q…`) ran 1.1.1, the version
   whose `ScheduleTask` semantics the docs and SDK 0.16 describe (2.0 routes cranks through
   Hydra and rejects signers in scheduled instructions). We delegate to devnet-as explicitly.
2. **The price feeds are already on every devnet ER.** Our six assets answered on -eu,
   -as and -us with publish times under 1 s old; their base-layer copies are frozen at 0.
   The exponent stored in the account is not the price scale: take it from
   `pyth_lazer_list.json`.
3. **One `ScheduleTask` runs a whole duel.** 300 iterations at 1000 ms gave 301 ticks over
   300 s in every battery duel (18 duels). Task ids are validator-global on 1.1.1, so ours are
   derived from the duel address.
4. **VRF inside the ER is quick.** Request to applied callback: median 1.3 s, max 2.0 s
   (36 requests). Delegation is visible on the ER 0.16 s (median) after the commit lands;
   commit + undelegate is back on Solana in 1.6 s.
5. **Whoever delegates pays rent.** A session key topped up with 0.003 SOL failed the
   commit + delegate transaction with `InsufficientFundsForRent`; 0.02 SOL covers it.
6. **Session keys without cloning the token into the ER.** The `SessionTokenV2` is
   verified on Solana at commit time and the session signer is recorded in the duel;
   the rollup only checks `signer == duel.session[slot]` (and the expiry).
7. **Pyth history needs a key now.** Hermes `updates/price/{time}` and Benchmarks answer
   `unauthorized` without an API key; the live Lazer feeds on the ER need none.
8. **Binary size is the main devnet cost.** `anchor-spl` constraints roughly doubled the
   program; hand-rolled token helpers keep it near 490 kB (about 2.5 SOL of rent).

### Bugs the tests found

| Found by | Bug | Fixed in |
|---|---|---|
| devnet e2e | session top-up too small for the delegation rent | PR #4 |
| devnet e2e | independent draws repeated a mutation kind (three DOUBLEs) | PR #7, each kind once in VRF order |
| review | a duel nobody revealed could never resolve | PR #7 |
| review | frozen-asset rebalance lock outlived the freeze until the next tick | PR #7 |
| browser e2e | result screen bounced back to the duel (stale effect state) | PR #6 |
| browser e2e | faucet clickable before the config loaded; config load never retried | PR #6 |
| battery | the battery reused one session token per player across parallel duels (test bug) | battery PR |
| battery | devnet dropped one commit transaction; ops `send` now resends after the blockhash expires | PR #24 |
| battery | a skipped rebalance was counted, so the "third rebalance" test sent the second (test bug; program correct) | PR #25 |

The last on-chain battery run is in [BATTERY.md](BATTERY.md): 21 duels in 3 rounds of 7
parallel duels across the three tables (regular, mirror, forfeit, double no-show,
abandoned draft), 14 players, **293 / 293 checks passed** (trophies included; 4 devnet
transactions dropped and resent on the way).
