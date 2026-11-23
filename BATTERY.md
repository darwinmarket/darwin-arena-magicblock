# Battery report

Run 2026-11-23T14:13:02.831Z · program `GnQC4MjzjS8AZvtj5VR64ovJupSm93yCiYz1ZkLyzFNp` · 14 players · 3 round(s) · 981 s

**257 / 257 checks passed.** Admin SOL 20.5577 -> 19.6170 (funding players).

## Latencies

| step | n | median ms | max ms |
|---|---|---|---|
| fund players | 2 | 968 | 968 |
| player setup + session | 14 | 976 | 1469 |
| open | 21 | 962 | 1213 |
| join | 21 | 1026 | 1445 |
| commit | 21 | 1018 | 1529 |
| commit + delegate | 18 | 1023 | 1547 |
| delegation visible on ER | 18 | 160 | 760 |
| reveal (ER) | 27 | 1009 | 1587 |
| start + crank (ER) | 12 | 1028 | 1539 |
| start (forfeit) | 6 | 1042 | 1344 |
| finish (commit+undelegate) | 18 | 992 | 1442 |
| undelegation back on Solana | 18 | 1639 | 3078 |
| settle | 18 | 1020 | 1544 |
| VRF request (ER) | 36 | 1014 | 1536 |
| VRF request -> callback applied | 36 | 1290 | 1960 |
| cancel draft | 3 | 1148 | 2014 |
| rebalance (ER) | 45 | 1049 | 3141 |

## Checks

