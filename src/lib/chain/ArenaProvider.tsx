"use client";

// The adapter between the game screens and the chain. Screens keep their props
// and visuals; this context gives them the wallet, the on-chain profile, the
// test-USDC balance, and the actions of a duel (find a match, commit, rebalance,
// claim). Rollup transactions are signed by the session key, never the wallet.
import { createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { arenaProgram, createSessionIx, ix, type ArenaProgram } from "./arena";
import { BASE_RPC, DELEGATION_PROGRAM_ID, ER_RPC, PROGRAM_ID, STATUS, STAKES } from "./constants";
import { commitment, duelView, randomSalt, toWeights, type DuelView, type Leg } from "./duel";
import { ataOf, configPda, duelPda, profilePda, sessionTokenPda, tablePda } from "./pdas";
import {
  loadBasket,
  loadCurrentDuel,
  loadSession,
  saveBasket,
  saveCurrentDuel,
  saveSession,
  SESSION_HOURS,
  SESSION_TOP_UP_SOL,
} from "./session";

export type DuelLayer = "base" | "er";
export interface LiveDuel {
  view: DuelView;
  layer: DuelLayer;
  /// 0 or 1: which seat the connected wallet holds, or null for a spectator.
  mySlot: 0 | 1 | null;
}

interface ArenaCtx {
  base: Connection;
  er: Connection;
  program: ArenaProgram;
  wallet: PublicKey | null;
  ready: boolean;
  usdc: number | null;
  sol: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any | null;
  mint: PublicKey | null;
  refresh: () => Promise<void>;
  claimFaucet: () => Promise<string>;
  createProfile: (name: string) => Promise<string>;
  findMatch: (stake: number) => Promise<number>;
  cancelWaiting: (duelId: number) => Promise<string>;
  commitBasket: (duelId: number, legs: Leg[]) => Promise<string>;
  rebalance: (duelId: number, weights: number[]) => Promise<string>;
  claim: (duelId: number) => Promise<string | null>;
  currentDuel: number | null;
  setCurrentDuel: (id: number | null) => void;
  /// Every step of the session/rollup flow, for the arena feed.
  activity: string[];
}

const Ctx = createContext<ArenaCtx | null>(null);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/// Send and wait by polling (the rollup endpoints do not relay every websocket
/// method web3.js relies on for confirmation).
async function sendAndPoll(conn: Connection, tx: Transaction, label: string): Promise<string> {
  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: true });
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    const st = (await conn.getSignatureStatuses([sig])).value[0];
    if (!st) continue;
    if (st.err) throw new Error(`${label} failed: ${JSON.stringify(st.err)}`);
    if (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized") return sig;
  }
  throw new Error(`${label} not confirmed`);
}

