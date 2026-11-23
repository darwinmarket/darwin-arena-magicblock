// Darwin Arena on MagicBlock.
//
// 1v1 crypto basket duels. Each player drafts a basket of Solana assets, the
// basket that performs best over five minutes of live prices takes the pot.
//
// The program is split along one line: money and reputation stay on Solana,
// the duel itself runs on an Ephemeral Rollup.
//
//   Solana (base)      test-USDC mint + faucet, stake escrow, tables
//                      (matchmaking), basket commitments, settlement, player
//                      profiles. Nothing holding USDC is ever delegated.
//
//   Ephemeral Rollup   the live `Duel`: basket reveal, a crank-scheduled tick
//                      reading MagicBlock's Pyth Lazer feeds every second,
//                      rebalances signed by a session key, and mutations drawn
//                      by MagicBlock's VRF inside the rollup. When the clock
//                      runs out the duel is committed and undelegated, and
//                      `settle` pays out on Solana.
use anchor_lang::prelude::*;
use solana_sha256_hasher::hashv;
use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};

use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral, vrf, vrf_callback};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use anchor_lang::solana_program::program::invoke;
use magicblock_magic_program_api::{args::ScheduleTaskArgs, instruction::MagicBlockInstruction};
use ephemeral_rollups_sdk::ephem::MagicIntentBundleBuilder;
use ephemeral_rollups_sdk::vrf::instructions::{
    create_request_scoped_randomness_ix, RequestRandomnessParams,
};
use ephemeral_rollups_sdk::vrf::types::SerializableAccountMeta;
use session_keys::SessionTokenV2;

pub mod game;
pub mod token;
use game::*;
use token::*;

declare_id!("GnQC4MjzjS8AZvtj5VR64ovJupSm93yCiYz1ZkLyzFNp");

pub const CONFIG_SEED: &[u8] = b"config";
pub const USDC_SEED: &[u8] = b"usdc-mint";
pub const FAUCET_SEED: &[u8] = b"faucet";
pub const PROFILE_SEED: &[u8] = b"profile";
pub const TABLE_SEED: &[u8] = b"table";
pub const DUEL_SEED: &[u8] = b"duel";
pub const TROPHY_SEED: &[u8] = b"trophy";

pub const DECIMALS: u8 = 6;
pub const ONE_USDC: u64 = 1_000_000;
/// Stake per table, in whole USDC: Rookie Pit, The Arena, High Rollers.
pub const STAKES: [u64; 3] = [1, 5, 20];
pub const FAUCET_AMOUNT: u64 = 100 * ONE_USDC;
pub const FAUCET_COOLDOWN: i64 = 10 * 60;
pub const RAKE_BPS: u64 = 500;

pub const DRAFT_SECONDS: i64 = 60;
/// Grace after the draft deadline before a half-committed duel can be cancelled.
pub const DRAFT_GRACE: i64 = 30;
/// Time both players have, once the duel is on the rollup, to reveal.
pub const REVEAL_SECONDS: i64 = 45;
pub const DUEL_SECONDS: i64 = 300;
pub const TICK_MILLIS: i64 = 1_000;

/// MagicBlock's real-time pricing oracle (Pyth Lazer, pushed into the ERs).
pub const PRICE_ORACLE_PROGRAM_ID: Pubkey = pubkey!("PriCems5tHihc6UDXDjzjeawomAwBduWMGAi8ZUjppd");
/// Feed PDAs `["price_feed", "pyth-lazer", id]`, in asset order
/// SOL (6), JUP (92), BONK (9), WIF (10), JTO (91), PYTH (3).
pub const FEEDS: [Pubkey; ASSETS] = [
    pubkey!("ENYwebBThHzmzwPLAQvCucUTsjyfBSZdD9ViXksS4jPu"),
    pubkey!("G2kZYbT2e2qig54RH8FY6G5ihq1QsxTZsNVuAZMV7AW2"),
    pubkey!("4WWpu2fva3uZjmZS95fezYFfoydmYi3PU7ApnqG9cYss"),
    pubkey!("Cy6KSY9DCcJ5HiKL3H4ir6XiSC1PczCCJj7LEe9Y8A7x"),
    pubkey!("G27CrnbG37qfRH15eaXbPtNQ48VagMttoJQBarpRK5nc"),
    pubkey!("8s2NFDX4KSoFPndkajFmWAjGhG7hhH1qnkLu4EMZqzHF"),
];
/// A price older than this is not used: the asset is held still for that tick.
pub const MAX_PRICE_AGE: i64 = 30;

pub const MAGIC_PROGRAM_ID: Pubkey = pubkey!("Magic11111111111111111111111111111111111111");

#[ephemeral]
#[program]
pub mod darwin_arena {
    use super::*;

    // ================================================================ base layer

