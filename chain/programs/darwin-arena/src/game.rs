//! Game state and rules, kept free of account plumbing so they can be unit
//! tested on the host.
use anchor_lang::prelude::*;

/// SOL, JUP, BONK, WIF, JTO, PYTH, in that order everywhere.
pub const ASSETS: usize = 6;
pub const MIN_LEGS: usize = 3;
pub const MAX_LEGS: usize = 5;
pub const WEIGHT_STEP: u8 = 5;
pub const MAX_REBALANCES: u8 = 2;
pub const NAME_LEN: usize = 20;
pub const HISTORY: usize = 8;

pub const MUTATIONS: usize = 3;
/// Seconds into the duel at which each mutation may be drawn.
pub const MUTATION_AT: [i64; MUTATIONS] = [60, 150, 240];
pub const FREEZE_SECONDS: i64 = 30;

/// Score unit: 1e-9 of a fraction, so 10_000_000 is +1 %.
pub const SCORE_ONE: i128 = 1_000_000_000;

pub const STATUS_OPEN: u8 = 0;
pub const STATUS_DRAFTING: u8 = 1;
pub const STATUS_LIVE: u8 = 2;
pub const STATUS_FINISHED: u8 = 3;
pub const STATUS_SETTLED: u8 = 4;
pub const STATUS_CANCELLED: u8 = 5;

pub const NO_WINNER: u8 = 255;
pub const DRAW: u8 = 2;
pub const NONE: u8 = 255;

pub const MUT_NONE: u8 = 0;
pub const MUT_REQUESTED: u8 = 1;
pub const MUT_APPLIED: u8 = 2;

pub const KIND_DOUBLE: u8 = 0;
pub const KIND_FREEZE: u8 = 1;
pub const KIND_SWAP: u8 = 2;

pub const RESULT_WIN: u8 = 0;
pub const RESULT_LOSS: u8 = 1;
pub const RESULT_DRAW: u8 = 2;

pub const POINTS_WIN: u32 = 20;
pub const POINTS_LOSS: u32 = 16;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, InitSpace, Debug, PartialEq)]
pub struct MutationSlot {
    pub state: u8,
    pub kind: u8,
    /// DOUBLE / FREEZE: the asset. SWAP: the asset leaving player 0's basket.
    pub a: u8,
    /// SWAP: the asset leaving player 1's basket.
    pub b: u8,
    /// Second of the duel at which it landed.
    pub at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct Duel {
    pub id: u64,
    pub tier: u8,
    pub stake: u64,
    pub players: [Pubkey; 2],
    pub status: u8,
    pub created_ts: i64,
    pub draft_deadline: i64,
    /// sha256(duel || player || weights || salt), set during the draft.
    pub commits: [[u8; 32]; 2],
    /// Key allowed to act for each player on the rollup (a session key, or the wallet).
    pub session: [Pubkey; 2],
    pub session_until: [i64; 2],
    pub revealed: [bool; 2],
    pub reveal_deadline: i64,
    /// Current weights in %, per asset. 0 = not in the basket.
    pub weights: [[u8; ASSETS]; 2],
    /// Weights as revealed, for the record.
    pub start_weights: [[u8; ASSETS]; 2],
    pub start_ts: i64,
    pub last_tick_ts: i64,
    pub end_ts: i64,
    pub settled_ts: i64,
    /// Raw oracle prices (each asset in its own feed exponent).
    pub start_price: [u64; ASSETS],
    pub last_price: [u64; ASSETS],
    /// Accumulated performance, in SCORE_ONE units.
    pub score: [i64; 2],
    /// Weight multiplier per asset (DOUBLE sets 2).
    pub mult: [u8; ASSETS],
    pub frozen_asset: u8,
    pub frozen_until: i64,
    pub mutations: [MutationSlot; MUTATIONS],
    pub mutations_applied: u8,
    pub rebalances_left: [u8; 2],
    pub ticks: u32,
    /// 0 or 1, DRAW, or NO_WINNER while undecided.
    pub winner: u8,
    /// Ended because a basket was never revealed.
    pub forfeit: bool,
    pub task_id: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, InitSpace)]
