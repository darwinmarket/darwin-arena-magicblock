# Demo video script (about 3 minutes)

Setup before recording: `npm run dev -- -p 3040` and `npm run keeper` running, a
browser with Phantom on devnet (or the Burner wallet funded with ~0.05 devnet SOL),
a Solana explorer tab on devnet, and `npx tsx ops/inspect.ts <id>` ready in a terminal.

## 0:00 – 0:20 · The pitch

"Darwin sells crypto baskets. Darwin Arena is the game: two players, two baskets,
five minutes of live markets, winner takes the pot. Everything you're about to see
runs on Solana devnet and a MagicBlock Ephemeral Rollup."

Show the home screen, click **Play**.

## 0:20 – 0:45 · Wallet, faucet, table

- Connect the wallet. Click **+ Test USDC**: 100 test USDC minted by the program.
- Pick **The Arena (5 USDC)** and **Find a match**. *One* wallet approval: it escrows
  the stake on Solana and authorises a MagicBlock **session key** for the rest of
  the duel.
- The keeper's bot sits down after a few seconds: "Opponent found".

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
- Result screen: SURVIVED / EXTINCT, +20 / -16 points. Open the settle transaction
  in the explorer.
- Menu → Dashboard: the match is in the on-chain history; Rank tab shows the points.

## 2:50 – 3:00 · Close

"Solana holds the money and the reputation. The rollup runs the game: real-time,
gasless, provably fair. That's Darwin Arena on MagicBlock."