    /// Config PDA. The test-USDC mint (mint authority = config) and the vault
    /// (a token account owned by config, escrowing every stake) are created by
    /// the client in the same transaction; this checks and records them.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config_key = ctx.accounts.config.key();
        check_mint(&ctx.accounts.usdc_mint, &config_key)?;
        token_balance(&ctx.accounts.vault, &ctx.accounts.usdc_mint.key(), Some(&config_key))?;
        let c = &mut ctx.accounts.config;
        c.admin = ctx.accounts.admin.key();
        c.usdc_mint = ctx.accounts.usdc_mint.key();
        c.vault = ctx.accounts.vault.key();
        c.duel_count = 0;
        c.rake_collected = 0;
        c.bump = ctx.bumps.config;
        Ok(())
    }

    /// One table per stake tier. Holds at most one duel waiting for a rival.
    pub fn init_table(ctx: Context<InitTable>, tier: u8) -> Result<()> {
        require!((tier as usize) < STAKES.len(), ArenaError::BadTier);
        let t = &mut ctx.accounts.table;
        t.tier = tier;
        t.waiting = Pubkey::default();
        t.waiting_since = 0;
        t.duels = 0;
        t.bump = ctx.bumps.table;
        Ok(())
    }

    /// Devnet faucet: 100 test USDC, once every 10 minutes per wallet.
    pub fn faucet(ctx: Context<Faucet>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let claim = &mut ctx.accounts.claim;
        require!(
            claim.last_ts == 0 || now - claim.last_ts >= FAUCET_COOLDOWN,
            ArenaError::FaucetCooldown
        );
        claim.owner = ctx.accounts.user.key();
        claim.last_ts = now;
        token_balance(&ctx.accounts.user_usdc, &ctx.accounts.config.usdc_mint, None)?;
        let seeds: &[&[u8]] = &[CONFIG_SEED, &[ctx.accounts.config.bump]];
        token_mint_to(
            &ctx.accounts.token_program,
            &ctx.accounts.usdc_mint,
            &ctx.accounts.user_usdc,
            &ctx.accounts.config.to_account_info(),
            FAUCET_AMOUNT,
            seeds,
        )
    }

    /// Create the player's on-chain profile: name, rank points, record, history.
    pub fn init_profile(ctx: Context<InitProfile>, name: String) -> Result<()> {
        let p = &mut ctx.accounts.profile;
        p.authority = ctx.accounts.user.key();
        p.name = name_bytes(&name);
        p.bump = ctx.bumps.profile;
        p.created_ts = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Sit at an empty table: escrow the stake and open a duel waiting for a rival.
    pub fn open_duel(ctx: Context<OpenDuel>, tier: u8) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let table = &mut ctx.accounts.table;
        require!(table.waiting == Pubkey::default(), ArenaError::TableBusy);
        let stake = STAKES[tier as usize] * ONE_USDC;
        stake_in(&ctx.accounts.token_program, &ctx.accounts.player_usdc, &ctx.accounts.vault, &ctx.accounts.player, &ctx.accounts.config.usdc_mint, stake)?;

        let config = &mut ctx.accounts.config;
        let duel_key = ctx.accounts.duel.key();
        let d = &mut ctx.accounts.duel;
        d.id = config.duel_count;
        d.tier = tier;
        d.stake = stake;
        d.players[0] = ctx.accounts.player.key();
        d.status = STATUS_OPEN;
        d.created_ts = now;
        d.winner = NO_WINNER;
        d.frozen_asset = NONE;
        d.mult = [1; ASSETS];
        d.rebalances_left = [MAX_REBALANCES; 2];
        d.bump = ctx.bumps.duel;
        config.duel_count += 1;
        table.waiting = duel_key;
        table.waiting_since = now;
        Ok(())
    }

    /// Take the seat across: escrow the stake, the 60 s draft starts now.
    pub fn join_duel(ctx: Context<JoinDuel>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let d = &mut ctx.accounts.duel;
        require!(d.status == STATUS_OPEN, ArenaError::BadStatus);
        require_keys_neq!(d.players[0], ctx.accounts.player.key(), ArenaError::SelfDuel);
        stake_in(&ctx.accounts.token_program, &ctx.accounts.player_usdc, &ctx.accounts.vault, &ctx.accounts.player, &ctx.accounts.config.usdc_mint, d.stake)?;
        d.players[1] = ctx.accounts.player.key();
        d.status = STATUS_DRAFTING;
        d.draft_deadline = now + DRAFT_SECONDS;
        let table = &mut ctx.accounts.table;
        table.waiting = Pubkey::default();
        table.duels += 1;
        Ok(())
    }

    /// Get stakes back from a duel that never started: an empty table the
    /// opener walks away from (opener only), or a draft that ran out without
    /// both commitments (anyone, after the grace period). Each seated player is
    /// refunded to their own token account.
    pub fn cancel_duel(ctx: Context<CancelDuel>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let d = &mut ctx.accounts.duel;
        let mint = ctx.accounts.config.usdc_mint;
        token_balance(&ctx.accounts.usdc0, &mint, Some(&d.players[0]))?;
        match d.status {
            STATUS_OPEN => {
                require_keys_eq!(ctx.accounts.caller.key(), d.players[0], ArenaError::Unauthorized);
                require_keys_eq!(ctx.accounts.table.waiting, d.key(), ArenaError::NotWaiting);
                ctx.accounts.table.waiting = Pubkey::default();
            }
            STATUS_DRAFTING => {
                require!(now > d.draft_deadline + DRAFT_GRACE, ArenaError::DraftNotOver);
                let usdc1 = ctx.accounts.usdc1.as_ref().ok_or(ArenaError::Unauthorized)?;
                token_balance(usdc1, &mint, Some(&d.players[1]))?;
            }
            _ => return err!(ArenaError::BadStatus),
        }
        let seeds: &[&[u8]] = &[CONFIG_SEED, &[ctx.accounts.config.bump]];
        let vault_auth = ctx.accounts.config.to_account_info();
        token_transfer(&ctx.accounts.token_program, &ctx.accounts.vault, &ctx.accounts.usdc0, &vault_auth, d.stake, Some(seeds))?;
        if d.status == STATUS_DRAFTING {
            let usdc1 = ctx.accounts.usdc1.as_ref().unwrap();
            token_transfer(&ctx.accounts.token_program, &ctx.accounts.vault, usdc1, &vault_auth, d.stake, Some(seeds))?;
        }
        d.status = STATUS_CANCELLED;
        Ok(())
    }

    /// Lock a basket during the draft: only `sha256(duel || player || weights ||
    /// salt)` goes on chain. Signed by the wallet, or by a MagicBlock session key
    /// whose `SessionTokenV2` names the player as authority. The signer becomes
    /// the key allowed to act for this player inside the rollup.
    pub fn commit_basket(ctx: Context<CommitBasket>, commitment: [u8; 32]) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let d = &mut ctx.accounts.duel;
        require!(d.status == STATUS_DRAFTING, ArenaError::BadStatus);
        require!(now <= d.draft_deadline + DRAFT_GRACE, ArenaError::DraftOver);
        let player = ctx.accounts.player.key();
        let slot = d.slot_of(&player)?;
        let signer = ctx.accounts.signer.key();
        let until = if signer == player {
            d.created_ts + 3600 * 24
        } else {
            let t = ctx.accounts.session_token.as_ref().ok_or(ArenaError::Unauthorized)?;
            require_keys_eq!(t.authority, player, ArenaError::Unauthorized);
            require_keys_eq!(t.session_signer, signer, ArenaError::Unauthorized);
            require_keys_eq!(t.target_program, crate::ID, ArenaError::Unauthorized);
            require!(t.valid_until > now, ArenaError::SessionExpired);
            t.valid_until
        };
        require!(commitment != [0u8; 32], ArenaError::BadCommitment);
        d.commits[slot] = commitment;
        d.session[slot] = signer;
        d.session_until[slot] = until;
        Ok(())
    }

    /// Both baskets are committed: hand the duel to the Ephemeral Rollup.
    /// Permissionless; the second committer's client appends it, the crank does
    /// it otherwise.
    pub fn delegate_duel(ctx: Context<DelegateDuel>, id: u64) -> Result<()> {
        {
            let data = ctx.accounts.duel.try_borrow_data()?;
            let d = Duel::try_deserialize(&mut &data[..])?;
            require!(d.status == STATUS_DRAFTING, ArenaError::BadStatus);
            require!(d.commits[0] != [0u8; 32] && d.commits[1] != [0u8; 32], ArenaError::NotCommitted);
        }
        ctx.accounts.delegate_duel(
            &ctx.accounts.payer,
            &[DUEL_SEED, &id.to_le_bytes()],
            DelegateConfig {
                validator: ctx.remaining_accounts.first().map(|v| v.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    /// The duel is back on Solana and finished: pay the winner (pot minus 5 %
    /// rake) or refund a draw, and write the result into both profiles.
    pub fn settle(ctx: Context<Settle>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let d = &mut ctx.accounts.duel;
        require!(d.status == STATUS_FINISHED, ArenaError::BadStatus);
        let mint = ctx.accounts.config.usdc_mint;
        token_balance(&ctx.accounts.usdc0, &mint, Some(&d.players[0]))?;
        token_balance(&ctx.accounts.usdc1, &mint, Some(&d.players[1]))?;
        require_keys_eq!(ctx.accounts.profile0.authority, d.players[0], ArenaError::Unauthorized);
        require_keys_eq!(ctx.accounts.profile1.authority, d.players[1], ArenaError::Unauthorized);

        let stake = d.stake;
        let (pot, rake) = pot_and_rake(stake);
        let seeds: &[&[u8]] = &[CONFIG_SEED, &[ctx.accounts.config.bump]];
        let vault_auth = ctx.accounts.config.to_account_info();
        let tp = &ctx.accounts.token_program;
        let vault = &ctx.accounts.vault;
        match d.winner {
            0 => token_transfer(tp, vault, &ctx.accounts.usdc0, &vault_auth, pot, Some(seeds))?,
            1 => token_transfer(tp, vault, &ctx.accounts.usdc1, &vault_auth, pot, Some(seeds))?,
            _ => {
                token_transfer(tp, vault, &ctx.accounts.usdc0, &vault_auth, stake, Some(seeds))?;
                token_transfer(tp, vault, &ctx.accounts.usdc1, &vault_auth, stake, Some(seeds))?;
            }
        }
        if d.winner < 2 {
            ctx.accounts.config.rake_collected += rake;
        }
        d.status = STATUS_SETTLED;
        d.settled_ts = now;

        let duel_key = d.key();
        let names = [ctx.accounts.profile0.name, ctx.accounts.profile1.name];
        for slot in 0..2 {
            let other = 1 - slot;
            let p = if slot == 0 { &mut ctx.accounts.profile0 } else { &mut ctx.accounts.profile1 };
            let result = match d.winner {
                w if w == slot as u8 => RESULT_WIN,
                w if w == other as u8 => RESULT_LOSS,
                _ => RESULT_DRAW,
            };
            p.record(MatchRecord {
                duel: duel_key,
                opponent: d.players[other],
                opponent_name: names[other],
                my_score: d.score[slot],
                opp_score: d.score[other],
                stake,
                ts: now,
                result,
                weights: d.start_weights[slot],
                mutations: d.mutations_applied,
                rebalances: MAX_REBALANCES - d.rebalances_left[slot],
            });
        }
        msg!("settled duel {} winner {}", d.id, d.winner);
        Ok(())
    }

    /// "Mint this basket": the winner of a settled duel records the winning
    /// basket as an on-chain trophy, one per duel, owned by the winner.
    pub fn mint_trophy(ctx: Context<MintTrophy>) -> Result<()> {
        let d = &ctx.accounts.duel;
        require!(d.status == STATUS_SETTLED, ArenaError::BadStatus);
        require!(d.winner < 2, ArenaError::NotTheWinner);
        let w = d.winner as usize;
        require_keys_eq!(d.players[w], ctx.accounts.winner.key(), ArenaError::NotTheWinner);
        let t = &mut ctx.accounts.trophy;
        t.owner = d.players[w];
        t.duel = d.key();
        t.duel_id = d.id;
        t.opponent = d.players[1 - w];
        t.weights = d.start_weights[w];
        t.score = d.score[w];
        t.opp_score = d.score[1 - w];
        t.stake = d.stake;
        t.mutations = d.mutations;
        t.minted_ts = Clock::get()?.unix_timestamp;
        t.bump = ctx.bumps.trophy;
        Ok(())
    }

    // ========================================================= ephemeral rollup

    /// Reveal a committed basket. Runs on the rollup, signed by the session key
    /// recorded at commit time, so the wallet is not asked again.
    pub fn reveal_basket(ctx: Context<ActOnDuel>, weights: [u8; ASSETS], salt: [u8; 32]) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let duel_key = ctx.accounts.duel.key();
        let d = &mut ctx.accounts.duel;
        require!(d.status == STATUS_DRAFTING, ArenaError::BadStatus);
        let slot = d.session_slot(&ctx.accounts.signer.key(), now)?;
        require!(!d.revealed[slot], ArenaError::AlreadyRevealed);
        let player = d.players[slot];
        require!(commitment_of(&duel_key, &player, &weights, &salt) == d.commits[slot], ArenaError::BadReveal);
        validate_basket(&weights)?;
        d.weights[slot] = weights;
        d.start_weights[slot] = weights;
        d.revealed[slot] = true;
        if d.reveal_deadline == 0 {
            d.reveal_deadline = now + REVEAL_SECONDS;
        }
        Ok(())
    }

    /// Start the clock once both baskets are revealed (or the reveal window has
    /// passed: a basket that was never revealed forfeits). Reads the six feeds as
    /// the reference prices and schedules the per-second `tick` crank.
    pub fn start_duel(ctx: Context<StartDuel>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let feeds = feed_infos(&ctx.accounts.feeds())?;
        let duel_info = ctx.accounts.duel.to_account_info();
        let d = &mut ctx.accounts.duel;
        require!(d.status == STATUS_DRAFTING, ArenaError::BadStatus);
        // Nobody revealed yet: the window runs from the end of the draft.
        let deadline = if d.reveal_deadline > 0 {
            d.reveal_deadline
        } else {
            d.draft_deadline + DRAFT_GRACE + REVEAL_SECONDS
        };
        let both = d.revealed[0] && d.revealed[1];
        if !both {
            require!(now > deadline, ArenaError::NotRevealed);
            d.status = STATUS_FINISHED;
            d.forfeit = true;
            d.winner = match (d.revealed[0], d.revealed[1]) {
                (true, false) => 0,
                (false, true) => 1,
                _ => DRAW,
            };
            d.end_ts = now;
            return Ok(());
        }
        for (i, f) in feeds.iter().enumerate() {
            let (price, ts) = read_feed(f, i)?;
            require!(now - ts <= MAX_PRICE_AGE, ArenaError::StalePrice);
            d.start_price[i] = price;
            d.last_price[i] = price;
        }
        d.status = STATUS_LIVE;
        d.start_ts = now;
        d.last_tick_ts = now;

        // The tick runs itself: one task, every second, for the whole duel.
        let tick_ix = Instruction {
            program_id: crate::ID,
            accounts: std::iter::once(AccountMeta::new(duel_info.key(), false))
                .chain(FEEDS.iter().map(|k| AccountMeta::new_readonly(*k, false)))
                .collect(),
            data: anchor_lang::InstructionData::data(&crate::instruction::Tick {}),
        };
        let task_id = task_id_for(&duel_info.key());
        d.task_id = task_id;
        let payer_info = ctx.accounts.payer.to_account_info();
        let args = ScheduleTaskArgs {
            task_id,
            execution_interval_millis: TICK_MILLIS,
            iterations: DUEL_SECONDS + 30,
            instructions: vec![tick_ix],
        };
        let data = bincode::serialize(&MagicBlockInstruction::ScheduleTask(args))
            .map_err(|_| error!(ArenaError::BadMutation))?;
        let mut metas = vec![AccountMeta::new(payer_info.key(), true), AccountMeta::new(duel_info.key(), false)];
        metas.extend(FEEDS.iter().map(|k| AccountMeta::new_readonly(*k, false)));
        let mut infos = vec![payer_info, duel_info.clone()];
        infos.extend(feeds.iter().cloned());
        invoke(&Instruction { program_id: MAGIC_PROGRAM_ID, accounts: metas, data }, &infos)?;
        Ok(())
    }

    /// One step of the duel. Scheduled by `start_duel` (and callable by anyone:
    /// it only moves the duel forward along the oracle). Accrues both scores
    /// along every asset's move since the last tick, releases an expired freeze,
    /// and ends the duel when the clock runs out.
    pub fn tick(ctx: Context<Tick>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let feeds = feed_infos(&ctx.accounts.feeds())?;
        let d = &mut ctx.accounts.duel;
        if d.status != STATUS_LIVE {
            return Ok(());
        }
        let mut prices = [0u64; ASSETS];
        for (i, f) in feeds.iter().enumerate() {
            prices[i] = match read_feed(f, i) {
                Ok((p, ts)) if now - ts <= MAX_PRICE_AGE => p,
                _ => d.last_price[i],
            };
        }
        d.advance(&prices, now);
        Ok(())
    }

    /// Ask MagicBlock's VRF for mutation `index` once its second has come.
    /// Permissionless: whoever is watching the duel (either client, the crank)
    /// may pull the trigger; nobody can choose the outcome.
    pub fn request_mutation(ctx: Context<RequestMutation>, index: u8) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let d = &mut ctx.accounts.duel;
        require!(d.status == STATUS_LIVE, ArenaError::BadStatus);
        let i = index as usize;
        require!(i < MUTATIONS, ArenaError::BadMutation);
        require!(now - d.start_ts >= MUTATION_AT[i], ArenaError::TooEarly);
        require!(d.mutations[i].state == MUT_NONE, ArenaError::AlreadyRequested);
        d.mutations[i].state = MUT_REQUESTED;
        let duel_key = d.key();
        let ix = create_request_scoped_randomness_ix(RequestRandomnessParams {
            payer: ctx.accounts.payer.key(),
            oracle_queue: ctx.accounts.oracle_queue.key(),
            callback_program_id: crate::ID,
            callback_discriminator: crate::instruction::ApplyMutation::DISCRIMINATOR.to_vec(),
            caller_seed: hashv(&[duel_key.as_ref(), &[index], &d.start_ts.to_le_bytes()]).to_bytes(),
            accounts_metas: Some(vec![SerializableAccountMeta {
                pubkey: duel_key,
                is_signer: false,
                is_writable: true,
            }]),
            callback_args: Some(vec![index]),
            ..Default::default()
        });
        ctx.accounts.invoke_signed_vrf(&ctx.accounts.payer.to_account_info(), &ix)?;
        Ok(())
    }

    /// VRF callback: the oracle's randomness picks the mutation's kind and its
    /// asset(s). Only MagicBlock's VRF program can sign this.
    pub fn apply_mutation(ctx: Context<ApplyMutationCtx>, randomness: [u8; 32], index: u8) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let d = &mut ctx.accounts.duel;
        let i = index as usize;
        require!(i < MUTATIONS, ArenaError::BadMutation);
        if d.status != STATUS_LIVE || d.mutations[i].state != MUT_REQUESTED {
            return Ok(());
        }
        let m = d.draw_mutation(&randomness, now);
        d.mutations[i] = m;
        d.mutations_applied += 1;
        msg!("mutation {} kind {} a {} b {}", index, m.kind, m.a, m.b);
        Ok(())
    }

    /// Shift weights mid-duel. Same assets, 5 % steps, 100 % total, a frozen asset
    /// untouched; twice per duel. Session-key signed, on the rollup, no fee.
    pub fn rebalance(ctx: Context<ActOnDuel>, weights: [u8; ASSETS]) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let d = &mut ctx.accounts.duel;
        require!(d.status == STATUS_LIVE, ArenaError::BadStatus);
        let slot = d.session_slot(&ctx.accounts.signer.key(), now)?;
        d.rebalance(slot, weights, now)?;
        Ok(())
    }

    /// The duel is over: commit it and hand it back to Solana for `settle`.
    pub fn finish_duel(ctx: Context<FinishDuel>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        // A duel whose crank stalled is still allowed to end on time.
        if ctx.accounts.duel.status == STATUS_LIVE && now - ctx.accounts.duel.start_ts >= DUEL_SECONDS + 15 {
            let last = ctx.accounts.duel.last_price;
            ctx.accounts.duel.advance(&last, now);
        }
        require!(ctx.accounts.duel.status == STATUS_FINISHED, ArenaError::BadStatus);
        ctx.accounts.duel.exit(&crate::ID)?;
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.duel.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }
}