pub struct MatchRecord {
    pub duel: Pubkey,
    pub opponent: Pubkey,
    pub opponent_name: [u8; NAME_LEN],
    pub my_score: i64,
    pub opp_score: i64,
    pub stake: u64,
    pub ts: i64,
    pub result: u8,
    pub weights: [u8; ASSETS],
    pub mutations: u8,
    pub rebalances: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Profile {
    pub authority: Pubkey,
    pub name: [u8; NAME_LEN],
    pub points: u32,
    pub wins: u32,
    pub losses: u32,
    pub draws: u32,
    /// Current streak: > 0 wins in a row, < 0 losses in a row.
    pub streak: i32,
    pub best_streak: u32,
    pub games: u32,
    pub sum_score: i64,
    pub best_score: i64,
    /// Mutations lived through in duels that were won.
    pub mutations_survived: u32,
    pub mutations_seen: u32,
    pub created_ts: i64,
    pub bump: u8,
    pub history_len: u8,
    /// Index of the most recent record.
    pub history_head: u8,
    pub history: [MatchRecord; HISTORY],
}

impl Profile {
    pub fn record(&mut self, r: MatchRecord) {
        self.games += 1;
        self.sum_score += r.my_score;
        if self.games == 1 || r.my_score > self.best_score {
            self.best_score = r.my_score;
        }
        self.mutations_seen += r.mutations as u32;
        match r.result {
            RESULT_WIN => {
                self.wins += 1;
                self.points += POINTS_WIN;
                self.streak = if self.streak > 0 { self.streak + 1 } else { 1 };
                self.best_streak = self.best_streak.max(self.streak as u32);
                self.mutations_survived += r.mutations as u32;
            }
            RESULT_LOSS => {
                self.losses += 1;
                self.points = self.points.saturating_sub(POINTS_LOSS);
                self.streak = if self.streak < 0 { self.streak - 1 } else { -1 };
            }
            _ => {
                self.draws += 1;
            }
        }
        let next = if self.history_len == 0 { 0 } else { (self.history_head as usize + 1) % HISTORY };
        self.history[next] = r;
        self.history_head = next as u8;
        self.history_len = (self.history_len + 1).min(HISTORY as u8);
    }
}

pub fn validate_basket(w: &[u8; ASSETS]) -> Result<()> {
    let legs = w.iter().filter(|x| **x > 0).count();
    require!((MIN_LEGS..=MAX_LEGS).contains(&legs), ArenaError::BadBasket);
    require!(w.iter().all(|x| x % WEIGHT_STEP == 0), ArenaError::BadBasket);
    require!(w.iter().map(|x| *x as u32).sum::<u32>() == 100, ArenaError::BadBasket);
    Ok(())
}

impl Duel {
    pub fn slot_of(&self, player: &Pubkey) -> Result<usize> {
        if self.players[0] == *player {
            Ok(0)
        } else if self.players[1] == *player {
            Ok(1)
        } else {
            err!(ArenaError::NotAPlayer)
        }
    }

    /// Which player a rollup signer acts for: the session key recorded at commit
    /// (while it is valid), or the player's own wallet.
    pub fn session_slot(&self, signer: &Pubkey, now: i64) -> Result<usize> {
        for s in 0..2 {
            if self.players[s] == *signer {
                return Ok(s);
            }
            if self.session[s] == *signer {
                require!(now <= self.session_until[s], ArenaError::SessionExpired);
                return Ok(s);
            }
        }
        err!(ArenaError::Unauthorized)
    }

    pub fn is_frozen(&self, asset: usize, now: i64) -> bool {
        self.frozen_asset as usize == asset && now < self.frozen_until
    }

