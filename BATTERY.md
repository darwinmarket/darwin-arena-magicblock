# Battery report

Run 2026-11-23T16:46:07.497Z · program `GnQC4MjzjS8AZvtj5VR64ovJupSm93yCiYz1ZkLyzFNp` · 20 players · 3 round(s) · 1092 s

**296 / 296 checks passed.** Admin SOL 12.5973 -> 11.7074 (funding players).

## Latencies

| step | n | median ms | max ms |
|---|---|---|---|
| fund players | 3 | 1003 | 1019 |
| player setup + session | 20 | 988 | 1455 |
| rush seat | 6 | 962 | 1394 |
| rush: all seated | 1 | 10797 | 10797 |
| cancel draft | 6 | 1224 | 42149 |
| open | 21 | 1052 | 1525 |
| join | 21 | 1054 | 1616 |
| commit | 21 | 1033 | 1529 |
| commit + delegate | 18 | 1046 | 1542 |
| delegation visible on ER | 18 | 163 | 823 |
| reveal (ER) | 27 | 1047 | 1608 |
| start + crank (ER) | 12 | 1035 | 1573 |
| start (forfeit) | 6 | 1237 | 1648 |
| finish (commit+undelegate) | 18 | 1049 | 1698 |
| undelegation back on Solana | 18 | 1890 | 3206 |
| settle | 18 | 1089 | 1720 |
| mint trophy | 15 | 1075 | 1616 |
| VRF request (ER) | 36 | 1124 | 1942 |
| VRF request -> callback applied | 36 | 1375 | 2106 |
| rebalance (ER) | 44 | 1045 | 1845 |

## Checks