export function ArenaProvider({ children }: { children: ReactNode }) {
  const { publicKey, signTransaction } = useWallet();
  const base = useMemo(() => new Connection(BASE_RPC, "confirmed"), []);
  const er = useMemo(() => new Connection(ER_RPC, "confirmed"), []);
  const program = useMemo(() => arenaProgram(base), [base]);
  const erProgram = useMemo(() => arenaProgram(er), [er]);
  const [config, setConfig] = useState<{ mint: PublicKey; vault: PublicKey } | null>(null);
  const [usdc, setUsdc] = useState<number | null>(null);
  const [sol, setSol] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any | null>(null);
  const [currentDuel, setCurrentDuelState] = useState<number | null>(null);
  const [activity, setActivity] = useState<string[]>([]);
  const note = useCallback((s: string) => setActivity((a) => [s, ...a].slice(0, 30)), []);

  useEffect(() => {
    program.account.config.fetch(configPda()).then((c) => setConfig({ mint: c.usdcMint, vault: c.vault })).catch(() => {});
  }, [program]);

  useEffect(() => {
    if (publicKey) setCurrentDuelState(loadCurrentDuel(publicKey));
  }, [publicKey]);
  const setCurrentDuel = useCallback(
    (id: number | null) => {
      setCurrentDuelState(id);
      if (publicKey) saveCurrentDuel(publicKey, id);
    },
    [publicKey],
  );

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setUsdc(null);
      setSol(null);
      setProfile(null);
      return;
    }
    const [lamports, p] = await Promise.all([
      base.getBalance(publicKey).catch(() => null),
      program.account.profile.fetchNullable(profilePda(publicKey)).catch(() => null),
    ]);
    setSol(lamports === null ? null : lamports / LAMPORTS_PER_SOL);
    setProfile(p);
    if (config) {
      const b = await base.getTokenAccountBalance(ataOf(publicKey, config.mint)).catch(() => null);
      setUsdc(b ? Number(b.value.amount) / 1e6 : 0);
    }
  }, [publicKey, base, program, config]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  /// Wallet-signed base-layer transaction, optionally co-signed by fresh keys.
  const sendWallet = useCallback(
    async (ixs: TransactionInstruction[], label: string, cosigners: Keypair[] = []) => {
      if (!publicKey || !signTransaction) throw new Error("Connect a wallet first");
      const tx = new Transaction().add(...ixs);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await base.getLatestBlockhash("confirmed")).blockhash;
      if (cosigners.length) tx.partialSign(...cosigners);
      const signed = await signTransaction(tx);
      const sig = await sendAndPoll(base, signed, label);
      note(`${label} ✓`);
      return sig;
    },
    [publicKey, signTransaction, base, note],
  );

  /// Session-key-signed transaction, on the base layer or the rollup.
  const sendSession = useCallback(
    async (conn: Connection, ixs: (k: PublicKey) => Promise<TransactionInstruction[]>, label: string) => {
      if (!publicKey) throw new Error("Connect a wallet first");
      const s = loadSession(publicKey);
      if (!s) throw new Error("No session key: join a table first");
      const tx = new Transaction().add(...(await ixs(s.keypair.publicKey)));
      tx.feePayer = s.keypair.publicKey;
      tx.recentBlockhash = (await conn.getLatestBlockhash("confirmed")).blockhash;
      tx.sign(s.keypair);
      const sig = await sendAndPoll(conn, tx, label);
      note(`${label} ✓`);
      return sig;
    },
    [publicKey, note],
  );

  /// Instructions that (re)authorise a session key if the current one is missing,
  /// expiring, or out of SOL. Bundled into the stake transaction.
  const sessionIxs = useCallback(async (): Promise<{ ixs: TransactionInstruction[]; signer: Keypair | null }> => {
    if (!publicKey) return { ixs: [], signer: null };
    const now = Math.floor(Date.now() / 1000);
    const s = loadSession(publicKey);
    if (s && s.validUntil > now + 15 * 60) {
      const [token, lamports] = await Promise.all([
        base.getAccountInfo(sessionTokenPda(s.keypair.publicKey, publicKey)),
        base.getBalance(s.keypair.publicKey),
      ]);
      if (token && lamports >= 0.01 * LAMPORTS_PER_SOL) return { ixs: [], signer: null };
    }
    const keypair = Keypair.generate();
    const validUntil = now + SESSION_HOURS * 3600;
    saveSession(publicKey, keypair, validUntil);
    return { ixs: [createSessionIx(publicKey, keypair.publicKey, validUntil, SESSION_TOP_UP_SOL * LAMPORTS_PER_SOL)], signer: keypair };
  }, [publicKey, base]);

  const claimFaucet = useCallback(async () => {
    if (!publicKey || !config) throw new Error("Connect a wallet first");
    const ata = ataOf(publicKey, config.mint);
    const sig = await sendWallet(
      [createAssociatedTokenAccountIdempotentInstruction(publicKey, ata, publicKey, config.mint), await ix.faucet(program, publicKey, config.mint, ata)],
      "Claim 100 test USDC",
    );
    await refresh();
    return sig;
  }, [publicKey, config, program, sendWallet, refresh]);

  const createProfile = useCallback(
    async (name: string) => {
      if (!publicKey) throw new Error("Connect a wallet first");
      const sig = await sendWallet([await ix.initProfile(program, publicKey, name)], "Create profile");
      await refresh();
      return sig;
    },
    [publicKey, program, sendWallet, refresh],
  );

  /// Sit at the table: join the duel waiting there, or open one. One wallet
  /// approval: profile (first time), stake, session key.
  const findMatch = useCallback(
    async (stake: number) => {
      if (!publicKey || !config) throw new Error("Connect a wallet first");
      const tier = STAKES.indexOf(stake);
      const table = await program.account.table.fetch(tablePda(tier));
      if (!table.waiting.equals(PublicKey.default)) {
        const w = await program.account.duel.fetch(table.waiting);
        if (w.players[0].equals(publicKey)) {
          setCurrentDuel(w.id.toNumber());
          return w.id.toNumber();
        }
      }
      const ixs: TransactionInstruction[] = [];
      if (!(await base.getAccountInfo(profilePda(publicKey)))) {
        ixs.push(await ix.initProfile(program, publicKey, `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`));
      }
      const usdcAta = ataOf(publicKey, config.mint);
      let id: number;
      if (!table.waiting.equals(PublicKey.default)) {
        id = (await program.account.duel.fetch(table.waiting)).id.toNumber();
        ixs.push(await ix.joinDuel(program, publicKey, tier, id, usdcAta, config.vault));
      } else {
        id = (await program.account.config.fetch(configPda())).duelCount.toNumber();
        ixs.push(await ix.openDuel(program, publicKey, tier, id, usdcAta, config.vault));
      }
      const session = await sessionIxs();
      await sendWallet([...ixs, ...session.ixs], `Stake ${stake} USDC`, session.signer ? [session.signer] : []);
      setCurrentDuel(id);
      refresh();
      return id;
    },
    [publicKey, config, program, base, sessionIxs, sendWallet, setCurrentDuel, refresh],
  );

  const cancelWaiting = useCallback(
    async (duelId: number) => {
      if (!publicKey || !config) throw new Error("Connect a wallet first");
      const d = await program.account.duel.fetch(duelPda(duelId));
      const sig = await sendWallet([await ix.cancelDuel(program, publicKey, d.tier, duelId, ataOf(publicKey, config.mint), null, config.vault)], "Leave table");
      setCurrentDuel(null);
      refresh();
      return sig;
    },
    [publicKey, config, program, sendWallet, setCurrentDuel, refresh],
  );

  /// Lock the basket: only its hash goes on chain. Signed by the session key; if
  /// the rival already committed, the same transaction hands the duel to the ER.
  const commitBasket = useCallback(
    async (duelId: number, legs: Leg[]) => {
      if (!publicKey) throw new Error("Connect a wallet first");
      const weights = toWeights(legs);
      const salt = randomSalt();
      saveBasket(publicKey, duelId, { weights, salt: Array.from(salt) });
      const d = await program.account.duel.fetch(duelPda(duelId));
      const slot = d.players[0].equals(publicKey) ? 0 : 1;
      const rivalCommitted = !(d.commits[1 - slot] as number[]).every((b) => b === 0);
      return sendSession(
        base,
        async (k) => {
          const ixs = [await ix.commitBasket(program, k, publicKey, duelId, commitment(duelPda(duelId), publicKey, weights, salt), sessionTokenPda(k, publicKey))];
          if (rivalCommitted) ixs.push(await ix.delegateDuel(program, k, duelId));
          return ixs;
        },
        rivalCommitted ? "Lock basket + send duel to the rollup" : "Lock basket (commitment)",
      );
    },
    [publicKey, program, base, sendSession],
  );

  const rebalance = useCallback(
    (duelId: number, weights: number[]) =>
      sendSession(er, async (k) => [await ix.rebalance(erProgram, k, duelId, weights)], "Rebalance (rollup, no fee)"),
    [er, erProgram, sendSession],
  );

  /// Make sure a finished duel gets paid: finish it on the rollup if nobody did,
  /// then settle on Solana (the keeper normally does both within seconds).
  const claim = useCallback(
    async (duelId: number) => {
      if (!publicKey || !config) throw new Error("Connect a wallet first");
      for (let i = 0; i < 40; i++) {
        const ai = await base.getAccountInfo(duelPda(duelId));
        if (!ai) return null;
        if (ai.owner.equals(DELEGATION_PROGRAM_ID)) {
          if (i === 0) await sendSession(er, async (k) => [await ix.finishDuel(erProgram, k, duelId)], "Finish duel on the rollup").catch(() => null);
          await sleep(1500);
          continue;
        }
        const d = duelView(program.coder.accounts.decode("duel", ai.data));
        if (d.status === STATUS.SETTLED) return null;
        if (d.status !== STATUS.FINISHED) return null;
        const [p0, p1] = d.players;
        const sig = await sendWallet(
          [await ix.settle(program, publicKey, duelId, [p0, p1!], [ataOf(p0, config.mint), ataOf(p1!, config.mint)], config.vault)],
          "Settle on Solana",
        );
        refresh();
        return sig;
      }
      return null;
    },
    [publicKey, config, base, er, program, erProgram, sendSession, sendWallet, refresh],
  );

  const value: ArenaCtx = {
    base,
    er,
    program,
    wallet: publicKey,
    ready: !!config,
    usdc,
    sol,
    profile,
    mint: config?.mint ?? null,
    refresh,
    claimFaucet,
    createProfile,
    findMatch,
    cancelWaiting,
    commitBasket,
    rebalance,
    claim,
    currentDuel,
    setCurrentDuel,
    activity,
  };
  return (
    <Ctx.Provider value={value}>
      {children}
      <DuelAutopilot erProgram={erProgram} />
    </Ctx.Provider>
  );
}

