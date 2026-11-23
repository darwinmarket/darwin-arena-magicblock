// Instruction builders for every darwin-arena instruction, shared by the front,
// the crank, the bot and the tests. Each returns a plain TransactionInstruction,
// so the caller decides which layer (base or ER) and which signer sends it.
import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  type Transaction,
  type VersionedTransaction,
} from "@solana/web3.js";
import {
  ER_VALIDATOR,
  FEEDS,
  MAGIC_CONTEXT_ID,
  MAGIC_PROGRAM_ID,
  PROGRAM_ID,
  SESSION_PROGRAM_ID,
  SLOT_HASHES,
  TOKEN_PROGRAM_ID,
  VRF_EPHEMERAL_QUEUE,
  VRF_PROGRAM_ID,
} from "./constants";
import rawIdl from "./idl/darwin_arena.json";
import type { DarwinArena } from "./idl/darwin_arena";
import { configPda, duelPda, faucetPda, profilePda, sessionTokenPda, tablePda, vrfIdentityPda } from "./pdas";

export type ArenaProgram = Program<DarwinArena>;

const idl = { ...(rawIdl as object), address: PROGRAM_ID.toBase58() } as unknown as DarwinArena;

/// A Program bound to a connection, for building instructions and decoding
/// accounts. It never signs: the wallet stub refuses.
export function arenaProgram(connection: Connection): ArenaProgram {
  const wallet = {
    publicKey: PublicKey.default,
    signTransaction: async <T extends Transaction | VersionedTransaction>(_tx: T): Promise<T> => {
      throw new Error("read-only provider");
    },
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(_txs: T[]): Promise<T[]> => {
      throw new Error("read-only provider");
    },
  };
  return new Program(idl as Idl, new AnchorProvider(connection, wallet, { commitment: "confirmed" })) as unknown as ArenaProgram;
}

const feedAccounts = () => ({
  feedSol: FEEDS[0],
  feedJup: FEEDS[1],
  feedBonk: FEEDS[2],
  feedWif: FEEDS[3],
  feedJto: FEEDS[4],
  feedPyth: FEEDS[5],
});

// ----------------------------------------------------------------- base layer

