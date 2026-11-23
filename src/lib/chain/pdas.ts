// Every account the program uses is a PDA derivable from the program id, so the
// whole state can be found without an indexer.
import { PublicKey } from "@solana/web3.js";
import { DELEGATION_PROGRAM_ID, PROGRAM_ID, SESSION_PROGRAM_ID, TOKEN_PROGRAM_ID, VRF_PROGRAM_ID } from "./constants";

const pda = (seeds: (Buffer | Uint8Array)[], program = PROGRAM_ID) => PublicKey.findProgramAddressSync(seeds, program)[0];
const u64le = (n: number | bigint) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
};

export const configPda = () => pda([Buffer.from("config")]);
export const tablePda = (tier: number) => pda([Buffer.from("table"), Buffer.from([tier])]);
export const duelPda = (id: number | bigint) => pda([Buffer.from("duel"), u64le(id)]);
export const profilePda = (user: PublicKey) => pda([Buffer.from("profile"), user.toBuffer()]);
export const faucetPda = (user: PublicKey) => pda([Buffer.from("faucet"), user.toBuffer()]);

/// The identity PDA this program signs VRF requests with.
export const vrfIdentityPda = () => pda([Buffer.from("identity")]);
/// The per-program VRF identity that signs our callbacks.
export const vrfCallbackIdentity = () => pda([Buffer.from("identity"), PROGRAM_ID.toBuffer()], VRF_PROGRAM_ID);

export const sessionTokenPda = (sessionSigner: PublicKey, authority: PublicKey) =>
  pda(
    [Buffer.from("session_token_v2"), PROGRAM_ID.toBuffer(), sessionSigner.toBuffer(), authority.toBuffer()],
    SESSION_PROGRAM_ID,
  );

export const ataOf = (owner: PublicKey, mint: PublicKey) =>
  pda(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
  );

export const delegationRecordPda = (account: PublicKey) =>
  pda([Buffer.from("delegation"), account.toBuffer()], DELEGATION_PROGRAM_ID);
