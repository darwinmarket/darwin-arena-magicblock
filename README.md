# Darwin Arena on MagicBlock

**1v1 crypto basket duels, settled on Solana, played on an Ephemeral Rollup.**

[Darwin](https://app.darwin.market) sells crypto baskets. Arena is the game version:
two players each draft a basket of Solana assets, the basket that performs best
over five minutes of live prices takes the pot. Mutations drawn by verifiable
randomness shake the duel up; each player can rebalance twice.

Built for MagicBlock's Solana Blitz (Entertainment Finance). Everything runs on
**Solana devnet + MagicBlock's devnet Ephemeral Rollup**, with real Pyth Lazer prices.

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

## What lives where

| | Solana (base) | Ephemeral Rollup | Off-chain |
|---|---|---|---|
| Test USDC, faucet, escrow, payouts | ✓ | | |
| Tables (matchmaking queue) | ✓ | | |
| Basket commitments, session authorisation | ✓ | | |
| Reveal, ticks, scores, mutations, rebalances | | ✓ | |
| Profiles: rank points, W/L, streak, history | ✓ | | |
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

## Run it

```bash
npm install
npm run dev -- -p 3040      # the game, on devnet
npm run keeper              # optional: bot opponent + keeper (needs keys, see below)
```

Open http://localhost:3040, connect Phantom (devnet) or pick **Burner (devnet)** and
send it ~0.1 devnet SOL, click **+ Test USDC**, pick a table, **Find a match**.

Nobody else around? With the keeper running, its bot sits down after 8 s. Without
it, after 10 s alone the lobby offers **Play the practice bot**: a second player that
runs in your own browser (its own keypair, test USDC and on-chain profile) and plays
its seat for real; your wallet only funds its fees once (0.03 SOL).

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
