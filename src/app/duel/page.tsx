"use client";

// Spectator page: /duel?id=N. A live (or finished) duel read straight from the
// chain: Solana while it is set up and after settlement, the Ephemeral Rollup
// while it is played. Every account and transaction links to the explorer.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { TradingFloorBackground } from "@/components/brand/TradingFloorBackground";
import { GameTimer } from "@/components/game/GameTimer";
import { TokenCoin } from "@/components/game/TokenCoin";
import { PlayerCard } from "@/components/PlayerCard";
import { Panel, pct } from "@/components/ui";
import { useArena, useDuel } from "@/lib/chain/ArenaProvider";
import { DUEL_SECONDS, PROGRAM_ID, STAKES, STATUS } from "@/lib/chain/constants";
import { toLegs } from "@/lib/chain/duel";
import { usePlayer } from "@/lib/chain/hooks";
import { duelPda, trophyPda } from "@/lib/chain/pdas";
import { explorerAddress, explorerTx } from "@/lib/share";

const STATUS_LABEL = ["Waiting for a rival", "Draft", "Live", "Finished", "Settled", "Cancelled"];

export default function DuelPage() {
  return (
    <Suspense fallback={null}>
      <DuelSpectator />
    </Suspense>
  );
}

function DuelSpectator() {
  const params = useSearchParams();
  const raw = params.get("id");
  const id = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
  const live = useDuel(id, 1500);
  const { base } = useArena();
  const v = live?.view;
  const p0 = usePlayer(v?.players[0]);
  const p1 = usePlayer(v?.players[1] ?? null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [sigs, setSigs] = useState<{ signature: string; blockTime: number | null }[]>([]);
  const [trophy, setTrophy] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  // The duel's transactions on Solana (open, join, commits, delegation, settlement).
  useEffect(() => {
    if (id === null) return;
    base
      .getSignaturesForAddress(duelPda(id), { limit: 20 })
      .then((r) => setSigs(r.map((x) => ({ signature: x.signature, blockTime: x.blockTime ?? null }))))
      .catch(() => {});
    base.getAccountInfo(trophyPda(duelPda(id))).then((ai) => setTrophy(ai ? trophyPda(duelPda(id)).toBase58() : null)).catch(() => {});
  }, [id, base, v?.status]);

  if (id === null) return <p className="text-center text-neutral-400">No race id in the link.</p>;
  if (!v) return <p className="text-center text-neutral-400">Loading race #{id} from chain…</p>;

  const elapsed = v.startTs ? Math.max(0, Math.min(DUEL_SECONDS, now - v.startTs)) : 0;
  const lead = v.score[0] - v.score[1];
  const decided = v.winner === 0 || v.winner === 1 || v.winner === 2;

  return (
    <div className="space-y-5">
      <TradingFloorBackground dim={0.5} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold uppercase">
          Race #{v.id} <span className="text-lg text-white/50">{STAKES[v.tier]} USDC table</span>
        </h1>
        <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-black uppercase text-neutral-300">
          {STATUS_LABEL[v.status]}, {live?.layer === "er" ? "on the Ephemeral Rollup" : "on Solana"}
        </span>
      </div>

      <div className="grid items-center gap-5 md:grid-cols-[1fr_auto_1fr]">
        {p0 ? <PlayerCard player={p0} /> : <div />}
        <div className="text-center">
          {v.status === STATUS.LIVE ? (
            <GameTimer left={DUEL_SECONDS - elapsed} total={DUEL_SECONDS} label="Finish in" />
          ) : (
            <div className="font-display text-5xl font-bold italic">VS</div>
          )}
          <div className="mt-2 font-display text-3xl font-bold tabular-nums">
            <span className={v.score[0] >= 0 ? "text-[#3dff8a]" : "text-[#ff3b5c]"}>{pct(v.score[0])}</span>
            <span className="mx-2 text-base text-white/40">vs</span>
            <span className={v.score[1] >= 0 ? "text-[#3dff8a]" : "text-[#ff3b5c]"}>{pct(v.score[1])}</span>
          </div>
          {decided && v.status >= STATUS.FINISHED && (
            <div className="mt-1 font-display text-sm font-bold uppercase text-[#ffc861]">
              {v.winner === 2 ? "Dead heat, stakes refunded" : `${(v.winner === 0 ? p0 : p1)?.name ?? "Winner"} survives`}
              {v.forfeit && " (forfeit)"}
            </div>
          )}
          {v.status === STATUS.LIVE && (
            <div className="mt-1 text-xs text-white/50">{lead === 0 ? "Even" : `${(lead > 0 ? p0 : p1)?.name ?? ""} leads`}</div>
          )}
        </div>
        {p1 ? <PlayerCard player={p1} mirrored /> : <div className="text-center text-sm text-white/40">Seat open</div>}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {[0, 1].map((s) => (
          <Panel key={s} title={`${(s === 0 ? p0 : p1)?.name ?? `Player ${s + 1}`}'s basket`}>
            {v.revealed[s] || v.status >= STATUS.LIVE ? (
              <div className="space-y-2">
                {toLegs(v.weights[s]).map((l) => (
                  <div key={l.symbol} className="flex items-center gap-3 rounded-xl bg-black/30 px-3 py-2">
                    <TokenCoin symbol={l.symbol} size={30} glow={false} />
                    <span className="flex-1 font-display font-bold">
                      {l.symbol} <span className="text-white/50">{l.weight}%</span>
                      {v.frozen === l.symbol && <span className="ml-2 text-xs text-[#7fe9ff]">FROZEN</span>}
                    </span>
                    <span className={`font-display font-bold ${(v.moves[l.symbol] ?? 0) >= 0 ? "text-[#3dff8a]" : "text-[#ff3b5c]"}`}>
                      {pct(v.moves[l.symbol] ?? 0)}
                    </span>
                  </div>
                ))}
                <div className="text-xs text-white/40">{v.rebalancesLeft[s]} {v.rebalancesLeft[s] === 1 ? "rebalance" : "rebalances"} left</div>
              </div>
            ) : (
              <p className="text-sm text-white/50">
                {v.committed[s] ? "Committed: only its hash is on chain until the reveal." : "Drafting…"}
              </p>
            )}
          </Panel>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Mutations (VRF)">
          <ul className="space-y-1.5 text-sm">
            {v.mutations.map((m) => (
              <li key={m.index} className="flex justify-between rounded-lg bg-white/5 px-3 py-1.5">
                <span>{m.state === "applied" ? m.label : m.state === "drawing" ? "VRF drawing…" : "Hidden until it lands"}</span>
                <span className="font-mono text-white/40">t={m.at}s</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-white/40">{v.ticks} crank ticks so far</p>
        </Panel>

        <Panel title="On chain">
          <ul className="space-y-1.5 text-sm">
            <li>
              <a className="text-[#2de2ff]" href={explorerAddress(duelPda(v.id).toBase58())} target="_blank" rel="noreferrer">
                Duel account ↗
              </a>{" "}
              <span className="text-white/40">{live?.layer === "er" ? "(owned by the delegation program while live)" : ""}</span>
            </li>
            <li>
              <a className="text-[#2de2ff]" href={explorerAddress(PROGRAM_ID.toBase58())} target="_blank" rel="noreferrer">
                darwin_arena program ↗
              </a>
            </li>
            {trophy && (
              <li>
                <a className="text-[#ffc861]" href={explorerAddress(trophy)} target="_blank" rel="noreferrer">
                  Trophy minted by the winner ↗
                </a>
              </li>
            )}
          </ul>
          <h3 className="mb-1 mt-4 text-xs font-black uppercase text-white/50">Solana transactions</h3>
          <ul className="max-h-40 space-y-1 overflow-auto font-mono text-xs">
            {sigs.map((s) => (
              <li key={s.signature}>
                <a className="text-[#2de2ff]" href={explorerTx(s.signature)} target="_blank" rel="noreferrer">
                  {s.signature.slice(0, 20)}…
                </a>{" "}
                <span className="text-white/40">{s.blockTime ? new Date(s.blockTime * 1000).toLocaleTimeString() : ""}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="text-center">
        <Link href="/play" className="rounded-2xl bg-gradient-to-r from-[#ff3fb4] via-[#ff6a3d] to-[#ffc861] px-8 py-3 font-display font-bold uppercase text-[#1a0612]">
          Play your own race
        </Link>
      </div>
    </div>
  );
}