// ==================================================================== helpers

fn name_bytes(name: &str) -> [u8; NAME_LEN] {
    let mut out = [0u8; NAME_LEN];
    let b = name.as_bytes();
    let n = b.len().min(NAME_LEN);
    out[..n].copy_from_slice(&b[..n]);
    out
}

pub fn commitment_of(duel: &Pubkey, player: &Pubkey, weights: &[u8; ASSETS], salt: &[u8; 32]) -> [u8; 32] {
    hashv(&[duel.as_ref(), player.as_ref(), weights, salt]).to_bytes()
}

pub fn pot_and_rake(stake: u64) -> (u64, u64) {
    let total = stake * 2;
    let rake = total * RAKE_BPS / 10_000;
    (total - rake, rake)
}

/// Unique per duel: task ids are shared by every program on a 1.1.1 validator.
fn task_id_for(duel: &Pubkey) -> i64 {
    let h = hashv(&[b"darwin-arena-tick", duel.as_ref()]).to_bytes();
    (i64::from_le_bytes(h[..8].try_into().unwrap()) & i64::MAX).max(1)
}

fn stake_in<'info>(
    token_program: &UncheckedAccount<'info>,
    from: &UncheckedAccount<'info>,
    vault: &UncheckedAccount<'info>,
    owner: &Signer<'info>,
    mint: &Pubkey,
    amount: u64,
) -> Result<()> {
    let balance = token_balance(from, mint, Some(&owner.key()))?;
    require!(balance >= amount, ArenaError::InsufficientFunds);
    token_transfer(token_program, from, vault, &owner.to_account_info(), amount, None)
}