- ✅ [rush x6] every player seated, no user-visible failure
- ✅ [rush x6] players paired into duels — 3 duel(s), 3 full, 15 retries
- ✅ [rush x6] every stake refunded — 100,100,100,100,100,100 -> 100,100,100,100,100,100
- ✅ [#860 regular 20] delegated: base owner is the delegation program
- ✅ [#801 mirror] delegated: base owner is the delegation program
- ✅ [#1029 regular 1] commit with a session token for another player — refused with Unauthorized
- ✅ [#962 regular 5] delegated: base owner is the delegation program
- ✅ [#965 no-show] delegated: base owner is the delegation program
- ✅ [#1184 forfeit] delegated: base owner is the delegation program
- ✅ [#1029 regular 1] commit by a stranger without a session token — refused with Unauthorized
- ✅ [#860 regular 20] live with oracle reference prices
- ✅ [#962 regular 5] live with oracle reference prices
- ✅ [#1029 regular 1] delegate before both commitments — refused with NotCommitted
- ✅ [#1320 abandoned] cancel before the draft deadline — refused with DraftNotOver
- ✅ [#801 mirror] live with oracle reference prices
- ✅ [#1029 regular 1] delegated: base owner is the delegation program
- ✅ [#1029 regular 1] reveal with a wrong salt — refused with BadReveal
- ✅ [#1029 regular 1] reveal a different basket — refused with BadReveal
- ✅ [#1029 regular 1] reveal signed by a stranger on the ER — refused with Unauthorized
- ✅ [#1029 regular 1] start before both reveals — refused with NotRevealed
- ✅ [#1029 regular 1] live with oracle reference prices
- ✅ [#1029 regular 1] mutation requested before its second — refused with TooEarly
- ✅ [#1029 regular 1] rebalance changing the asset set — refused with BadBasket
- ✅ [#1029 regular 1] forged VRF callback — refused with ConstraintAddress
- ✅ [#1029 regular 1] finish before the end — refused with BadStatus
- ✅ [#1029 regular 1] settle while the duel is on the ER — refused with AccountOwnedByWrongProgram
- ✅ [#1184 forfeit] forfeit resolves: winner 0 — status 3 winner 0
- ✅ [#1184 forfeit] committed state on Solana equals the ER state
- ✅ [#1184 forfeit] loser minting the trophy — refused with NotTheWinner
- ✅ [#1184 forfeit] trophy records the winning basket
- ✅ [#1184 forfeit] payout (winner 0) — deltas 4.5,-5 expected 4.5,-5
- ✅ [#1184 forfeit] profile 0 (win): points, record, history — 168 -> 188 pts, streak 5
- ✅ [#1184 forfeit] profile 1 (loss): points, record, history — 4 -> 0 pts, streak -2
- ✅ [#801 mirror] VRF mutation 0 applied
- ✅ [#962 regular 5] VRF mutation 0 applied
- ✅ [#860 regular 20] VRF mutation 0 applied
- ✅ [#1029 regular 1] VRF mutation 0 applied
- ✅ [#1029 regular 1] same mutation requested twice — refused with AlreadyRequested
- ✅ [#1320 abandoned] abandoned draft refunds both stakes — 81.7,97.9 -> 81.7,97.9
- ✅ [#1320 abandoned] cancelled duel status
- ✅ [#965 no-show] forfeit resolves: winner 2 — status 3 winner 2
- ✅ [#965 no-show] committed state on Solana equals the ER state
- ✅ [#965 no-show] trophy for a draw — refused with NotTheWinner
- ✅ [#965 no-show] payout (winner 2) — deltas 0,0 expected 0,0
- ✅ [#965 no-show] profile 0 (draw): points, record, history — 44 -> 44 pts, streak 1
- ✅ [#965 no-show] profile 1 (draw): points, record, history — 52 -> 52 pts, streak -1
- ✅ [#801 mirror] VRF mutation 1 applied
- ✅ [#860 regular 20] VRF mutation 1 applied
- ✅ [#962 regular 5] VRF mutation 1 applied
- ✅ [#1029 regular 1] VRF mutation 1 applied
- ✅ [#962 regular 5] third rebalance — refused with NoRebalanceLeft
- ✅ [#801 mirror] third rebalance — refused with NoRebalanceLeft
- ✅ [#1029 regular 1] third rebalance — refused with NoRebalanceLeft
- ✅ [#860 regular 20] VRF mutation 2 applied
- ✅ [#962 regular 5] VRF mutation 2 applied
- ✅ [#801 mirror] VRF mutation 2 applied
- ✅ [#1029 regular 1] VRF mutation 2 applied
- ✅ [#860 regular 20] finished on time by the crank — ticks 301, status 3
- ✅ [#860 regular 20] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#860 regular 20] three different mutation kinds — SOL weight x2 | SOL frozen for 30s | Swap: WIF <-> SOL
- ✅ [#860 regular 20] winner matches scores — -0.0970% vs -0.2801%
- ✅ [#962 regular 5] finished on time by the crank — ticks 301, status 3
- ✅ [#962 regular 5] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#962 regular 5] three different mutation kinds — Swap fizzles: both hold WIF | WIF weight x2 | JUP frozen for 30s
- ✅ [#962 regular 5] winner matches scores — -0.0339% vs 0.1052%
- ✅ [#801 mirror] finished on time by the crank — ticks 301, status 3
- ✅ [#801 mirror] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#801 mirror] three different mutation kinds — PYTH weight x2 | Swap: JTO <-> PYTH | PYTH frozen for 30s
- ✅ [#801 mirror] winner matches scores — 0.0530% vs 0.1153%
- ✅ [#860 regular 20] committed state on Solana equals the ER state
- ✅ [#801 mirror] committed state on Solana equals the ER state
- ✅ [#962 regular 5] committed state on Solana equals the ER state
- ✅ [#860 regular 20] loser minting the trophy — refused with NotTheWinner
- ✅ [#801 mirror] loser minting the trophy — refused with NotTheWinner
- ✅ [#962 regular 5] loser minting the trophy — refused with NotTheWinner
- ✅ [#860 regular 20] trophy records the winning basket
- ✅ [#860 regular 20] payout (winner 0) — deltas 18,-20 expected 18,-20
- ✅ [#860 regular 20] profile 0 (win): points, record, history — 24 -> 44 pts, streak 1
- ✅ [#860 regular 20] profile 1 (loss): points, record, history — 72 -> 56 pts, streak -3
- ✅ [#801 mirror] trophy records the winning basket
- ✅ [#801 mirror] payout (winner 1) — deltas -1,0.9 expected -1,0.9
- ✅ [#801 mirror] profile 0 (loss): points, record, history — 24 -> 8 pts, streak -2
- ✅ [#801 mirror] profile 1 (win): points, record, history — 136 -> 156 pts, streak 2
- ✅ [#962 regular 5] trophy records the winning basket
- ✅ [#962 regular 5] payout (winner 1) — deltas -5,4.5 expected -5,4.5
- ✅ [#962 regular 5] profile 0 (loss): points, record, history — 0 -> 0 pts, streak -5
- ✅ [#962 regular 5] profile 1 (win): points, record, history — 104 -> 124 pts, streak 3
- ✅ [#1029 regular 1] finished on time by the crank — ticks 301, status 3
- ✅ [#1029 regular 1] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#1029 regular 1] three different mutation kinds — Swap: WIF <-> BONK | BONK frozen for 30s | SOL weight x2
- ✅ [#1029 regular 1] winner matches scores — -0.1124% vs -0.1171%
- ✅ [#1029 regular 1] committed state on Solana equals the ER state
- ✅ [#1029 regular 1] settle paying the winner's share to a wrong account — refused with BadTokenAccount
- ✅ [#1029 regular 1] settle twice — refused with BadStatus
- ✅ [#1029 regular 1] loser minting the trophy — refused with NotTheWinner
- ✅ [#1029 regular 1] trophy records the winning basket
- ✅ [#1029 regular 1] trophy minted twice — refused with already in use
- ✅ [#1029 regular 1] payout (winner 0) — deltas 0.9,-1 expected 0.9,-1
- ✅ [#1029 regular 1] profile 0 (win): points, record, history — 88 -> 108 pts, streak 4
- ✅ [#1029 regular 1] profile 1 (loss): points, record, history — 4 -> 0 pts, streak -4
- ✅ [#1405 regular 1] commit with a session token for another player — refused with Unauthorized
- ✅ [#1488 regular 5] delegated: base owner is the delegation program
- ✅ [#1405 regular 1] commit by a stranger without a session token — refused with Unauthorized
- ✅ [#1424 regular 20] delegated: base owner is the delegation program
- ✅ [#1405 regular 1] delegate before both commitments — refused with NotCommitted
- ✅ [#1602 abandoned] cancel before the draft deadline — refused with DraftNotOver
- ✅ [#1556 no-show] delegated: base owner is the delegation program
- ✅ [#1491 forfeit] delegated: base owner is the delegation program
- ✅ [#1405 regular 1] delegated: base owner is the delegation program
- ✅ [#1424 regular 20] live with oracle reference prices
- ✅ [#1488 regular 5] live with oracle reference prices
- ✅ [#1712 mirror] delegated: base owner is the delegation program
- ✅ [#1405 regular 1] reveal with a wrong salt — refused with BadReveal
- ✅ [#1405 regular 1] reveal a different basket — refused with BadReveal
- ✅ [#1405 regular 1] reveal signed by a stranger on the ER — refused with Unauthorized
- ✅ [#1712 mirror] live with oracle reference prices
- ✅ [#1405 regular 1] start before both reveals — refused with NotRevealed
- ✅ [#1405 regular 1] live with oracle reference prices
- ✅ [#1405 regular 1] mutation requested before its second — refused with TooEarly
- ✅ [#1405 regular 1] rebalance changing the asset set — refused with BadBasket
- ✅ [#1405 regular 1] forged VRF callback — refused with ConstraintAddress
- ✅ [#1405 regular 1] finish before the end — refused with BadStatus
- ✅ [#1405 regular 1] settle while the duel is on the ER — refused with AccountOwnedByWrongProgram
- ✅ [#1491 forfeit] forfeit resolves: winner 0 — status 3 winner 0
- ✅ [#1491 forfeit] committed state on Solana equals the ER state
- ✅ [#1491 forfeit] loser minting the trophy — refused with NotTheWinner
- ✅ [#1491 forfeit] trophy records the winning basket
- ✅ [#1491 forfeit] payout (winner 0) — deltas 4.5,-5 expected 4.5,-5
- ✅ [#1491 forfeit] profile 0 (win): points, record, history — 52 -> 72 pts, streak 1
- ✅ [#1491 forfeit] profile 1 (loss): points, record, history — 28 -> 12 pts, streak -1
- ✅ [#1488 regular 5] VRF mutation 0 applied
- ✅ [#1424 regular 20] VRF mutation 0 applied
- ✅ [#1712 mirror] VRF mutation 0 applied
- ✅ [#1405 regular 1] VRF mutation 0 applied
- ✅ [#1405 regular 1] same mutation requested twice — refused with AlreadyRequested
- ✅ [#1602 abandoned] abandoned draft refunds both stakes — 100,100 -> 100,100
- ✅ [#1602 abandoned] cancelled duel status
- ✅ [#1556 no-show] forfeit resolves: winner 2 — status 3 winner 2
- ✅ [#1556 no-show] committed state on Solana equals the ER state
- ✅ [#1556 no-show] trophy for a draw — refused with NotTheWinner
- ✅ [#1556 no-show] payout (winner 2) — deltas 0,0 expected 0,0
- ✅ [#1556 no-show] profile 0 (draw): points, record, history — 0 -> 0 pts, streak -3
- ✅ [#1556 no-show] profile 1 (draw): points, record, history — 0 -> 0 pts, streak 0
- ✅ [#1424 regular 20] VRF mutation 1 applied
- ✅ [#1488 regular 5] VRF mutation 1 applied
- ✅ [#1712 mirror] VRF mutation 1 applied
- ✅ [#1405 regular 1] VRF mutation 1 applied
- ✅ [#1488 regular 5] third rebalance — refused with NoRebalanceLeft
- ✅ [#1424 regular 20] third rebalance — refused with NoRebalanceLeft
- ✅ [#1712 mirror] third rebalance — refused with NoRebalanceLeft
- ✅ [#1405 regular 1] third rebalance — refused with NoRebalanceLeft
- ✅ [#1424 regular 20] VRF mutation 2 applied
- ✅ [#1488 regular 5] VRF mutation 2 applied
- ✅ [#1712 mirror] VRF mutation 2 applied
- ✅ [#1405 regular 1] VRF mutation 2 applied
- ✅ [#1424 regular 20] finished on time by the crank — ticks 301, status 3
- ✅ [#1424 regular 20] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#1424 regular 20] three different mutation kinds — PYTH frozen for 30s | JUP weight x2 | Swap: JUP <-> JTO
- ✅ [#1424 regular 20] winner matches scores — -0.7846% vs -0.8591%
- ✅ [#1488 regular 5] finished on time by the crank — ticks 301, status 3
- ✅ [#1488 regular 5] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#1488 regular 5] three different mutation kinds — JTO frozen for 30s | SOL weight x2 | Swap: BONK <-> PYTH
- ✅ [#1488 regular 5] winner matches scores — -0.9239% vs -0.9336%
- ✅ [#1712 mirror] finished on time by the crank — ticks 300, status 3
- ✅ [#1712 mirror] crank ticked ~1/s — 300 ticks in 300s
- ✅ [#1712 mirror] three different mutation kinds — BONK weight x2 | Swap: JUP <-> WIF | JUP frozen for 30s
- ✅ [#1712 mirror] winner matches scores — -1.0887% vs -0.9541%
- ✅ [#1488 regular 5] committed state on Solana equals the ER state
- ✅ [#1424 regular 20] committed state on Solana equals the ER state
- ✅ [#1712 mirror] committed state on Solana equals the ER state
- ✅ [#1488 regular 5] loser minting the trophy — refused with NotTheWinner
- ✅ [#1424 regular 20] loser minting the trophy — refused with NotTheWinner
- ✅ [#1488 regular 5] trophy records the winning basket
- ✅ [#1424 regular 20] trophy records the winning basket
- ✅ [#1488 regular 5] payout (winner 0) — deltas 4.5,-5 expected 4.5,-5
- ✅ [#1488 regular 5] profile 0 (win): points, record, history — 56 -> 76 pts, streak 1
- ✅ [#1488 regular 5] profile 1 (loss): points, record, history — 8 -> 0 pts, streak -3
- ✅ [#1424 regular 20] payout (winner 0) — deltas 18,-20 expected 18,-20
- ✅ [#1424 regular 20] profile 0 (win): points, record, history — 156 -> 176 pts, streak 3
- ✅ [#1424 regular 20] profile 1 (loss): points, record, history — 188 -> 172 pts, streak -1
- ✅ [#1712 mirror] loser minting the trophy — refused with NotTheWinner
- ✅ [#1405 regular 1] finished on time by the crank — ticks 301, status 3
- ✅ [#1405 regular 1] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#1405 regular 1] three different mutation kinds — PYTH frozen for 30s | Swap: PYTH <-> JTO | SOL weight x2
- ✅ [#1405 regular 1] winner matches scores — -0.7185% vs -0.9150%
- ✅ [#1712 mirror] trophy records the winning basket
- ✅ [#1712 mirror] payout (winner 1) — deltas -1,0.9 expected -1,0.9
- ✅ [#1712 mirror] profile 0 (loss): points, record, history — 0 -> 0 pts, streak -3
- ✅ [#1712 mirror] profile 1 (win): points, record, history — 44 -> 64 pts, streak 2
- ✅ [#1405 regular 1] committed state on Solana equals the ER state
- ✅ [#1405 regular 1] settle paying the winner's share to a wrong account — refused with BadTokenAccount
- ✅ [#1405 regular 1] settle twice — refused with BadStatus
- ✅ [#1405 regular 1] loser minting the trophy — refused with NotTheWinner
- ✅ [#1405 regular 1] trophy records the winning basket
- ✅ [#1405 regular 1] trophy minted twice — refused with already in use
- ✅ [#1405 regular 1] payout (winner 0) — deltas 0.9,-1 expected 0.9,-1
- ✅ [#1405 regular 1] profile 0 (win): points, record, history — 124 -> 144 pts, streak 4
- ✅ [#1405 regular 1] profile 1 (loss): points, record, history — 44 -> 28 pts, streak -1
- ✅ [#1721 regular 1] commit with a session token for another player — refused with Unauthorized
- ✅ [#1755 regular 20] delegated: base owner is the delegation program
- ✅ [#1769 forfeit] delegated: base owner is the delegation program
- ✅ [#1721 regular 1] commit by a stranger without a session token — refused with Unauthorized
- ✅ [#1721 regular 1] delegate before both commitments — refused with NotCommitted
- ✅ [#1917 abandoned] cancel before the draft deadline — refused with DraftNotOver
- ✅ [#1890 regular 5] delegated: base owner is the delegation program
- ✅ [#1775 no-show] delegated: base owner is the delegation program
- ✅ [#1755 regular 20] live with oracle reference prices
- ✅ [#1721 regular 1] delegated: base owner is the delegation program
- ✅ [#1721 regular 1] reveal with a wrong salt — refused with BadReveal
- ✅ [#2157 mirror] delegated: base owner is the delegation program
- ✅ [#1721 regular 1] reveal a different basket — refused with BadReveal
- ✅ [#1890 regular 5] live with oracle reference prices
- ✅ [#1721 regular 1] reveal signed by a stranger on the ER — refused with Unauthorized
- ✅ [#2157 mirror] live with oracle reference prices
- ✅ [#1721 regular 1] start before both reveals — refused with NotRevealed
- ✅ [#1721 regular 1] live with oracle reference prices
- ✅ [#1721 regular 1] mutation requested before its second — refused with TooEarly
- ✅ [#1721 regular 1] rebalance changing the asset set — refused with BadBasket
- ✅ [#1721 regular 1] forged VRF callback — refused with ConstraintAddress
- ✅ [#1721 regular 1] finish before the end — refused with BadStatus
- ✅ [#1721 regular 1] settle while the duel is on the ER — refused with AccountOwnedByWrongProgram
- ✅ [#1769 forfeit] forfeit resolves: winner 0 — status 3 winner 0
- ✅ [#1769 forfeit] committed state on Solana equals the ER state
- ✅ [#1769 forfeit] loser minting the trophy — refused with NotTheWinner
- ✅ [#1769 forfeit] trophy records the winning basket
- ✅ [#1769 forfeit] payout (winner 0) — deltas 4.5,-5 expected 4.5,-5
- ✅ [#1769 forfeit] profile 0 (win): points, record, history — 0 -> 20 pts, streak 1
- ✅ [#1769 forfeit] profile 1 (loss): points, record, history — 0 -> 0 pts, streak -1
- ✅ [#1755 regular 20] VRF mutation 0 applied
- ✅ [#1890 regular 5] VRF mutation 0 applied
- ✅ [#2157 mirror] VRF mutation 0 applied
- ✅ [#1721 regular 1] VRF mutation 0 applied
- ✅ [#1721 regular 1] same mutation requested twice — refused with AlreadyRequested
- ✅ [#1917 abandoned] abandoned draft refunds both stakes — 100,100 -> 100,100
- ✅ [#1917 abandoned] cancelled duel status
- ✅ [#1775 no-show] forfeit resolves: winner 2 — status 3 winner 2
- ✅ [#1775 no-show] committed state on Solana equals the ER state
- ✅ [#1775 no-show] trophy for a draw — refused with NotTheWinner
- ✅ [#1775 no-show] payout (winner 2) — deltas 0,0 expected 0,0
- ✅ [#1775 no-show] profile 0 (draw): points, record, history — 0 -> 0 pts, streak 0
- ✅ [#1775 no-show] profile 1 (draw): points, record, history — 0 -> 0 pts, streak 0
- ✅ [#1755 regular 20] VRF mutation 1 applied
- ✅ [#1890 regular 5] VRF mutation 1 applied
- ✅ [#2157 mirror] VRF mutation 1 applied
- ✅ [#1721 regular 1] VRF mutation 1 applied
- ✅ [#1755 regular 20] third rebalance — refused with NoRebalanceLeft
- ✅ [#1890 regular 5] third rebalance — refused with NoRebalanceLeft
- ✅ [#2157 mirror] third rebalance — refused with NoRebalanceLeft
- ✅ [#1721 regular 1] third rebalance — refused with NoRebalanceLeft
- ✅ [#1755 regular 20] VRF mutation 2 applied
- ✅ [#1890 regular 5] VRF mutation 2 applied
- ✅ [#2157 mirror] VRF mutation 2 applied
- ✅ [#1721 regular 1] VRF mutation 2 applied
- ✅ [#1755 regular 20] finished on time by the crank — ticks 301, status 3
- ✅ [#1755 regular 20] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#1755 regular 20] three different mutation kinds — Swap fizzles: both hold JTO | BONK weight x2 | JUP frozen for 30s
- ✅ [#1755 regular 20] winner matches scores — -0.1452% vs -0.2106%
- ✅ [#1890 regular 5] finished on time by the crank — ticks 301, status 3
- ✅ [#1890 regular 5] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#1890 regular 5] three different mutation kinds — Swap: BONK <-> JTO | JUP frozen for 30s | WIF weight x2
- ✅ [#1890 regular 5] winner matches scores — -0.3433% vs -0.3347%
- ✅ [#1755 regular 20] committed state on Solana equals the ER state
- ✅ [#1890 regular 5] committed state on Solana equals the ER state
- ✅ [#2157 mirror] finished on time by the crank — ticks 301, status 3
- ✅ [#2157 mirror] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#2157 mirror] three different mutation kinds — Swap: SOL <-> JTO | PYTH weight x2 | JUP frozen for 30s
- ✅ [#2157 mirror] winner matches scores — -0.3189% vs -0.2099%
- ✅ [#1755 regular 20] loser minting the trophy — refused with NotTheWinner
- ✅ [#1755 regular 20] trophy records the winning basket
- ✅ [#2157 mirror] committed state on Solana equals the ER state
- ✅ [#1755 regular 20] payout (winner 0) — deltas 18,-20 expected 18,-20
- ✅ [#1755 regular 20] profile 0 (win): points, record, history — 64 -> 84 pts, streak 3
- ✅ [#1755 regular 20] profile 1 (loss): points, record, history — 72 -> 56 pts, streak -1
- ✅ [#1890 regular 5] loser minting the trophy — refused with NotTheWinner
- ✅ [#1890 regular 5] trophy records the winning basket
- ✅ [#1890 regular 5] payout (winner 1) — deltas -5,4.5 expected -5,4.5
- ✅ [#1890 regular 5] profile 0 (loss): points, record, history — 172 -> 156 pts, streak -2
- ✅ [#1890 regular 5] profile 1 (win): points, record, history — 0 -> 20 pts, streak 1
- ✅ [#2157 mirror] loser minting the trophy — refused with NotTheWinner
- ✅ [#1721 regular 1] finished on time by the crank — ticks 301, status 3
- ✅ [#1721 regular 1] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#1721 regular 1] three different mutation kinds — Swap: JUP <-> SOL | SOL frozen for 30s | WIF weight x2
- ✅ [#1721 regular 1] winner matches scores — -0.2890% vs -0.3786%
- ✅ [#2157 mirror] trophy records the winning basket
- ✅ [#2157 mirror] payout (winner 1) — deltas -1,0.9 expected -1,0.9
- ✅ [#2157 mirror] profile 0 (loss): points, record, history — 12 -> 0 pts, streak -2
- ✅ [#2157 mirror] profile 1 (win): points, record, history — 0 -> 20 pts, streak 1
- ✅ [#1721 regular 1] committed state on Solana equals the ER state
- ✅ [#1721 regular 1] settle paying the winner's share to a wrong account — refused with BadTokenAccount
- ✅ [#1721 regular 1] settle twice — refused with BadStatus
- ✅ [#1721 regular 1] loser minting the trophy — refused with NotTheWinner
- ✅ [#1721 regular 1] trophy records the winning basket
- ✅ [#1721 regular 1] trophy minted twice — refused with already in use
- ✅ [#1721 regular 1] payout (winner 0) — deltas 0.9,-1 expected 0.9,-1
- ✅ [#1721 regular 1] profile 0 (win): points, record, history — 0 -> 20 pts, streak 1
- ✅ [#1721 regular 1] profile 1 (loss): points, record, history — 176 -> 160 pts, streak -1

## Notes

- rush: 6 simultaneous seats on one table, 15 automatic retries, 3 joins