export function useArena() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useArena must be used inside ArenaProvider");
  return ctx;
}

/// Read a duel from wherever it lives right now: Solana while it is being set
/// up and after settlement, the rollup while it is delegated.
export function useDuel(duelId: number | null, everyMs = 1000): LiveDuel | null {
  const { base, er, program, wallet } = useArena();
  const [live, setLive] = useState<LiveDuel | null>(null);
  useEffect(() => {
    if (duelId === null) {
      setLive(null);
      return;
    }
    let stop = false;
    const poll = async () => {
      try {
        const ai = await base.getAccountInfo(duelPda(duelId));
        let data: Buffer | null = null;
        let layer: DuelLayer = "base";
        if (ai?.owner.equals(PROGRAM_ID)) data = ai.data;
        else if (ai?.owner.equals(DELEGATION_PROGRAM_ID)) {
          const e = await er.getAccountInfo(duelPda(duelId));
          if (e?.owner.equals(PROGRAM_ID)) {
            data = e.data;
            layer = "er";
          }
        }
        if (data && !stop) {
          const view = duelView(program.coder.accounts.decode("duel", data));
          const mySlot = wallet ? (view.players[0].equals(wallet) ? 0 : view.players[1]?.equals(wallet) ? 1 : null) : null;
          setLive({ view, layer, mySlot });
        }
      } catch {
        /* transient RPC error: next poll */
      }
    };
    poll();
    const t = setInterval(poll, everyMs);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [duelId, base, er, program, wallet, everyMs]);
  return live;
}

/// Runs in the background for the current duel: reveals the basket as soon as
/// the duel reaches the rollup, starts it, and pulls the VRF trigger for a
/// mutation whose second has come. All session-key signed and permissionless,
/// so the game moves on even without the keeper.
function DuelAutopilot({ erProgram }: { erProgram: ArenaProgram }) {
  const { currentDuel, wallet, er } = useArena();
  const live = useDuel(currentDuel, 1500);
  const busy = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!live || !wallet || live.layer !== "er" || live.mySlot === null || currentDuel === null) return;
    const { view, mySlot } = live;
    const id = currentDuel;
    const s = loadSession(wallet);
    if (!s) return;
    const once = async (k: string, ms: number, f: () => Promise<TransactionInstruction[]>) => {
      if (Date.now() - (busy.current[k] ?? 0) < ms) return;
      busy.current[k] = Date.now();
      try {
        const tx = new Transaction().add(...(await f()));
        tx.feePayer = s.keypair.publicKey;
        tx.recentBlockhash = (await er.getLatestBlockhash("confirmed")).blockhash;
        tx.sign(s.keypair);
        await sendAndPoll(er, tx, k);
      } catch {
        /* someone else (the rival, the keeper) may have done it first */
      }
    };
    const now = Math.floor(Date.now() / 1000);
    if (view.status === STATUS.DRAFTING) {
      const b = loadBasket(wallet, id);
      if (b && !view.revealed[mySlot]) once(`reveal-${id}`, 5000, async () => [await ix.revealBasket(erProgram, s.keypair.publicKey, id, b.weights, Uint8Array.from(b.salt))]);
      if (view.revealed[0] && view.revealed[1]) once(`start-${id}`, 5000, async () => [await ix.startDuel(erProgram, s.keypair.publicKey, id)]);
    } else if (view.status === STATUS.LIVE) {
      view.mutations.forEach((m, i) => {
        // Give the keeper a few seconds first; then any client may trigger it.
        if (m.state === "hidden" && now - view.startTs >= m.at + 4) {
          once(`mut-${id}-${i}`, 10_000, async () => [await ix.requestMutation(erProgram, s.keypair.publicKey, id, i)]);
        }
      });
    }
  }, [live, wallet, currentDuel, er, erProgram]);
  return null;
}
