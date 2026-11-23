"use client";

// Étape 4 : SURVIVED / EXTINCT · scores · gain · Claim / Mint / Share / Rematch
// + aperçu de la carte de partage X (1200x675, générée plus tard en image).
// Le vainqueur vient du duel on-chain ; "Claim" force le règlement sur Solana si le
// keeper ne l'a pas déjà fait (finish sur le rollup puis settle).
import Link from "next/link";
import { useEffect, useState } from "react";
import { useArena, type LiveDuel } from "@/lib/chain/ArenaProvider";
import { STATUS } from "@/lib/chain/constants";
import { usePlayer } from "@/lib/chain/hooks";
import { PlayerCard } from "@/components/PlayerCard";
import { Panel, pct } from "@/components/ui";
import { POINTS } from "@/lib/mock";
import { useProfile } from "@/lib/store";
import type { DuelOutcome } from "./Duel";

export function Result({
  outcome,
  stake,
  onRematch,
  live = null,
}: {
  outcome: DuelOutcome;
  stake: number;
  onRematch: () => void;
  live?: LiveDuel | null;
}) {
  const { me } = useProfile();
  const { claim, currentDuel, refresh } = useArena();
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const view = live?.view;
  const mySlot = live?.mySlot ?? 0;
  const OPPONENT = usePlayer(view?.players[mySlot === 0 ? 1 : 0]) ?? { name: "Rival" };
  // The chain decides: winner 0/1, 2 = draw.
  const won = view && view.winner !== 255 ? view.winner === mySlot : outcome.myScore > outcome.oppScore;
  const draw = view && view.winner !== 255 ? view.winner === 2 : outcome.myScore === outcome.oppScore;
  const settled = view?.status === STATUS.SETTLED && live?.layer === "base";
  const prize = (stake * 2 * 0.95).toFixed(2);
  // Balance and rank change the moment the duel is settled.
  useEffect(() => {
    if (settled) refresh();
  }, [settled, refresh]);
  const onClaim = async () => {
    if (currentDuel === null) return;
    setClaiming(true);
    setClaimMsg(null);
    try {
      const sig = await claim(currentDuel);
      setClaimMsg(sig ? "Paid out on Solana" : "Already settled");
    } catch (e) {
      setClaimMsg(String((e as Error).message).slice(0, 120));
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-neutral-900 py-10 text-center">
        <div className={`text-7xl font-black italic ${won ? "text-green-400" : draw ? "text-amber-400" : "text-red-400"}`}>
          {draw ? "DRAW" : won ? "SURVIVED" : "EXTINCT"}
        </div>
        <div className="mt-3 text-2xl font-black">
          {pct(outcome.myScore)} <span className="text-base text-neutral-400">vs</span> {pct(outcome.oppScore)}
        </div>
        <div className="mt-2 text-neutral-400">
          {draw ? (
            "Stake refunded"
          ) : (
            <span className="flex justify-center gap-4">
              <span>{won ? `+${prize}` : `-${stake}`} USDC</span>
              <span>{won ? `+${POINTS.win}` : POINTS.loss} PTS</span>
            </span>
          )}
        </div>
        <div className="mt-2 text-xs uppercase tracking-widest text-neutral-500">
          {settled
            ? "Settled on Solana · profile updated"
            : view?.status === STATUS.FINISHED
              ? live?.layer === "er"
                ? "Committing the duel back to Solana…"
                : "Settling on Solana…"
              : "Waiting for the final tick…"}
          {view?.forfeit && " · forfeit (a basket was never revealed)"}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Actions">
          <div className="grid grid-cols-2 gap-3">
            {(won || draw) && (
              <Action label={settled ? "Paid ✓" : claiming ? "Claiming…" : claimMsg ?? "Claim"} primary onClick={settled ? undefined : onClaim} />
            )}
            <Action label="Mint this basket" />
            <Action label="Share on X" />
            <Action label="Rematch" onClick={onRematch} />
            <Link href="/menu" className="col-span-2 rounded-2xl bg-neutral-800 py-3 text-center font-black uppercase">
              Back to dashboard
            </Link>
          </div>
        </Panel>

        {/* Aperçu de la carte de partage */}
        <Panel title="Share card">
          <div className="aspect-[16/9] rounded-2xl border border-neutral-700 bg-neutral-950 p-4">
            <div className="mb-2 text-xs font-black uppercase text-neutral-400">Darwin Arena</div>
            <PlayerCard player={me} />
            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="text-3xl font-black">{pct(outcome.myScore)}</div>
                <div className="text-xs text-neutral-400">
                  {won ? "Survived" : "Extinct"} vs {OPPONENT.name}
                </div>
              </div>
              <div className="text-right text-xs text-neutral-400">
                <div className="flex flex-wrap justify-end gap-1.5">
                  {outcome.myBasket.map((l) => (
                    <span key={l.symbol} className="rounded-md bg-white/10 px-1.5 py-0.5">
                      {l.symbol} {l.weight}%
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Action({ label, primary, onClick }: { label: string; primary?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl py-3 font-black uppercase ${primary ? "bg-amber-500 text-black" : "bg-neutral-800"}`}
    >
      {label}
    </button>
  );
}
