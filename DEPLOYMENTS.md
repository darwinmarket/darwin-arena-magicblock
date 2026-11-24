# Deployments (Solana devnet)

## Current

| | Address |
|---|---|
| Program `darwin_arena` | `GnQC4MjzjS8AZvtj5VR64ovJupSm93yCiYz1ZkLyzFNp` |
| Config PDA `["config"]` | `AibdHaQC2be1FWdDw4k6LHVVBv2CAYi4DckLigEy4z4R` |
| Test USDC mint (6 decimals, authority = config) | `7vyQWwM8GUcHpaZV4jC7W32dpP99p2pc5fEH22kTx7RF` |
| Vault (escrow, owned by config) | `5sJ14Cza2YC3i8GL4PaNFhkFoSNJ5XXomDZDCdJjSy3` |
| Tables `["table", tier]` | tiers 0 / 1 / 2 = 1 / 5 / 20 USDC |
| Ephemeral Rollup | `https://devnet-as.magicblock.app`, validator `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57` (magicblock-core 1.1.1) |

PDAs per player: profile `["profile", wallet]`, faucet claim `["faucet", wallet]`.
Duels: `["duel", id u64 LE]`.

While a duel is live its account reads as owned by the delegation program
(`DELeGG…`) on Solana: that is what a delegated account looks like.

## History

| Program | Status |
|---|---|
| `DjsXYvzbZFhM5rdDiq9Dvc4YgA7roLZLDB5tD7KnpcpA` | First deployment (duels #0-#3, including the first devnet e2e and browser e2e). Closed to recover its rent for the fixed build: a double no-show could not be resolved, and mutation kinds could repeat. |

2026-11-24: program upgraded in place to one minute duels (`DUEL_SECONDS` 60, mutations at
15 / 30 / 45 s, freeze 10 s), to match the race front end. Same program id and accounts.
e2e duel #3337: 61 ticks in 60 s, 3 VRF mutations, settled.