fn feed_infos<'a, 'info>(feeds: &[&'a UncheckedAccount<'info>; ASSETS]) -> Result<[AccountInfo<'info>; ASSETS]> {
    for (i, f) in feeds.iter().enumerate() {
        require_keys_eq!(f.key(), FEEDS[i], ArenaError::WrongFeed);
    }
    Ok([
        feeds[0].to_account_info(),
        feeds[1].to_account_info(),
        feeds[2].to_account_info(),
        feeds[3].to_account_info(),
        feeds[4].to_account_info(),
        feeds[5].to_account_info(),
    ])
}

/// Read a MagicBlock Pyth Lazer feed. Same field layout as Pyth's
/// `PriceUpdateV2` (price i64 at 73, publish_time i64 at 93), owned by the
/// pricing oracle program. Address pinned, owner checked, price must be > 0.
fn read_feed(f: &AccountInfo, i: usize) -> Result<(u64, i64)> {
    require_keys_eq!(*f.key, FEEDS[i], ArenaError::WrongFeed);
    require_keys_eq!(*f.owner, PRICE_ORACLE_PROGRAM_ID, ArenaError::WrongFeed);
    let data = f.try_borrow_data()?;
    require!(data.len() >= 101, ArenaError::WrongFeed);
    let price = i64::from_le_bytes(data[73..81].try_into().unwrap());
    let ts = i64::from_le_bytes(data[93..101].try_into().unwrap());
    require!(price > 0, ArenaError::BadPrice);
    Ok((price as u64, ts))
}