- ✅ [#9 no-show] delegated: base owner is the delegation program
- ✅ [#10 regular 20] delegated: base owner is the delegation program
- ✅ [#11 regular 1] commit with a session token for another player — refused with Unauthorized
- ✅ [#10 regular 20] live with oracle reference prices
- ✅ [#11 regular 1] commit by a stranger without a session token — refused with Unauthorized
- ✅ [#12 forfeit] delegated: base owner is the delegation program
- ✅ [#11 regular 1] delegate before both commitments — refused with NotCommitted
- ✅ [#13 mirror] delegated: base owner is the delegation program
- ✅ [#14 regular 5] delegated: base owner is the delegation program
- ✅ [#11 regular 1] delegated: base owner is the delegation program
- ✅ [#15 abandoned] cancel before the draft deadline — refused with DraftNotOver
- ✅ [#11 regular 1] reveal with a wrong salt — refused with BadReveal
- ✅ [#13 mirror] live with oracle reference prices
- ✅ [#11 regular 1] reveal a different basket — refused with BadReveal
- ✅ [#14 regular 5] live with oracle reference prices
- ✅ [#11 regular 1] reveal signed by a stranger on the ER — refused with Unauthorized
- ✅ [#11 regular 1] start before both reveals — refused with NotRevealed
- ✅ [#11 regular 1] live with oracle reference prices
- ✅ [#11 regular 1] mutation requested before its second — refused with TooEarly
- ✅ [#11 regular 1] rebalance changing the asset set — refused with BadBasket
- ✅ [#11 regular 1] forged VRF callback — refused with ConstraintAddress
- ✅ [#11 regular 1] finish before the end — refused with BadStatus
- ✅ [#11 regular 1] settle while the duel is on the ER — refused with AccountOwnedByWrongProgram
- ✅ [#12 forfeit] forfeit resolves: winner 0 — status 3 winner 0
- ✅ [#12 forfeit] committed state on Solana equals the ER state
- ✅ [#12 forfeit] payout (winner 0) — deltas 4.5,-5 expected 4.5,-5
- ✅ [#12 forfeit] profile 0 (win): points, record, history — 0 -> 20 pts, streak 1
- ✅ [#12 forfeit] profile 1 (loss): points, record, history — 0 -> 0 pts, streak -1
- ✅ [#10 regular 20] VRF mutation 0 applied
- ✅ [#13 mirror] VRF mutation 0 applied
- ✅ [#14 regular 5] VRF mutation 0 applied
- ✅ [#11 regular 1] VRF mutation 0 applied
- ✅ [#11 regular 1] same mutation requested twice — refused with AlreadyRequested
- ✅ [#15 abandoned] abandoned draft refunds both stakes — 100,100 -> 100,100
- ✅ [#15 abandoned] cancelled duel status
- ✅ [#9 no-show] forfeit resolves: winner 2 — status 3 winner 2
- ✅ [#9 no-show] committed state on Solana equals the ER state
- ✅ [#9 no-show] payout (winner 2) — deltas 0,0 expected 0,0
- ✅ [#9 no-show] profile 0 (draw): points, record, history — 0 -> 0 pts, streak 0
- ✅ [#9 no-show] profile 1 (draw): points, record, history — 0 -> 0 pts, streak 0
- ✅ [#10 regular 20] VRF mutation 1 applied
- ✅ [#13 mirror] VRF mutation 1 applied
- ✅ [#14 regular 5] VRF mutation 1 applied
- ✅ [#11 regular 1] VRF mutation 1 applied
- ✅ [#10 regular 20] third rebalance — refused with NoRebalanceLeft
- ✅ [#13 mirror] third rebalance — refused with NoRebalanceLeft
- ✅ [#14 regular 5] third rebalance — refused with NoRebalanceLeft
- ✅ [#11 regular 1] third rebalance — refused with NoRebalanceLeft
- ✅ [#10 regular 20] VRF mutation 2 applied
- ✅ [#13 mirror] VRF mutation 2 applied
- ✅ [#14 regular 5] VRF mutation 2 applied
- ✅ [#11 regular 1] VRF mutation 2 applied
- ✅ [#10 regular 20] finished on time by the crank — ticks 301, status 3
- ✅ [#10 regular 20] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#10 regular 20] three different mutation kinds — PYTH weight x2 | PYTH frozen for 30s | Swap: WIF <-> PYTH
- ✅ [#10 regular 20] winner matches scores — 1.8237% vs 2.0403%
- ✅ [#10 regular 20] committed state on Solana equals the ER state
- ✅ [#10 regular 20] payout (winner 1) — deltas -20,18 expected -20,18
- ✅ [#10 regular 20] profile 0 (loss): points, record, history — 0 -> 0 pts, streak -3
- ✅ [#10 regular 20] profile 1 (win): points, record, history — 20 -> 40 pts, streak 2
- ✅ [#13 mirror] finished on time by the crank — ticks 301, status 3
- ✅ [#13 mirror] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#13 mirror] three different mutation kinds — JUP weight x2 | Swap: JUP <-> JTO | BONK frozen for 30s
- ✅ [#13 mirror] winner matches scores — 1.6511% vs 1.0505%
- ✅ [#14 regular 5] finished on time by the crank — ticks 301, status 3
- ✅ [#14 regular 5] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#14 regular 5] three different mutation kinds — BONK frozen for 30s | JTO weight x2 | Swap: WIF <-> BONK
- ✅ [#14 regular 5] winner matches scores — 0.8449% vs 0.9619%
- ✅ [#13 mirror] committed state on Solana equals the ER state
- ✅ [#14 regular 5] committed state on Solana equals the ER state
- ✅ [#13 mirror] payout (winner 0) — deltas 0.9,-1 expected 0.9,-1
- ✅ [#13 mirror] profile 0 (win): points, record, history — 0 -> 20 pts, streak 1
- ✅ [#13 mirror] profile 1 (loss): points, record, history — 20 -> 4 pts, streak -1
- ✅ [#14 regular 5] payout (winner 1) — deltas -5,4.5 expected -5,4.5
- ✅ [#14 regular 5] profile 0 (loss): points, record, history — 20 -> 4 pts, streak -1
- ✅ [#14 regular 5] profile 1 (win): points, record, history — 0 -> 20 pts, streak 1
- ✅ [#11 regular 1] finished on time by the crank — ticks 301, status 3
- ✅ [#11 regular 1] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#11 regular 1] three different mutation kinds — SOL frozen for 30s | BONK weight x2 | Swap fizzles: both hold JUP
- ✅ [#11 regular 1] winner matches scores — 1.1262% vs 1.2780%
- ✅ [#11 regular 1] committed state on Solana equals the ER state
- ✅ [#11 regular 1] settle paying the winner's share to a wrong account — refused with BadTokenAccount
- ✅ [#11 regular 1] settle twice — refused with BadStatus
- ✅ [#11 regular 1] payout (winner 1) — deltas -1,0.9 expected -1,0.9
- ✅ [#11 regular 1] profile 0 (loss): points, record, history — 0 -> 0 pts, streak -2
- ✅ [#11 regular 1] profile 1 (win): points, record, history — 40 -> 60 pts, streak 3
- ✅ [#16 forfeit] delegated: base owner is the delegation program
- ✅ [#17 regular 1] commit with a session token for another player — refused with Unauthorized
- ✅ [#17 regular 1] commit by a stranger without a session token — refused with Unauthorized
- ✅ [#18 abandoned] cancel before the draft deadline — refused with DraftNotOver
- ✅ [#17 regular 1] delegate before both commitments — refused with NotCommitted
- ✅ [#17 regular 1] delegated: base owner is the delegation program
- ✅ [#19 mirror] delegated: base owner is the delegation program
- ✅ [#17 regular 1] reveal with a wrong salt — refused with BadReveal
- ✅ [#20 no-show] delegated: base owner is the delegation program
- ✅ [#17 regular 1] reveal a different basket — refused with BadReveal
- ✅ [#21 regular 5] delegated: base owner is the delegation program
- ✅ [#19 mirror] live with oracle reference prices
- ✅ [#17 regular 1] reveal signed by a stranger on the ER — refused with Unauthorized
- ✅ [#17 regular 1] start before both reveals — refused with NotRevealed
- ✅ [#22 regular 20] delegated: base owner is the delegation program
- ✅ [#21 regular 5] live with oracle reference prices
- ✅ [#17 regular 1] live with oracle reference prices
- ✅ [#22 regular 20] live with oracle reference prices
- ✅ [#17 regular 1] mutation requested before its second — refused with TooEarly
- ✅ [#17 regular 1] rebalance changing the asset set — refused with BadBasket
- ✅ [#17 regular 1] forged VRF callback — refused with ConstraintAddress
- ✅ [#17 regular 1] finish before the end — refused with BadStatus
- ✅ [#17 regular 1] settle while the duel is on the ER — refused with AccountOwnedByWrongProgram
- ✅ [#16 forfeit] forfeit resolves: winner 0 — status 3 winner 0
- ✅ [#16 forfeit] committed state on Solana equals the ER state
- ✅ [#16 forfeit] payout (winner 0) — deltas 4.5,-5 expected 4.5,-5
- ✅ [#16 forfeit] profile 0 (win): points, record, history — 0 -> 20 pts, streak 1
- ✅ [#16 forfeit] profile 1 (loss): points, record, history — 0 -> 0 pts, streak -1
- ✅ [#19 mirror] VRF mutation 0 applied
- ✅ [#21 regular 5] VRF mutation 0 applied
- ✅ [#17 regular 1] VRF mutation 0 applied
- ✅ [#17 regular 1] same mutation requested twice — refused with AlreadyRequested
- ✅ [#22 regular 20] VRF mutation 0 applied
- ✅ [#18 abandoned] abandoned draft refunds both stakes — 106.3,99.5 -> 106.3,99.5
- ✅ [#18 abandoned] cancelled duel status
- ✅ [#20 no-show] forfeit resolves: winner 2 — status 3 winner 2
- ✅ [#20 no-show] committed state on Solana equals the ER state
- ✅ [#20 no-show] payout (winner 2) — deltas 0,0 expected 0,0
- ✅ [#20 no-show] profile 0 (draw): points, record, history — 0 -> 0 pts, streak 0
- ✅ [#20 no-show] profile 1 (draw): points, record, history — 0 -> 0 pts, streak -2
- ✅ [#19 mirror] VRF mutation 1 applied
- ✅ [#21 regular 5] VRF mutation 1 applied
- ✅ [#17 regular 1] VRF mutation 1 applied
- ✅ [#22 regular 20] VRF mutation 1 applied
- ✅ [#19 mirror] third rebalance — refused with NoRebalanceLeft
- ✅ [#21 regular 5] third rebalance — refused with NoRebalanceLeft
- ✅ [#17 regular 1] third rebalance — refused with NoRebalanceLeft
- ✅ [#19 mirror] VRF mutation 2 applied
- ✅ [#21 regular 5] VRF mutation 2 applied
- ✅ [#17 regular 1] VRF mutation 2 applied
- ✅ [#22 regular 20] VRF mutation 2 applied
- ✅ [#19 mirror] finished on time by the crank — ticks 301, status 3
- ✅ [#19 mirror] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#19 mirror] three different mutation kinds — WIF frozen for 30s | PYTH weight x2 | Swap: WIF <-> BONK
- ✅ [#19 mirror] winner matches scores — 0.6928% vs 0.6133%
- ✅ [#19 mirror] committed state on Solana equals the ER state
- ✅ [#21 regular 5] finished on time by the crank — ticks 301, status 3
- ✅ [#21 regular 5] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#21 regular 5] three different mutation kinds — BONK frozen for 30s | SOL weight x2 | Swap: SOL <-> PYTH
- ✅ [#21 regular 5] winner matches scores — 0.2465% vs 0.3887%
- ✅ [#19 mirror] payout (winner 0) — deltas 0.9,-1 expected 0.9,-1
- ✅ [#19 mirror] profile 0 (win): points, record, history — 0 -> 20 pts, streak 1
- ✅ [#19 mirror] profile 1 (loss): points, record, history — 0 -> 0 pts, streak -1
- ✅ [#22 regular 20] finished on time by the crank — ticks 301, status 3
- ✅ [#22 regular 20] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#22 regular 20] three different mutation kinds — PYTH frozen for 30s | JUP weight x2 | Swap: JUP <-> SOL
- ✅ [#22 regular 20] winner matches scores — 0.2126% vs 0.2107%
- ✅ [#21 regular 5] committed state on Solana equals the ER state
- ✅ [#17 regular 1] finished on time by the crank — ticks 301, status 3
- ✅ [#17 regular 1] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#17 regular 1] three different mutation kinds — JUP weight x2 | SOL frozen for 30s | Swap: WIF <-> SOL
- ✅ [#17 regular 1] winner matches scores — 0.1596% vs 0.1195%
- ✅ [#21 regular 5] payout (winner 1) — deltas -5,4.5 expected -5,4.5
- ✅ [#21 regular 5] profile 0 (loss): points, record, history — 40 -> 24 pts, streak -1
- ✅ [#21 regular 5] profile 1 (win): points, record, history — 20 -> 40 pts, streak 2
- ✅ [#22 regular 20] committed state on Solana equals the ER state
- ✅ [#17 regular 1] committed state on Solana equals the ER state
- ✅ [#22 regular 20] payout (winner 0) — deltas 18,-20 expected 18,-20
- ✅ [#22 regular 20] profile 0 (win): points, record, history — 4 -> 24 pts, streak 1
- ✅ [#22 regular 20] profile 1 (loss): points, record, history — 20 -> 4 pts, streak -1
- ✅ [#17 regular 1] settle paying the winner's share to a wrong account — refused with BadTokenAccount
- ✅ [#17 regular 1] settle twice — refused with BadStatus
- ✅ [#17 regular 1] payout (winner 0) — deltas 0.9,-1 expected 0.9,-1
- ✅ [#17 regular 1] profile 0 (win): points, record, history — 20 -> 40 pts, streak 2
- ✅ [#17 regular 1] profile 1 (loss): points, record, history — 0 -> 0 pts, streak -4
- ✅ [#24 regular 1] commit with a session token for another player — refused with Unauthorized
- ✅ [#23 regular 5] delegated: base owner is the delegation program
- ✅ [#24 regular 1] commit by a stranger without a session token — refused with Unauthorized
- ✅ [#24 regular 1] delegate before both commitments — refused with NotCommitted
- ✅ [#25 regular 20] delegated: base owner is the delegation program
- ✅ [#26 forfeit] delegated: base owner is the delegation program
- ✅ [#23 regular 5] live with oracle reference prices
- ✅ [#24 regular 1] delegated: base owner is the delegation program
- ✅ [#27 no-show] delegated: base owner is the delegation program
- ✅ [#28 abandoned] cancel before the draft deadline — refused with DraftNotOver
- ✅ [#25 regular 20] live with oracle reference prices
- ✅ [#24 regular 1] reveal with a wrong salt — refused with BadReveal
- ✅ [#24 regular 1] reveal a different basket — refused with BadReveal
- ✅ [#29 mirror] delegated: base owner is the delegation program
- ✅ [#24 regular 1] reveal signed by a stranger on the ER — refused with Unauthorized
- ✅ [#24 regular 1] start before both reveals — refused with NotRevealed
- ✅ [#29 mirror] live with oracle reference prices
- ✅ [#24 regular 1] live with oracle reference prices
- ✅ [#24 regular 1] mutation requested before its second — refused with TooEarly
- ✅ [#24 regular 1] rebalance changing the asset set — refused with BadBasket
- ✅ [#24 regular 1] forged VRF callback — refused with ConstraintAddress
- ✅ [#24 regular 1] finish before the end — refused with BadStatus
- ✅ [#24 regular 1] settle while the duel is on the ER — refused with AccountOwnedByWrongProgram
- ✅ [#26 forfeit] forfeit resolves: winner 0 — status 3 winner 0
- ✅ [#26 forfeit] committed state on Solana equals the ER state
- ✅ [#26 forfeit] payout (winner 0) — deltas 4.5,-5 expected 4.5,-5
- ✅ [#26 forfeit] profile 0 (win): points, record, history — 0 -> 20 pts, streak 1
- ✅ [#26 forfeit] profile 1 (loss): points, record, history — 60 -> 44 pts, streak -1
- ✅ [#23 regular 5] VRF mutation 0 applied
- ✅ [#25 regular 20] VRF mutation 0 applied
- ✅ [#29 mirror] VRF mutation 0 applied
- ✅ [#24 regular 1] VRF mutation 0 applied
- ✅ [#24 regular 1] same mutation requested twice — refused with AlreadyRequested
- ✅ [#28 abandoned] abandoned draft refunds both stakes — 54,131 -> 54,131
- ✅ [#28 abandoned] cancelled duel status
- ✅ [#27 no-show] forfeit resolves: winner 2 — status 3 winner 2
- ✅ [#27 no-show] committed state on Solana equals the ER state
- ✅ [#27 no-show] payout (winner 2) — deltas 0,0 expected 0,0
- ✅ [#27 no-show] profile 0 (draw): points, record, history — 4 -> 4 pts, streak -1
- ✅ [#27 no-show] profile 1 (draw): points, record, history — 40 -> 40 pts, streak 2
- ✅ [#23 regular 5] VRF mutation 1 applied
- ✅ [#25 regular 20] VRF mutation 1 applied
- ✅ [#29 mirror] VRF mutation 1 applied
- ✅ [#24 regular 1] VRF mutation 1 applied
- ✅ [#23 regular 5] third rebalance — refused with NoRebalanceLeft
- ✅ [#25 regular 20] third rebalance — refused with NoRebalanceLeft
- ✅ [#29 mirror] third rebalance — refused with NoRebalanceLeft
- ✅ [#24 regular 1] third rebalance — refused with NoRebalanceLeft
- ✅ [#23 regular 5] VRF mutation 2 applied
- ✅ [#25 regular 20] VRF mutation 2 applied
- ✅ [#29 mirror] VRF mutation 2 applied
- ✅ [#24 regular 1] VRF mutation 2 applied
- ✅ [#23 regular 5] finished on time by the crank — ticks 301, status 3
- ✅ [#23 regular 5] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#23 regular 5] three different mutation kinds — SOL weight x2 | Swap fizzles: both hold PYTH | JUP frozen for 30s
- ✅ [#23 regular 5] winner matches scores — 0.9578% vs 0.6289%
- ✅ [#25 regular 20] finished on time by the crank — ticks 301, status 3
- ✅ [#25 regular 20] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#25 regular 20] three different mutation kinds — PYTH frozen for 30s | Swap fizzles: both hold JUP | WIF weight x2
- ✅ [#25 regular 20] winner matches scores — 0.9891% vs 0.5040%
- ✅ [#23 regular 5] committed state on Solana equals the ER state
- ✅ [#23 regular 5] payout (winner 0) — deltas 4.5,-5 expected 4.5,-5
- ✅ [#23 regular 5] profile 0 (win): points, record, history — 4 -> 24 pts, streak 1
- ✅ [#23 regular 5] profile 1 (loss): points, record, history — 20 -> 4 pts, streak -1
- ✅ [#25 regular 20] committed state on Solana equals the ER state
- ✅ [#25 regular 20] payout (winner 0) — deltas 18,-20 expected 18,-20
- ✅ [#25 regular 20] profile 0 (win): points, record, history — 0 -> 20 pts, streak 1
- ✅ [#25 regular 20] profile 1 (loss): points, record, history — 20 -> 4 pts, streak -1
- ✅ [#29 mirror] finished on time by the crank — ticks 301, status 3
- ✅ [#29 mirror] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#29 mirror] three different mutation kinds — BONK weight x2 | SOL frozen for 30s | Swap: SOL <-> PYTH
- ✅ [#29 mirror] winner matches scores — 0.8994% vs 0.9807%
- ✅ [#24 regular 1] finished on time by the crank — ticks 301, status 3
- ✅ [#24 regular 1] crank ticked ~1/s — 301 ticks in 300s
- ✅ [#24 regular 1] three different mutation kinds — JUP weight x2 | SOL frozen for 30s | Swap fizzles: both hold JUP
- ✅ [#24 regular 1] winner matches scores — 0.7386% vs 0.8294%
- ✅ [#29 mirror] committed state on Solana equals the ER state
- ✅ [#24 regular 1] committed state on Solana equals the ER state
- ✅ [#29 mirror] payout (winner 1) — deltas -1,0.9 expected -1,0.9
- ✅ [#29 mirror] profile 0 (loss): points, record, history — 0 -> 0 pts, streak -2
- ✅ [#29 mirror] profile 1 (win): points, record, history — 0 -> 20 pts, streak 1
- ✅ [#24 regular 1] settle paying the winner's share to a wrong account — refused with BadTokenAccount
- ✅ [#24 regular 1] settle twice — refused with BadStatus
- ✅ [#24 regular 1] payout (winner 1) — deltas -1,0.9 expected -1,0.9
- ✅ [#24 regular 1] profile 0 (loss): points, record, history — 40 -> 24 pts, streak -1
- ✅ [#24 regular 1] profile 1 (win): points, record, history — 24 -> 44 pts, streak 2
