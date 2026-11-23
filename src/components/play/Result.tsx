"use client";

// Étape 4 : SURVIVED / EXTINCT · scores · gain · Claim / Mint / Share / Rematch
// + aperçu de la carte de partage X (1200x675, générée plus tard en image).
import Link from "next/link";
import { PlayerCard } from "@/components/PlayerCard";
import { Panel, pct } from "@/components/ui";
import { OPPONENT, POINTS } from "@/lib/mock";
import { useProfile } from "@/lib/store";
import type { DuelOutcome } from "./Duel";

export function Result({ outcome, stake, onRematch }: { outcome: DuelOutcome; stake: number; onRematch: () => void }) {
  const { me } = useProfile();
  const won = outcome.myScore > outcome.oppScore;
  const draw = outcome.myScore === outcome.oppScore;
  const prize = (stake * 2 * 0.95).toFixed(2);

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
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Actions">
          <div className="grid grid-cols-2 gap-3">
            {won && <Action label="Claim" primary />}
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