export const ix = {
  initialize: (p: ArenaProgram, admin: PublicKey, usdcMint: PublicKey, vault: PublicKey) =>
    p.methods
      .initialize()
      .accountsPartial({ admin, config: configPda(), usdcMint, vault, systemProgram: SystemProgram.programId })
      .instruction(),

  initTable: (p: ArenaProgram, admin: PublicKey, tier: number) =>
    p.methods
      .initTable(tier)
      .accountsPartial({ admin, config: configPda(), table: tablePda(tier), systemProgram: SystemProgram.programId })
      .instruction(),

  faucet: (p: ArenaProgram, user: PublicKey, usdcMint: PublicKey, userUsdc: PublicKey) =>
    p.methods
      .faucet()
      .accountsPartial({
        user,
        config: configPda(),
        claim: faucetPda(user),
        usdcMint,
        userUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction(),

  initProfile: (p: ArenaProgram, user: PublicKey, name: string) =>
    p.methods
      .initProfile(name)
      .accountsPartial({ user, profile: profilePda(user), systemProgram: SystemProgram.programId })
      .instruction(),

  openDuel: (p: ArenaProgram, player: PublicKey, tier: number, duelId: number, playerUsdc: PublicKey, vault: PublicKey) =>
    p.methods
      .openDuel(tier)
      .accountsPartial({
        player,
        profile: profilePda(player),
        config: configPda(),
        table: tablePda(tier),
        duel: duelPda(duelId),
        playerUsdc,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction(),

  joinDuel: (p: ArenaProgram, player: PublicKey, tier: number, duelId: number, playerUsdc: PublicKey, vault: PublicKey) =>
    p.methods
      .joinDuel()
      .accountsPartial({
        player,
        profile: profilePda(player),
        config: configPda(),
        table: tablePda(tier),
        duel: duelPda(duelId),
        playerUsdc,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction(),

  cancelDuel: (
    p: ArenaProgram,
    caller: PublicKey,
    tier: number,
    duelId: number,
    usdc0: PublicKey,
    usdc1: PublicKey | null,
    vault: PublicKey,
  ) =>
    p.methods
      .cancelDuel()
      .accountsPartial({
        caller,
        config: configPda(),
        table: tablePda(tier),
        duel: duelPda(duelId),
        usdc0,
        usdc1,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction(),

  /// `signer` is the wallet itself, or a session key with `sessionToken`.
  commitBasket: (
    p: ArenaProgram,
    signer: PublicKey,
    player: PublicKey,
    duelId: number,
    commitment: Uint8Array,
    sessionToken: PublicKey | null,
  ) =>
    p.methods
      .commitBasket(Array.from(commitment))
      .accountsPartial({ signer, player, duel: duelPda(duelId), sessionToken })
      .instruction(),

  delegateDuel: async (p: ArenaProgram, payer: PublicKey, duelId: number, validator: PublicKey = ER_VALIDATOR) =>
    p.methods
      .delegateDuel(new BN(duelId))
      .accountsPartial({ payer, duel: duelPda(duelId) })
      .remainingAccounts([{ pubkey: validator, isSigner: false, isWritable: false }])
      .instruction(),

  settle: (
    p: ArenaProgram,
    caller: PublicKey,
    duelId: number,
    players: [PublicKey, PublicKey],
    usdc: [PublicKey, PublicKey],
    vault: PublicKey,
  ) =>
    p.methods
      .settle()
      .accountsPartial({
        caller,
        config: configPda(),
        duel: duelPda(duelId),
        profile0: profilePda(players[0]),
        profile1: profilePda(players[1]),
        usdc0: usdc[0],
        usdc1: usdc[1],
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction(),

  // --------------------------------------------------------- ephemeral rollup

  revealBasket: (p: ArenaProgram, signer: PublicKey, duelId: number, weights: number[], salt: Uint8Array) =>
    p.methods
      .revealBasket(weights, Array.from(salt))
      .accountsPartial({ signer, duel: duelPda(duelId) })
      .instruction(),

  startDuel: (p: ArenaProgram, payer: PublicKey, duelId: number) =>
    p.methods
      .startDuel()
      .accountsPartial({ payer, duel: duelPda(duelId), magicProgram: MAGIC_PROGRAM_ID, ...feedAccounts() })
      .instruction(),

  tick: (p: ArenaProgram, duelId: number) =>
    p.methods
      .tick()
      .accountsPartial({ duel: duelPda(duelId), ...feedAccounts() })
      .instruction(),

  requestMutation: (p: ArenaProgram, payer: PublicKey, duelId: number, index: number) =>
    p.methods
      .requestMutation(index)
      .accountsPartial({
        payer,
        duel: duelPda(duelId),
        oracleQueue: VRF_EPHEMERAL_QUEUE,
        programIdentity: vrfIdentityPda(),
        vrfProgram: VRF_PROGRAM_ID,
        slotHashes: SLOT_HASHES,
        systemProgram: SystemProgram.programId,
      })
      .instruction(),

  rebalance: (p: ArenaProgram, signer: PublicKey, duelId: number, weights: number[]) =>
    p.methods
      .rebalance(weights)
      .accountsPartial({ signer, duel: duelPda(duelId) })
      .instruction(),

  finishDuel: (p: ArenaProgram, payer: PublicKey, duelId: number) =>
    p.methods
      .finishDuel()
      .accountsPartial({ payer, duel: duelPda(duelId), magicProgram: MAGIC_PROGRAM_ID, magicContext: MAGIC_CONTEXT_ID })
      .instruction(),
};

// ------------------------------------------------------------- session keys

/// `create_session_v2` of MagicBlock's session-keys program: the wallet
/// (authority + fee payer) authorises `sessionSigner` to act for it on this
/// program until `validUntil`, and tops the session key up with `lamports` so it
/// can pay its own base-layer fees (the basket commitment).
export function createSessionIx(
  authority: PublicKey,
  sessionSigner: PublicKey,
  validUntil: number,
  lamports: number,
): TransactionInstruction {
  // sha256("global:create_session_v2")[..8]
  const disc = Buffer.from("dfe96c0741c2eb26", "hex");
  const data = Buffer.concat([
    disc,
    Buffer.from([1, 1]), // Some(true): top up
    Buffer.from([1]),
    i64le(validUntil),
    Buffer.from([1]),
    i64le(lamports),
  ]);
  return new TransactionInstruction({
    programId: SESSION_PROGRAM_ID,
    keys: [
      { pubkey: sessionTokenPda(sessionSigner, authority), isSigner: false, isWritable: true },
      { pubkey: sessionSigner, isSigner: true, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function i64le(n: number): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(BigInt(Math.floor(n)));
  return b;
}

export const newSessionKey = () => Keypair.generate();
