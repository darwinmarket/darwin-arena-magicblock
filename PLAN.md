# Darwin Arena on MagicBlock: build plan

Darwin Arena is the game version of Darwin baskets: 1v1 duels where each player
drafts a basket of Solana assets and the best-performing basket over five minutes
takes the pot. This document is the architecture we are building for MagicBlock's
Solana Blitz (Entertainment Finance), and the order we build it in.

## Split across layers

| Layer | Lives there | Why |
|---|---|---|
| **Solana devnet** (base) | Test-USDC mint + faucet, stake escrow (vault), tables (matchmaking), duel creation, basket commitments (hashes), session-key authorization, settlement + payout, player profiles (rank points, W/L, streak, history) | Money and reputation must be durable and composable. Nothing that holds USDC is ever delegated. |
| **Ephemeral Rollup** (devnet-as, validator 1.1.1) | The live `Duel` account: basket reveal, price ticks, scores, rebalances, mutations | One tick per second, zero fees, 50-200 ms oracle updates. Commit + undelegate when the duel ends. |
| **Off-chain** (`ops/`) | A small crank (delegation, VRF trigger, end + settle), a bot opponent so a solo judge can play | Only what cannot be scheduled on chain. Every instruction it sends is permissionless, so the front can (and does) send the same ones itself. |

## MagicBlock features used

1. **Ephemeral Rollups**: the `Duel` PDA is delegated once both players have committed
   their basket, runs the whole 5-minute duel on the ER, then `finish_duel` does
   `commit_and_undelegate` so `settle` can pay out on Solana.
2. **Cranks** (`ScheduleTask`): `start_duel` schedules `tick` every second for the
   duration of the duel. The tick is permissionless and idempotent; there is no
   off-chain ticking loop.
3. **Real-time price oracle** (Pyth Lazer pushed by MagicBlock, `PriCems5...`): all six
   assets (SOL 6, JUP 92, BONK 9, WIF 10, JTO 91, PYTH 3) have live feeds on the
   devnet ERs. `tick` reads them directly (pinned addresses, owner check, staleness
   check). No Hermes keeper is needed; see README for the fallback story.
4. **Ephemeral VRF**: each of the three mutations (DOUBLE / FREEZE / SWAP, which asset)
   is drawn by a VRF request made *inside the ER* at its scheduled second, so nobody
   (players, server) knows it in advance.
5. **Session keys** (MagicBlock `session-keys`, `SessionTokenV2`): the wallet signs one
   transaction per duel (join + stake). A browser-held session key, authorized by a
   session token, commits the basket, reveals it, and rebalances, with no further
   wallet prompts (Phantom cannot sign ER transactions anyway).
6. **Draft privacy**: commit-reveal. During the draft only
   `sha256(duel || player || weights || salt)` is on chain; the reveal happens on the
   ER once both are committed. A private ER (TEE) would hide the basket for the whole
   duel, but the game *wants* baskets visible during the duel (the UI shows the
   rival's basket), so commit-reveal gives exactly the needed property at no extra
   trust assumption. Trade-off documented in the README.

## Game rules as implemented on chain

- Stakes: 1 / 5 / 20 test USDC (6 decimals). Pot = 2 x stake x 95 %, 5 % rake kept by
  the vault. Draw = both refunded.
- Draft: 60 s. 3-5 of the 6 assets, weights multiples of 5, sum 100.
- Duel: 300 s. Score accumulates every tick: for each asset,
  `score += weight x multiplier x (p_now / p_prev - 1)` (path-dependent, so a
  rebalance only affects future moves). Frozen assets do not accumulate.
- Mutations at t = 60 / 150 / 240 s, kind and asset(s) from VRF:
  DOUBLE (asset multiplier x2 for the rest of the duel), FREEZE (asset frozen 30 s),
  SWAP (one leg of each basket is exchanged between the players).
- Rebalance: at most 2, same assets, multiples of 5, sum 100, frozen asset untouched.
- Rank: +20 win / -16 loss (floored at 0), tiers Cell to Darwinian derived from points.

## Order of work

1. Program skeleton, base-layer economy (mint, faucet, tables, escrow, profiles) - local tests.
2. Duel on ER: delegate, reveal, start, tick (oracle), rebalance, finish, settle.
3. VRF mutations and crank scheduling.
4. Deploy to devnet, e2e script with two keypairs.
5. `ops/`: crank + bot opponent.
6. Front wiring: wallet adapter, adapter layer replacing mocks.
7. Tests, README, demo script.