// =================================================================== accounts

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub usdc_mint: Pubkey,
    pub vault: Pubkey,
    pub duel_count: u64,
    pub rake_collected: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Table {
    pub tier: u8,
    /// The duel waiting for a rival at this table, or the default key.
    pub waiting: Pubkey,
    pub waiting_since: i64,
    pub duels: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct FaucetClaim {
    pub owner: Pubkey,
    pub last_ts: i64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, space = 8 + Config::INIT_SPACE, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,
    /// CHECK: SPL mint whose mint authority is `config`; checked in the handler.
    pub usdc_mint: UncheckedAccount<'info>,
    /// CHECK: token account of `usdc_mint` owned by `config`; checked in the handler.
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(tier: u8)]
pub struct InitTable<'info> {
    #[account(mut, address = config.admin @ ArenaError::Unauthorized)]
    pub admin: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(init, payer = admin, space = 8 + Table::INIT_SPACE, seeds = [TABLE_SEED, &[tier]], bump)]
    pub table: Account<'info, Table>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Faucet<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(init_if_needed, payer = user, space = 8 + FaucetClaim::INIT_SPACE, seeds = [FAUCET_SEED, user.key().as_ref()], bump)]
    pub claim: Account<'info, FaucetClaim>,
    /// CHECK: the config's mint.
    #[account(mut, address = config.usdc_mint @ ArenaError::BadMint)]
    pub usdc_mint: UncheckedAccount<'info>,
    /// CHECK: any token account of the test-USDC mint (checked in the handler).
    #[account(mut)]
    pub user_usdc: UncheckedAccount<'info>,
    /// CHECK: address-checked SPL Token program.
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitProfile<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(init, payer = user, space = 8 + Profile::INIT_SPACE, seeds = [PROFILE_SEED, user.key().as_ref()], bump)]
    pub profile: Box<Account<'info, Profile>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(tier: u8)]