    /// Move both scores along the price path since the last tick.
    ///
    /// Path-dependent on purpose: each asset contributes
    /// `weight x multiplier x (p_now / p_prev - 1)`, so a rebalance or a mutation
    /// only changes what happens next, never rewrites what already happened. A
    /// frozen asset's move is skipped (its reference still follows the market, so
    /// it does not jump when the freeze ends).
    pub fn advance(&mut self, prices: &[u64; ASSETS], now: i64) {
        if self.status != STATUS_LIVE {
            return;
        }
        let end = self.start_ts + crate::DUEL_SECONDS;
        let at = now.min(end);
        for i in 0..ASSETS {
            let prev = self.last_price[i];
            let p = prices[i];
            if prev == 0 || p == 0 {
                continue;
            }
            if !self.is_frozen(i, at) {
                let delta = (p as i128 - prev as i128) * SCORE_ONE / prev as i128;
                for s in 0..2 {
                    let w = self.weights[s][i] as i128 * self.mult[i] as i128;
                    self.score[s] = (self.score[s] as i128 + w * delta / 100) as i64;
                }
            }
            self.last_price[i] = p;
        }
        if self.frozen_asset != NONE && at >= self.frozen_until {
            self.frozen_asset = NONE;
        }
        self.ticks += 1;
        self.last_tick_ts = now;
        if now >= end {
            self.status = STATUS_FINISHED;
            self.end_ts = end;
            self.winner = if self.score[0] > self.score[1] {
                0
            } else if self.score[1] > self.score[0] {
                1
            } else {
                DRAW
            };
        }
    }

    pub fn rebalance(&mut self, slot: usize, w: [u8; ASSETS], now: i64) -> Result<()> {
        require!(self.rebalances_left[slot] > 0, ArenaError::NoRebalanceLeft);
        let cur = self.weights[slot];
        for i in 0..ASSETS {
            require!((w[i] > 0) == (cur[i] > 0), ArenaError::BadBasket);
        }
        require!(w.iter().all(|x| x % WEIGHT_STEP == 0), ArenaError::BadBasket);
        require!(w.iter().map(|x| *x as u32).sum::<u32>() == 100, ArenaError::BadBasket);
        let f = self.frozen_asset;
        if f != NONE && self.is_frozen(f as usize, now) {
            require!(w[f as usize] == cur[f as usize], ArenaError::FrozenAsset);
        }
        self.weights[slot] = w;
        self.rebalances_left[slot] -= 1;
        Ok(())
    }

