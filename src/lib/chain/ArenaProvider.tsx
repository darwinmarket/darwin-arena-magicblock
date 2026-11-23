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
import { PracticeBotAutopilot, summonPracticeBot } from "./practiceBot";
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
  /// Devnet SOL drip from the site's faucet (server-side, rate limited).
  requestSol: () => Promise<string>;
  solStatus: "idle" | "requesting" | "funded" | "refused";
  createProfile: (name: string) => Promise<string>;
  findMatch: (stake: number) => Promise<number>;
  cancelWaiting: (duelId: number) => Promise<string>;
  commitBasket: (duelId: number, legs: Leg[]) => Promise<string>;
  rebalance: (duelId: number, weights: number[]) => Promise<string>;
  claim: (duelId: number) => Promise<string | null>;
  /// Seat a practice bot (runs in this browser) in the duel waiting at the table.
  summonBot: (duelId: number) => Promise<string>;
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
    // Retry until the arena config loads (a flaky RPC answer must not leave the
    // whole game without its mint and vault).
    let stop = false;
    const load = () =>
      program.account.config
        .fetch(configPda())
        .then((c) => !stop && setConfig({ mint: c.usdcMint, vault: c.vault }))
        .catch((e) => {
          console.warn("arena config", e);
          if (!stop) setTimeout(load, 2000);
        });
    load();
    return () => {
      stop = true;
    };
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
      if (!publicKey) throw new Error("Connect a wallet first");
      if (!signTransaction) throw new Error("This wallet cannot sign transactions");
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
    if (!publicKey) throw new Error("Connect a wallet first");
    if (!config) throw new Error("Arena config not loaded yet, retry in a second");
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
      if (!publicKey) throw new Error("Connect a wallet first");
    if (!config) throw new Error("Arena config not loaded yet, retry in a second");
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
      // No test USDC yet? Mint it in the same approval as the stake.
      const held = await base.getTokenAccountBalance(usdcAta).then((b) => Number(b.value.amount) / 1e6).catch(() => 0);
      if (held < stake) {
        ixs.push(createAssociatedTokenAccountIdempotentInstruction(publicKey, usdcAta, publicKey, config.mint));
        ixs.push(await ix.faucet(program, publicKey, config.mint, usdcAta));
      }
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
      if (!publicKey) throw new Error("Connect a wallet first");
    if (!config) throw new Error("Arena config not loaded yet, retry in a second");
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
      if (!publicKey) throw new Error("Connect a wallet first");
    if (!config) throw new Error("Arena config not loaded yet, retry in a second");
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

  const summonBot = useCallback(
    async (duelId: number) => {
      if (!publicKey) throw new Error("Connect a wallet first");
      const sig = await summonPracticeBot({ base, program, wallet: publicKey, duelId, fundWith: (ixs, label) => sendWallet(ixs, label) });
      note("Practice bot sat down ✓");
      return sig;
    },
    [publicKey, base, program, sendWallet, note],
  );

  const [solStatus, setSolStatus] = useState<ArenaCtx["solStatus"]>("idle");
  const requestSol = useCallback(async () => {
    if (!publicKey) throw new Error("Connect a wallet first");
    setSolStatus("requesting");
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const res = await fetch(`${base}/api/faucet`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet: publicKey.toBase58() }),
    });
    const body = (await res.json().catch(() => ({}))) as { signature?: string; error?: string };
    if (!res.ok || !body.signature) {
      setSolStatus("refused");
      throw new Error(body.error ?? `faucet error ${res.status}`);
    }
    setSolStatus("funded");
    note("Devnet SOL received ✓");
    await refresh();
    return body.signature;
  }, [publicKey, note, refresh]);

  // Zero-friction onboarding: a connected wallet without enough devnet SOL to
  // play gets a drip automatically, once per wallet per browser session.
  useEffect(() => {
    if (!publicKey || sol === null || sol >= 0.03) return;
    const key = `darwin-arena:sol-drip:${publicKey.toBase58()}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    requestSol().catch(() => {});
  }, [publicKey, sol, requestSol]);

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
    requestSol,
    solStatus,
    createProfile,
    findMatch,
    cancelWaiting,
    commitBasket,
    rebalance,
    claim,
    summonBot,
    currentDuel,
    setCurrentDuel,
    activity,
  };
  return (
    <Ctx.Provider value={value}>
      {children}
      <DuelAutopilot erProgram={erProgram} />
      <PracticeBotAutopilot erProgram={erProgram} />
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
  const { currentDuel, wallet, er, base, program, mint, refresh } = useArena();
  const live = useDuel(currentDuel, 1500);
  const busy = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!live || !wallet || live.mySlot === null || currentDuel === null) return;
    const { view, mySlot, layer } = live;
    const id = currentDuel;
    const s = loadSession(wallet);
    if (!s) return;
    const once = async (conn: Connection, k: string, ms: number, f: () => Promise<TransactionInstruction[]>) => {
      if (Date.now() - (busy.current[k] ?? 0) < ms) return;
      busy.current[k] = Date.now();
      try {
        const tx = new Transaction().add(...(await f()));
        tx.feePayer = s.keypair.publicKey;
        tx.recentBlockhash = (await conn.getLatestBlockhash("confirmed")).blockhash;
        tx.sign(s.keypair);
        await sendAndPoll(conn, tx, k);
        return true;
      } catch {
        /* someone else (the rival, the keeper) may have done it first */
      }
    };
    const now = Math.floor(Date.now() / 1000);
    if (layer === "er") {
      if (view.status === STATUS.DRAFTING) {
        const b = loadBasket(wallet, id);
        if (b && !view.revealed[mySlot]) once(er, `reveal-${id}`, 5000, async () => [await ix.revealBasket(erProgram, s.keypair.publicKey, id, b.weights, Uint8Array.from(b.salt))]);
        if (view.revealed[0] && view.revealed[1]) once(er, `start-${id}`, 5000, async () => [await ix.startDuel(erProgram, s.keypair.publicKey, id)]);
      } else if (view.status === STATUS.LIVE) {
        view.mutations.forEach((m, i) => {
          // Give the keeper a few seconds first; then any client may trigger it.
          if (m.state === "hidden" && now - view.startTs >= m.at + 4) {
            once(er, `mut-${id}-${i}`, 10_000, async () => [await ix.requestMutation(erProgram, s.keypair.publicKey, id, i)]);
          }
        });
      } else if (view.status === STATUS.FINISHED) {
        // Time is up: hand the duel back to Solana (after the keeper's chance).
        if (now - view.endTs >= 4) once(er, `finish-${id}`, 10_000, async () => [await ix.finishDuel(erProgram, s.keypair.publicKey, id)]);
      }
    } else if (view.status === STATUS.FINISHED && mint && view.players[1]) {
      // Back on Solana but not paid yet: settle, paid by the session key.
      const [p0, p1] = [view.players[0], view.players[1]];
      once(base, `settle-${id}`, 10_000, async () => {
        const c = await program.account.config.fetch(configPda());
        return [await ix.settle(program, s.keypair.publicKey, id, [p0, p1], [ataOf(p0, mint), ataOf(p1, mint)], c.vault)];
      }).then((ok) => ok && refresh());
    }
  }, [live, wallet, currentDuel, er, base, program, mint, refresh, erProgram]);
  return null;
}