pub struct OpenDuel<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    /// CHECK: the player must have a profile (results are written to it).
    #[account(seeds = [PROFILE_SEED, player.key().as_ref()], bump, owner = crate::ID)]
    pub profile: UncheckedAccount<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [TABLE_SEED, &[tier]], bump = table.bump)]
    pub table: Account<'info, Table>,
    #[account(
        init,
        payer = player,
        space = 8 + Duel::INIT_SPACE,
        seeds = [DUEL_SEED, &config.duel_count.to_le_bytes()],
        bump
    )]
    pub duel: Box<Account<'info, Duel>>,
    /// CHECK: player's test-USDC account, checked in `stake_in`.
    #[account(mut)]
    pub player_usdc: UncheckedAccount<'info>,
    /// CHECK: the config's vault.
    #[account(mut, address = config.vault @ ArenaError::BadVault)]
    pub vault: UncheckedAccount<'info>,
    /// CHECK: address-checked SPL Token program.
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinDuel<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    /// CHECK: the player must have a profile.
    #[account(seeds = [PROFILE_SEED, player.key().as_ref()], bump, owner = crate::ID)]
    pub profile: UncheckedAccount<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [TABLE_SEED, &[duel.tier]], bump = table.bump, constraint = table.waiting == duel.key() @ ArenaError::NotWaiting)]
    pub table: Account<'info, Table>,
    #[account(mut, seeds = [DUEL_SEED, &duel.id.to_le_bytes()], bump = duel.bump)]
    pub duel: Box<Account<'info, Duel>>,
    /// CHECK: player's test-USDC account, checked in `stake_in`.
    #[account(mut)]
    pub player_usdc: UncheckedAccount<'info>,
    /// CHECK: the config's vault.
    #[account(mut, address = config.vault @ ArenaError::BadVault)]
    pub vault: UncheckedAccount<'info>,
    /// CHECK: address-checked SPL Token program.
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct CancelDuel<'info> {
    pub caller: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [TABLE_SEED, &[duel.tier]], bump = table.bump)]
    pub table: Account<'info, Table>,
    #[account(mut, seeds = [DUEL_SEED, &duel.id.to_le_bytes()], bump = duel.bump)]
    pub duel: Box<Account<'info, Duel>>,
    /// CHECK: player 0's test-USDC account, checked in the handler.
    #[account(mut)]
    pub usdc0: UncheckedAccount<'info>,
    /// CHECK: player 1's test-USDC account, when there is a player 1.
    #[account(mut)]
    pub usdc1: Option<UncheckedAccount<'info>>,
    /// CHECK: the config's vault.
    #[account(mut, address = config.vault @ ArenaError::BadVault)]
    pub vault: UncheckedAccount<'info>,
    /// CHECK: address-checked SPL Token program.
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct CommitBasket<'info> {
    /// The wallet, or a session key authorised by it.
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK: the player this commitment is for; must be seated in the duel.
    pub player: UncheckedAccount<'info>,
    #[account(mut, seeds = [DUEL_SEED, &duel.id.to_le_bytes()], bump = duel.bump)]
    pub duel: Box<Account<'info, Duel>>,
    /// MagicBlock session token (`session-keys` program), required unless the
    /// player signs directly.
    pub session_token: Option<Account<'info, SessionTokenV2>>,
}