    /// Turn 32 bytes of VRF output into a mutation and apply it.
    pub fn draw_mutation(&mut self, r: &[u8; 32], now: i64) -> MutationSlot {
        let at = now - self.start_ts;
        let held: Vec<usize> = (0..ASSETS).filter(|i| self.weights[0][*i] > 0 || self.weights[1][*i] > 0).collect();
        // Each kind lands once per duel, in an order the VRF decides.
        let used: Vec<u8> = self.mutations.iter().filter(|m| m.state == MUT_APPLIED).map(|m| m.kind).collect();
        let left: Vec<u8> = [KIND_DOUBLE, KIND_FREEZE, KIND_SWAP].into_iter().filter(|k| !used.contains(k)).collect();
        let kind = if left.is_empty() { r[0] % 3 } else { left[r[0] as usize % left.len()] };
        let pick = |c: &Vec<usize>, b: u8| c[b as usize % c.len()] as u8;
        match kind {
            KIND_DOUBLE => {
                let fresh: Vec<usize> = held.iter().copied().filter(|i| self.mult[*i] == 1).collect();
                let a = pick(if fresh.is_empty() { &held } else { &fresh }, r[1]);
                self.mult[a as usize] = 2;
                MutationSlot { state: MUT_APPLIED, kind, a, b: NONE, at }
            }
            KIND_FREEZE => {
                let others: Vec<usize> = held.iter().copied().filter(|i| !self.is_frozen(*i, now)).collect();
                let a = pick(if others.is_empty() { &held } else { &others }, r[1]);
                self.frozen_asset = a;
                self.frozen_until = now + FREEZE_SECONDS;
                MutationSlot { state: MUT_APPLIED, kind, a, b: NONE, at }
            }
            _ => {
                let legs0: Vec<usize> = (0..ASSETS).filter(|i| self.weights[0][*i] > 0).collect();
                let legs1: Vec<usize> = (0..ASSETS).filter(|i| self.weights[1][*i] > 0).collect();
                let a = pick(&legs0, r[1]);
                let b = pick(&legs1, r[2]);
                if a != b {
                    let (a, b) = (a as usize, b as usize);
                    let w0 = self.weights[0][a];
                    self.weights[0][a] = 0;
                    self.weights[0][b] += w0;
                    let w1 = self.weights[1][b];
                    self.weights[1][b] = 0;
                    self.weights[1][a] += w1;
                }
                MutationSlot { state: MUT_APPLIED, kind: KIND_SWAP, a, b, at }
            }
        }
    }
}

#[error_code]
pub enum ArenaError {
    #[msg("Unknown stake tier")]
    BadTier,
    #[msg("Faucet already claimed, try again later")]
    FaucetCooldown,
    #[msg("Wrong mint")]
    BadMint,
    #[msg("Wrong vault")]
    BadVault,
    #[msg("A duel is already waiting at this table")]
    TableBusy,
    #[msg("This duel is not the one waiting at the table")]
    NotWaiting,
    #[msg("You cannot duel yourself")]
    SelfDuel,
    #[msg("Duel is not in the right phase")]
    BadStatus,
    #[msg("Not authorized")]
    Unauthorized,
    #[msg("Session key expired")]
    SessionExpired,
    #[msg("Not a player of this duel")]
    NotAPlayer,
    #[msg("Draft is over")]
    DraftOver,
    #[msg("Draft is not over yet")]
    DraftNotOver,
    #[msg("Empty commitment")]
    BadCommitment,
    #[msg("Both baskets must be committed")]
    NotCommitted,
    #[msg("Basket already revealed")]
    AlreadyRevealed,
    #[msg("Reveal does not match the commitment")]
    BadReveal,
    #[msg("Invalid basket: 3-5 assets, 5% steps, 100% total")]
    BadBasket,
    #[msg("Both baskets must be revealed, or the reveal window must be over")]
    NotRevealed,
    #[msg("Unexpected price feed account")]
    WrongFeed,
    #[msg("Oracle price must be positive")]
    BadPrice,
    #[msg("Oracle price is stale")]
    StalePrice,
    #[msg("Unknown mutation")]
    BadMutation,
    #[msg("Too early for this mutation")]
    TooEarly,
    #[msg("Mutation already requested")]
    AlreadyRequested,
    #[msg("No rebalance left")]
    NoRebalanceLeft,
    #[msg("A frozen asset cannot be rebalanced")]
    FrozenAsset,
    #[msg("Not a valid token account")]
    BadTokenAccount,
    #[msg("Not enough test USDC")]
    InsufficientFunds,
    #[msg("Only the winner of a settled duel can mint its trophy")]
    NotTheWinner,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn live() -> Duel {
        Duel {
            id: 0,
            tier: 1,
            stake: 5_000_000,
            players: [Pubkey::new_unique(), Pubkey::new_unique()],
            status: STATUS_LIVE,
            created_ts: 0,
            draft_deadline: 0,
            commits: [[1; 32]; 2],
            session: [Pubkey::new_unique(), Pubkey::new_unique()],
            session_until: [10_000; 2],
            revealed: [true; 2],
            reveal_deadline: 0,
            weights: [[50, 30, 20, 0, 0, 0], [0, 0, 50, 30, 20, 0]],
            start_weights: [[50, 30, 20, 0, 0, 0], [0, 0, 50, 30, 20, 0]],
            start_ts: 1000,
            last_tick_ts: 1000,
            end_ts: 0,
            settled_ts: 0,
            start_price: [100; ASSETS],
            last_price: [100; ASSETS],
            score: [0; 2],
            mult: [1; ASSETS],
            frozen_asset: NONE,
            frozen_until: 0,
            mutations: Default::default(),
            mutations_applied: 0,
            rebalances_left: [2; 2],
            ticks: 0,
            winner: NO_WINNER,
            forfeit: false,
            task_id: 0,
            bump: 0,
        }
    }

