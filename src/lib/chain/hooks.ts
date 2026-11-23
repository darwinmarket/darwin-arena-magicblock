"use client";

// Small read hooks over the chain: live oracle prices on the rollup, and any
// player's on-chain profile as a front `Player`.
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import type { Player } from "../types";
import { useArena } from "./ArenaProvider";
import { ASSETS, FEEDS } from "./constants";
import { profilePda } from "./pdas";
import { playerFromProfile } from "./profile";

/// MagicBlock's Pyth Lazer feeds, read from the ER (where they are updated every
/// 50-200 ms; their base-layer copies are stale). symbol -> USD price.
export function usePrices(everyMs = 2000): Record<string, number> {
  const { er } = useArena();
  const [prices, setPrices] = useState<Record<string, number>>({});
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const infos = await er.getMultipleAccountsInfo(FEEDS);
        if (stop) return;
        const next: Record<string, number> = {};
        infos.forEach((ai, i) => {
          if (!ai || ai.data.length < 81) return;
          const raw = ai.data.readBigInt64LE(73);
          next[ASSETS[i].symbol] = Number(raw) * 10 ** ASSETS[i].exponent;
        });
        setPrices(next);
      } catch {
        /* next poll */
      }
    };
    poll();
    const t = setInterval(poll, everyMs);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [er, everyMs]);
  return prices;
}

/// A player's profile from Solana, refreshed every `everyMs`.
export function usePlayer(key: PublicKey | null | undefined, everyMs = 15_000): Player | null {
  const { program } = useArena();
  const [player, setPlayer] = useState<Player | null>(null);
  const k = key?.toBase58();
  useEffect(() => {
    if (!k) {
      setPlayer(null);
      return;
    }
    const pk = new PublicKey(k);
    let stop = false;
    const load = () =>
      program.account.profile
        .fetchNullable(profilePda(pk))
        .then((p) => !stop && setPlayer(playerFromProfile(pk, p)))
        .catch(() => {});
    load();
    const t = setInterval(load, everyMs);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [k, program, everyMs]);
  return player;
}

export interface MarketHistory {
  change24h: number;
  closes: number[];
}

/// 24 h change and hourly closes per asset, from the site's /api/market route.
export function useMarketHistory(): Record<string, MarketHistory> {
  const [data, setData] = useState<Record<string, MarketHistory>>({});
  useEffect(() => {
    let stop = false;
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const load = () =>
      fetch(`${base}/api/market`)
        .then((r) => r.json())
        .then((j: { assets?: Record<string, MarketHistory> }) => !stop && j.assets && setData(j.assets))
        .catch(() => {});
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);
  return data;
}

export interface LeaderRow {
  key: PublicKey;
  player: Player;
  points: number;
  wins: number;
  losses: number;
  games: number;
}

/// Every profile on chain (one getProgramAccounts), ranked by points then wins.
export function useLeaderboard(everyMs = 30_000): LeaderRow[] {
  const { program } = useArena();
  const [rows, setRows] = useState<LeaderRow[]>([]);
  useEffect(() => {
    let stop = false;
    const load = () =>
      program.account.profile
        .all()
        .then((all) => {
          if (stop) return;
          const n = (x: { toString(): string }) => Number(x.toString());
          setRows(
            all
              .map(({ account }) => ({
                key: account.authority,
                player: playerFromProfile(account.authority, account),
                points: n(account.points),
                wins: n(account.wins),
                losses: n(account.losses),
                games: n(account.games),
              }))
              .filter((r) => r.games > 0)
              .sort((a, b) => b.points - a.points || b.wins - a.wins || a.games - b.games),
          );
        })
        .catch(() => {});
    load();
    const t = setInterval(load, everyMs);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [program, everyMs]);
  return rows;
}
