// Addresses and endpoints shared by the front, the crank, the bot and the tests.
//
// Three endpoints, three jobs:
//   BASE    Solana devnet: faucet, tables, stakes, commitments, settlement.
//   ER      The Ephemeral Rollup the duel is delegated to (devnet-as, validator
//           1.1.1, whose crank scheduler and VRF queue this program targets).
//   ROUTER  MagicBlock's router, to ask which ER a delegated account lives on.
import { PublicKey } from "@solana/web3.js";
import idl from "./idl/darwin_arena.json";

// Literal `process.env.NEXT_PUBLIC_*` reads, so Next inlines them in the browser;
// node scripts set the same variables.
export const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_ARENA_PROGRAM_ID ?? idl.address);

export const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC ?? "https://rpc.magicblock.app/devnet";
export const ER_RPC = process.env.NEXT_PUBLIC_ER_RPC ?? "https://devnet-as.magicblock.app";
export const ROUTER_RPC = "https://devnet-router.magicblock.app";
/// Identity of the devnet-as validator. Delegations name it explicitly.
export const ER_VALIDATOR = new PublicKey(process.env.NEXT_PUBLIC_ER_VALIDATOR ?? "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57");

export const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");
export const MAGIC_PROGRAM_ID = new PublicKey("Magic11111111111111111111111111111111111111");
export const MAGIC_CONTEXT_ID = new PublicKey("MagicContext1111111111111111111111111111111");
export const SESSION_PROGRAM_ID = new PublicKey("KeyspM2ssCJbqUhQ4k7sveSiY4WjnYsrXkC8oDbwde5");
export const VRF_PROGRAM_ID = new PublicKey("Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz");
/// VRF oracle queue for requests made inside an Ephemeral Rollup.
export const VRF_EPHEMERAL_QUEUE = new PublicKey("5hBR571xnXppuCPveTrctfTU7tJLSN94nq7kv7FRK5Tc");
export const SLOT_HASHES = new PublicKey("SysvarS1otHashes111111111111111111111111111");
export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

/// MagicBlock's real-time pricing oracle (Pyth Lazer pushed into the ERs).
export const PRICE_ORACLE_PROGRAM_ID = new PublicKey("PriCems5tHihc6UDXDjzjeawomAwBduWMGAi8ZUjppd");

/// The six playable assets, in on-chain order. `lazerId` and `exponent` come from
/// MagicBlock's pyth_lazer_list.json; the feed account is
/// PDA("price_feed", "pyth-lazer", lazerId) of the oracle program.
export const ASSETS = [
  { symbol: "SOL", lazerId: 6, exponent: -8, feed: "ENYwebBThHzmzwPLAQvCucUTsjyfBSZdD9ViXksS4jPu" },
  { symbol: "JUP", lazerId: 92, exponent: -8, feed: "G2kZYbT2e2qig54RH8FY6G5ihq1QsxTZsNVuAZMV7AW2" },
  { symbol: "BONK", lazerId: 9, exponent: -10, feed: "4WWpu2fva3uZjmZS95fezYFfoydmYi3PU7ApnqG9cYss" },
  { symbol: "WIF", lazerId: 10, exponent: -8, feed: "Cy6KSY9DCcJ5HiKL3H4ir6XiSC1PczCCJj7LEe9Y8A7x" },
  { symbol: "JTO", lazerId: 91, exponent: -8, feed: "G27CrnbG37qfRH15eaXbPtNQ48VagMttoJQBarpRK5nc" },
  { symbol: "PYTH", lazerId: 3, exponent: -8, feed: "8s2NFDX4KSoFPndkajFmWAjGhG7hhH1qnkLu4EMZqzHF" },
] as const;
export const SYMBOLS: string[] = ASSETS.map((a) => a.symbol);
export const FEEDS = ASSETS.map((a) => new PublicKey(a.feed));

export const STAKES = [1, 5, 20];
export const USDC_DECIMALS = 6;
export const DRAFT_SECONDS = 60;
export const DUEL_SECONDS = 300;
export const REVEAL_SECONDS = 45;
export const MUTATION_AT = [60, 150, 240];
export const FREEZE_SECONDS = 30;
export const MAX_REBALANCES = 2;
/// Score unit on chain: 1e-9 of a fraction, so 1e7 = 1 %.
export const SCORE_PER_PCT = 10_000_000;

export const STATUS = { OPEN: 0, DRAFTING: 1, LIVE: 2, FINISHED: 3, SETTLED: 4, CANCELLED: 5 } as const;
export const MUT = { NONE: 0, REQUESTED: 1, APPLIED: 2 } as const;
export const KIND = { DOUBLE: 0, FREEZE: 1, SWAP: 2 } as const;
export const DRAW = 2;
export const NO_WINNER = 255;