    const PCT: i64 = 10_000_000;

    #[test]
    fn baskets() {
        assert!(validate_basket(&[50, 30, 20, 0, 0, 0]).is_ok());
        assert!(validate_basket(&[20, 20, 20, 20, 20, 0]).is_ok());
        assert!(validate_basket(&[50, 50, 0, 0, 0, 0]).is_err()); // 2 legs
        assert!(validate_basket(&[20, 20, 20, 20, 10, 10]).is_err()); // 6 legs
        assert!(validate_basket(&[52, 28, 20, 0, 0, 0]).is_err()); // not 5 % steps
        assert!(validate_basket(&[50, 30, 25, 0, 0, 0]).is_err()); // 105 %
    }

    #[test]
    fn score_follows_weighted_moves() {
        let mut d = live();
        // SOL +10 %, BONK -10 %
        d.advance(&[110, 100, 90, 100, 100, 100], 1001);
        assert_eq!(d.score[0], 5 * PCT - 2 * PCT); // 50 % x 10 - 20 % x 10
        assert_eq!(d.score[1], -5 * PCT); // 50 % x -10
        assert_eq!(d.ticks, 1);
    }

    #[test]
    fn path_dependence_and_rebalance() {
        let mut d = live();
        d.advance(&[110, 100, 100, 100, 100, 100], 1001); // +5 %
        d.rebalance(0, [10, 45, 45, 0, 0, 0], 1001).unwrap();
        d.advance(&[121, 100, 100, 100, 100, 100], 1002); // SOL +10 % again, only 10 % weight now
        assert_eq!(d.score[0], 5 * PCT + PCT);
        assert_eq!(d.rebalances_left[0], 1);
        // assets must stay the same
        assert!(d.rebalance(0, [10, 45, 0, 45, 0, 0], 1002).is_err());
        d.rebalance(0, [20, 40, 40, 0, 0, 0], 1002).unwrap();
        assert!(d.rebalance(0, [30, 35, 35, 0, 0, 0], 1003).is_err()); // none left
    }

    #[test]
    fn double_and_freeze() {
        let mut d = live();
        d.mult[0] = 2;
        d.advance(&[110, 100, 100, 100, 100, 100], 1001);
        assert_eq!(d.score[0], 10 * PCT);
        d.frozen_asset = 0;
        d.frozen_until = 1031;
        d.advance(&[150, 100, 100, 100, 100, 100], 1010);
        assert_eq!(d.score[0], 10 * PCT); // frozen: no change
        assert_eq!(d.last_price[0], 150); // but reference follows the market
        assert!(d.rebalance(0, [40, 40, 20, 0, 0, 0], 1010).is_err()); // frozen SOL weight locked
        d.advance(&[165, 100, 100, 100, 100, 100], 1031); // freeze over
        assert_eq!(d.frozen_asset, NONE);
        d.advance(&[181, 100, 100, 100, 100, 100], 1032);
        assert!(d.score[0] > 10 * PCT);
    }

    #[test]
    fn swap_exchanges_legs() {
        let mut d = live();
        // r[0] = 2 -> SWAP; player 0 legs [0,1,2], player 1 legs [2,3,4]
        let mut r = [0u8; 32];
        r[0] = 2;
        r[1] = 0; // SOL from player 0
        r[2] = 1; // WIF from player 1
        let m = d.draw_mutation(&r, 1060);
        assert_eq!((m.kind, m.a, m.b, m.at), (KIND_SWAP, 0, 3, 60));
        assert_eq!(d.weights[0], [0, 30, 20, 50, 0, 0]);
        assert_eq!(d.weights[1], [30, 0, 50, 0, 20, 0]);
        assert_eq!(d.weights[0].iter().map(|x| *x as u32).sum::<u32>(), 100);
    }

