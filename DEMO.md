# Demo video script (about 3 minutes)

Setup before recording: open https://darwin.market/arena-magicblock in a fresh browser
profile (Phantom on devnet, or the built-in Burner wallet; no devnet SOL needed), a Solana
explorer tab on devnet, and optionally `npm run keeper` for a bot opponent (without it,
use the practice bot).

## 0:00 – 0:20 · The pitch

"Darwin sells crypto baskets. Darwin Arena is the game: two players, two baskets,
five minutes of live markets, winner takes the pot. Everything you're about to see
runs on Solana devnet and a MagicBlock Ephemeral Rollup."

Show the home screen, click **Play**.

## 0:20 – 0:45 · Wallet, faucet, table

- Connect the wallet: the site's faucet drops devnet SOL on it automatically.
- Pick **The Arena (5 USDC)** and **Find a match**. *One* wallet approval: it mints test
  USDC, creates the profile, escrows the stake on Solana and authorises a MagicBlock
  **session key** for the rest of the duel.
- The keeper's bot sits down after a few seconds (or click **Play the practice bot**).

## 0:45 – 1:15 · Draft, commit-reveal

- Pick 3 to 5 assets, set weights. Point at the market prices: "these are MagicBlock's
  Pyth Lazer feeds, read from the rollup".
- **Lock basket**: no popup. "Only a hash of my basket and a secret salt goes on chain.
  The session key signed it. My rival can't see my basket and I can't see theirs."
- The rival's card flips to "locked in". The duel is delegated to the Ephemeral
  Rollup; both baskets are revealed there and checked against the hashes.

## 1:15 – 2:20 · The live duel on the ER

- The badge reads **on the Ephemeral Rollup**. Scores move every second: "that's an
  on-chain crank: `ScheduleTask` calls our `tick` every second, reading six oracle
  feeds. No server is ticking this, and it costs nothing."
- At 1:00 a mutation lands (toast + timeline): "drawn by MagicBlock's VRF *inside the
  rollup*, at that second. Nobody, including us, knew it before."
- Click **Rebalance**, shift 5 %: no popup, no fee, it lands in under a second.
- Optional: in the terminal, `npx tsx ops/inspect.ts <id>`: base layer says
  `owner delegation`, the ER has the live state.

(Cut to the end of the 5 minutes.)

## 2:20 – 2:50 · Settlement

- "Time's up: the duel is committed and undelegated back to Solana, `settle` pays the
  winner 2 x stake x 95 % from the escrow and writes both profiles."
- Result screen: SURVIVED / EXTINCT, +20 / -16 points. **Mint this basket**: the winning
  basket becomes an on-chain trophy. **Share on X** opens a post linking the duel page.
- Open the **Spectator link**: the duel's public page, with every Solana transaction of
  the duel on the explorer (that's the integration proof).
- Menu → Profile: badges earned from on-chain history, the trophy. Rank: the leaderboard
  of every player on chain.

## 2:50 – 3:00 · Close

"Solana holds the money and the reputation. The rollup runs the game: real-time,
gasless, provably fair. That's Darwin Arena on MagicBlock."
