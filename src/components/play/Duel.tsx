"use client";

// Pièces partagées du duel (l'écran de duel lui-même est la course : components/race/RaceDuel.tsx).
import { useState } from "react";
import { GiChemicalDrop, GiCycle, GiPadlock, GiSnowflake1 } from "react-icons/gi";
import type { IconType } from "react-icons";
import { TokenCoin } from "@/components/game/TokenCoin";
import { TOKENS } from "@/lib/tokens";
import type { BasketLeg, Mutation, MutationKind } from "@/lib/types";

export const MUTATION_ART: Record<MutationKind, { icon: IconType; color: string; title: string }> = {
  DOUBLE: { icon: GiChemicalDrop, color: "#ffc861", title: "Double weight" },
  FREEZE: { icon: GiSnowflake1, color: "#7fe9ff", title: "Freeze" },
  SWAP: { icon: GiCycle, color: "#c07bff", title: "Swap" },
};

export interface DuelOutcome {
  myScore: number;
  oppScore: number;
  myBasket: BasketLeg[];
}



export function MutationToast({ mutation }: { mutation: Mutation }) {
  const art = MUTATION_ART[mutation.kind];
  const Icon = art.icon;
  return (
    <div className="arena-toast pointer-events-none fixed bottom-6 right-6 z-40 w-80">
      <div
        className="relative overflow-hidden rounded-2xl border bg-[#0b0716]/95 p-4 backdrop-blur-xl"
        style={{ borderColor: art.color, boxShadow: `0 0 40px -8px ${art.color}` }}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: `${art.color}22`, color: art.color }}>
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <div className="font-display text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: art.color }}>
              Mutation
            </div>
            <div className="font-display text-lg font-bold leading-tight">{mutation.label}</div>
          </div>
        </div>
        {/* durée d'affichage */}
        <div className="arena-toast-bar absolute inset-x-0 bottom-0 h-0.5" style={{ background: art.color }} />
      </div>
    </div>
  );
}

export function RebalanceSheet({
  basket,
  frozen,
  onCancel,
  onConfirm,
}: {
  basket: BasketLeg[];
  frozen?: string;
  onCancel: () => void;
  onConfirm: (b: BasketLeg[]) => void;
}) {
  const [legs, setLegs] = useState(basket);
  const total = legs.reduce((s, l) => s + l.weight, 0);
  const nudge = (symbol: string, d: number) =>
    setLegs((ls) => ls.map((x) => (x.symbol === symbol ? { ...x, weight: Math.max(5, Math.min(100, x.weight + d)) } : x)));
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 backdrop-blur-sm md:place-items-center" onClick={onCancel}>
      <div
        className="arena-pop w-full max-w-md rounded-t-3xl border border-white/10 bg-[#120a24] p-6 md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold uppercase tracking-wider">Rebalance</h3>
          <span className={`font-display font-bold ${total === 100 ? "text-[#3dff8a]" : "text-[#ffc861]"}`}>{total}% of 100%</span>
        </div>
        {legs.map((l) => {
          const locked = frozen === l.symbol;
          return (
            <div key={l.symbol} className="mb-2.5 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
              <TokenCoin symbol={l.symbol} size={32} glow={false} />
              <span className="flex-1 font-display font-bold">{l.symbol}</span>
              {locked ? (
                <span className="flex items-center gap-1 font-display text-xs font-bold uppercase text-[#7fe9ff]">
                  <GiPadlock className="h-3.5 w-3.5" /> Frozen
                </span>
              ) : (
                <>
                  <button onClick={() => nudge(l.symbol, -5)} className="h-8 w-8 rounded-lg bg-white/10 font-bold hover:bg-white/20">
                    −
                  </button>
                  <span className="w-12 text-center font-display text-lg font-bold" style={{ color: TOKENS[l.symbol]?.accent }}>
                    {l.weight}%
                  </span>
                  <button onClick={() => nudge(l.symbol, 5)} className="h-8 w-8 rounded-lg bg-white/10 font-bold hover:bg-white/20">
                    +
                  </button>
                </>
              )}
            </div>
          );
        })}
        <div className="mt-4 flex gap-3">
          <button onClick={onCancel} className="rounded-2xl border border-white/15 px-5 font-display font-bold uppercase">
            Cancel
          </button>
          <button
            disabled={total !== 100}
            onClick={() => onConfirm(legs)}
            className="flex-1 rounded-2xl bg-gradient-to-r from-[#ffc861] to-[#ff8a3d] py-3 font-display font-bold uppercase tracking-wider text-[#1a0c02] disabled:opacity-40"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