    #[test]
    fn freeze_and_double_draws() {
        let mut d = live();
        let mut r = [0u8; 32];
        r[0] = 1;
        r[1] = 4;
        let m = d.draw_mutation(&r, 1150);
        assert_eq!(m.kind, KIND_FREEZE);
        assert_eq!(d.frozen_until, 1180);
        assert!(d.weights[0][m.a as usize] > 0 || d.weights[1][m.a as usize] > 0);
        r[0] = 0;
        let m = d.draw_mutation(&r, 1240);
        assert_eq!(m.kind, KIND_DOUBLE);
        assert_eq!(d.mult[m.a as usize], 2);
    }

    #[test]
    fn each_kind_lands_once() {
        let mut d = live();
        let mut kinds = vec![];
        for (i, t) in [1060, 1150, 1240].iter().enumerate() {
            let r = [0u8; 32]; // same randomness every time
            let m = d.draw_mutation(&r, *t);
            d.mutations[i] = m;
            kinds.push(m.kind);
        }
        kinds.sort();
        assert_eq!(kinds, vec![KIND_DOUBLE, KIND_FREEZE, KIND_SWAP]);
    }

    #[test]
    fn frozen_lock_ends_with_the_freeze() {
        let mut d = live();
        d.frozen_asset = 0;
        d.frozen_until = 1031;
        assert!(d.rebalance(0, [40, 40, 20, 0, 0, 0], 1030).is_err());
        d.rebalance(0, [40, 40, 20, 0, 0, 0], 1031).unwrap(); // no tick since, still unlocked
    }

    #[test]
    fn ends_on_time_with_winner() {
        let mut d = live();
        d.advance(&[110, 100, 100, 100, 100, 100], 1299);
        assert_eq!(d.status, STATUS_LIVE);
        d.advance(&[110, 100, 100, 100, 100, 100], 1300);
        assert_eq!(d.status, STATUS_FINISHED);
        assert_eq!(d.winner, 0);
        d.advance(&[200, 100, 100, 100, 100, 100], 1301); // no-op once finished
        assert_eq!(d.score[0], 5 * PCT);
    }

    #[test]
    fn sessions() {
        let d = live();
        assert_eq!(d.session_slot(&d.session[1], 100).unwrap(), 1);
        assert_eq!(d.session_slot(&d.players[0], 100).unwrap(), 0);
        assert!(d.session_slot(&d.session[1], 20_000).is_err());
        assert!(d.session_slot(&Pubkey::new_unique(), 100).is_err());
    }

    #[test]
    fn profile_points_and_history() {
        let mut p = Profile {
            authority: Pubkey::default(),
            name: [0; NAME_LEN],
            points: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            streak: 0,
            best_streak: 0,
            games: 0,
            sum_score: 0,
            best_score: 0,
            mutations_survived: 0,
            mutations_seen: 0,
            created_ts: 0,
            bump: 0,
            history_len: 0,
            history_head: 0,
            history: [MatchRecord::default(); HISTORY],
        };
        let rec = |result, s| MatchRecord { result, my_score: s, mutations: 3, ..Default::default() };
        p.record(rec(RESULT_LOSS, -PCT));
        assert_eq!(p.points, 0);
        p.record(rec(RESULT_WIN, 2 * PCT));
        p.record(rec(RESULT_WIN, 3 * PCT));
        assert_eq!((p.points, p.streak, p.best_streak, p.wins, p.losses), (40, 2, 2, 2, 1));
        p.record(rec(RESULT_LOSS, 0));
        assert_eq!((p.points, p.streak), (24, -1));
        assert_eq!(p.best_score, 3 * PCT);
        for _ in 0..10 {
            p.record(rec(RESULT_DRAW, 0));
        }
        assert_eq!(p.history_len as usize, HISTORY);
        assert_eq!(p.games, 14);
        assert_eq!(p.mutations_survived, 6);
    }
}