#[delegate]
#[derive(Accounts)]
#[instruction(id: u64)]
pub struct DelegateDuel<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: the duel PDA, handed to the delegation program.
    #[account(mut, del, seeds = [DUEL_SEED, &id.to_le_bytes()], bump)]
    pub duel: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct MintTrophy<'info> {
    #[account(mut)]
    pub winner: Signer<'info>,
    #[account(seeds = [DUEL_SEED, &duel.id.to_le_bytes()], bump = duel.bump)]
    pub duel: Box<Account<'info, Duel>>,
    #[account(init, payer = winner, space = 8 + Trophy::INIT_SPACE, seeds = [TROPHY_SEED, duel.key().as_ref()], bump)]
    pub trophy: Account<'info, Trophy>,
    pub system_program: Program<'info, System>,
}

/// A winning basket, recorded by its winner after settlement.
#[account]
#[derive(InitSpace)]
pub struct Trophy {
    pub owner: Pubkey,
    pub duel: Pubkey,
    pub duel_id: u64,
    pub opponent: Pubkey,
    /// The basket as drafted (weights in %, per asset).
    pub weights: [u8; ASSETS],
    pub score: i64,
    pub opp_score: i64,
    pub stake: u64,
    /// The three mutations the basket lived through.
    pub mutations: [MutationSlot; MUTATIONS],
    pub minted_ts: i64,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct Settle<'info> {
    pub caller: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [DUEL_SEED, &duel.id.to_le_bytes()], bump = duel.bump)]
    pub duel: Box<Account<'info, Duel>>,
    #[account(mut, seeds = [PROFILE_SEED, duel.players[0].as_ref()], bump = profile0.bump)]
    pub profile0: Box<Account<'info, Profile>>,
    #[account(mut, seeds = [PROFILE_SEED, duel.players[1].as_ref()], bump = profile1.bump)]
    pub profile1: Box<Account<'info, Profile>>,
    /// CHECK: player 0's test-USDC account, checked in the handler.
    #[account(mut)]
    pub usdc0: UncheckedAccount<'info>,
    /// CHECK: player 1's test-USDC account, checked in the handler.
    #[account(mut)]
    pub usdc1: UncheckedAccount<'info>,
    /// CHECK: the config's vault.
    #[account(mut, address = config.vault @ ArenaError::BadVault)]
    pub vault: UncheckedAccount<'info>,
    /// CHECK: address-checked SPL Token program.
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ActOnDuel<'info> {
    pub signer: Signer<'info>,
    #[account(mut, seeds = [DUEL_SEED, &duel.id.to_le_bytes()], bump = duel.bump)]
    pub duel: Box<Account<'info, Duel>>,
}

macro_rules! feed_accounts {
    ($name:ident { $($extra:tt)* }) => {
        #[derive(Accounts)]
        pub struct $name<'info> {
            $($extra)*
            /// CHECK: pinned to FEEDS[0] (SOL), owner checked on read.
            pub feed_sol: UncheckedAccount<'info>,
            /// CHECK: pinned to FEEDS[1] (JUP).
            pub feed_jup: UncheckedAccount<'info>,
            /// CHECK: pinned to FEEDS[2] (BONK).
            pub feed_bonk: UncheckedAccount<'info>,
            /// CHECK: pinned to FEEDS[3] (WIF).
            pub feed_wif: UncheckedAccount<'info>,
            /// CHECK: pinned to FEEDS[4] (JTO).
            pub feed_jto: UncheckedAccount<'info>,
            /// CHECK: pinned to FEEDS[5] (PYTH).
            pub feed_pyth: UncheckedAccount<'info>,
        }
        impl<'info> $name<'info> {
            fn feeds(&self) -> [&UncheckedAccount<'info>; ASSETS] {
                [&self.feed_sol, &self.feed_jup, &self.feed_bonk, &self.feed_wif, &self.feed_jto, &self.feed_pyth]
            }
        }
    };
}

feed_accounts!(Tick {
    #[account(mut, seeds = [DUEL_SEED, &duel.id.to_le_bytes()], bump = duel.bump)]
    pub duel: Box<Account<'info, Duel>>,
});

feed_accounts!(StartDuel {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [DUEL_SEED, &duel.id.to_le_bytes()], bump = duel.bump)]
    pub duel: Box<Account<'info, Duel>>,
    /// CHECK: MagicBlock program, for ScheduleTask.
    #[account(address = MAGIC_PROGRAM_ID)]
    pub magic_program: UncheckedAccount<'info>,
});

#[vrf]
#[derive(Accounts)]
pub struct RequestMutation<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [DUEL_SEED, &duel.id.to_le_bytes()], bump = duel.bump)]
    pub duel: Box<Account<'info, Duel>>,
    /// CHECK: VRF oracle queue, validated by the VRF program.
    #[account(mut)]
    pub oracle_queue: UncheckedAccount<'info>,
}

#[vrf_callback]
#[derive(Accounts)]
pub struct ApplyMutationCtx<'info> {
    #[account(mut)]
    pub duel: Box<Account<'info, Duel>>,
}

#[commit]
#[derive(Accounts)]
pub struct FinishDuel<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [DUEL_SEED, &duel.id.to_le_bytes()], bump = duel.bump)]
    pub duel: Box<Account<'info, Duel>>,
}
