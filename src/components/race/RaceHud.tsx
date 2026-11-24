"use client";

// HUD de la course (duel sur Wall Street) : pilotes, écart, frise avec mini voitures,
// paniers en direct, feux de départ, bannière de mutation, arrivée et résultat.
import Link from "next/link";
import { GiCheckeredFlag } from "react-icons/gi";
import { Avatar } from "@/components/PlayerCard";
import { RankEmblem } from "@/components/game/emblems";
import { Corners, GLASS } from "@/components/game/Hud";
import { TokenCoin } from "@/components/game/TokenCoin";
import { MUTATION_ART } from "@/components/play/Duel";
import { pct } from "@/components/ui";
import type { BasketLeg, MutationKind, Player } from "@/lib/types";

export const ME = "#2de2ff";
export const OPP = "#ff3fb4";

export interface RaceMutation {
  at: number;
  kind: MutationKind;
  label: string;
  drawn?: boolean;
}

/* ================= HUD ================= */

export function Driver({ player, score, color, lead, mirrored }: { player: Player; score: number; color: string; lead: boolean; mirrored?: boolean }) {
  const up = score >= 0;
  return (
    <div className={`${GLASS} flex min-w-0 items-center gap-3 rounded-2xl p-3 pr-5 transition ${mirrored ? "flex-row-reverse pl-5 pr-3 text-right" : ""}`} style={lead ? { borderColor: color + "88", boxShadow: `0 0 30px -10px ${color}` } : undefined}>
      <Corners color={color} />
      <div className="relative shrink-0">
        <Avatar player={player} size={48} />
        <div className={`absolute -bottom-1.5 ${mirrored ? "-left-1.5" : "-right-1.5"}`}>
          <RankEmblem tier={player.rank.tier} division={player.rank.division} size={22} />
        </div>
      </div>
      <div className="min-w-0">
        <div className={`flex items-center gap-2 ${mirrored ? "flex-row-reverse" : ""}`}>
          <span className="truncate font-display text-sm font-bold tracking-wide">{player.name}</span>
          {lead && (
            <span className="rounded px-1.5 py-px font-display text-[9px] font-bold uppercase tracking-widest text-[#0b0716]" style={{ background: color }}>
              P1
            </span>
          )}
        </div>
        <div className="font-display text-3xl font-bold leading-none tabular-nums" style={{ color: up ? "#3dff8a" : "#ff3b5c", textShadow: `0 0 18px ${up ? "#3dff8a" : "#ff3b5c"}55` }}>
          {pct(score)}
        </div>
      </div>
    </div>
  );
}

export function GapPill({ diff }: { diff: number }) {
  const even = Math.abs(diff) < 0.005;
  const color = even ? "#ffffff" : diff > 0 ? ME : OPP;
  return (
    <span className="rounded-full border bg-black/50 px-3 py-1 font-display text-xs font-bold uppercase tracking-widest backdrop-blur" style={{ borderColor: color + "66", color }}>
      {even ? "Neck and neck" : `${diff > 0 ? "You lead" : "Rival leads"} by ${Math.abs(diff).toFixed(2)}%`}
    </span>
  );
}

export function CarTag({ name, score, color, lead, you }: { name: string; score: number; color: string; lead: boolean; you?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2 whitespace-nowrap rounded-lg border bg-[#0b0716]/85 px-2.5 py-1 font-display text-[13px] font-bold backdrop-blur" style={{ borderColor: color, boxShadow: `0 0 16px -4px ${color}` }}>
        {lead && <GiCheckeredFlag className="h-3.5 w-3.5" style={{ color }} />}
        <span className="uppercase tracking-wider" style={{ color }}>
          {you ? "You" : name}
        </span>
        <span className={`tabular-nums ${score >= 0 ? "text-[#3dff8a]" : "text-[#ff3b5c]"}`}>{pct(score)}</span>
      </div>
      <span className="h-2 w-px" style={{ background: color }} />
    </div>
  );
}

/** Frise de course : départ, trois mutations, arrivée ; les deux pilotes s'y placent. */
export function RaceTrack({ t, total, diff, mutations }: { t: number; total: number; diff: number; mutations: RaceMutation[] }) {
  const base = (t / total) * 100;
  const off = Math.tanh(diff / 0.06) * 9; // mêmes réglages que la scène : l'écart se voit
  return (
    <div className={`${GLASS} mx-auto max-w-3xl rounded-2xl px-5 py-3`}>
      <div className="relative h-11">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10" />
        <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#2de2ff] via-[#ff3fb4] to-[#ffc861] transition-[width] duration-1000 ease-linear" style={{ width: `${base}%` }} />
        {mutations.map((m) => {
          const art = MUTATION_ART[m.kind];
          const done = (m.drawn ?? true) && t >= m.at;
          const Icon = art.icon;
          return (
            <div key={m.at} className="absolute top-1/2 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md border bg-[#0b0716] font-display text-[10px] font-bold" style={{ left: `${(m.at / total) * 100}%`, borderColor: done ? art.color : "rgba(255,255,255,0.2)", color: done ? art.color : "rgba(255,255,255,0.45)", boxShadow: done ? `0 0 10px ${art.color}88` : undefined }} title={done ? m.label : "Hidden mutation"}>
              {done ? <Icon className="h-3.5 w-3.5" /> : "?"}
            </div>
          );
        })}
        <GiCheckeredFlag className="absolute -right-1 top-1/2 h-5 w-5 -translate-y-1/2 text-white" />
        {[
          { c: OPP, o: -off / 2 },
          { c: ME, o: off / 2 },
        ].map(({ c, o }) => (
          <span key={c} className="absolute -translate-x-[70%] -translate-y-1/2 transition-[left] duration-1000 ease-linear" style={{ left: `${Math.max(0, Math.min(100, base + o))}%`, top: c === ME ? "22%" : "78%", zIndex: c === ME ? 2 : 1 }}>
            <MiniCar color={c} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Petite voiture de profil (vers la droite) pour la frise de course */
export function MiniCar({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 44 20" className="h-[18px] w-10 overflow-visible" style={{ filter: `drop-shadow(0 0 5px ${color})` }}>
      {/* traînée de vitesse */}
      <path d="M-10 9h8M-14 13h11" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      {/* carrosserie */}
      <path d="M2 14.5V11c0-1.2.8-2 2-2.3l6-1.3 6.5-4.2c.8-.5 1.6-.7 2.5-.7h7.5c1 0 1.9.4 2.6 1.1l3.9 3.9 6.3 1.4c1.5.3 2.7 1.7 2.7 3.2v2.4z" fill="#140a24" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      {/* vitres */}
      <path d="M17.5 4.6 13 8h10.5V4.2h-4.4c-.6 0-1.1.1-1.6.4zM25.5 4.2V8h8.6l-3-3c-.5-.5-1.1-.8-1.8-.8z" fill={color} opacity="0.55" />
      {/* aileron + feux */}
      <path d="M1 7.5h5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="40" y="10" width="2.5" height="1.8" rx=".6" fill="#fff6dc" />
      <rect x="2.3" y="10.6" width="2" height="1.8" rx=".6" fill="#ff2a55" />
      {/* roues */}
      {[11, 34].map((x) => (
        <g key={x}>
          <circle cx={x} cy="15" r="4" fill="#05030a" stroke={color} strokeWidth="1.4" />
          <circle cx={x} cy="15" r="1.3" fill={color} />
        </g>
      ))}
    </svg>
  );
}

export function BasketStrip({ title, basket, moves, color, frozen, doubled, mirrored }: { title: string; basket: BasketLeg[]; moves: Record<string, number>; color: string; frozen?: string; doubled: string[]; mirrored?: boolean }) {
  return (
    <div className={`${GLASS} rounded-2xl px-4 py-3 ${mirrored ? "md:text-right" : ""}`}>
      <div className={`mb-2 flex items-center gap-2 font-display text-[10px] font-bold uppercase tracking-[0.25em] text-white/50 ${mirrored ? "md:flex-row-reverse" : ""}`}>
        <span className="h-1.5 w-5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        {title}
      </div>
      <div className={`flex gap-2 ${mirrored ? "md:flex-row-reverse" : ""}`}>
        {basket.map((l) => {
          const mv = moves[l.symbol] ?? 0;
          const isF = frozen === l.symbol;
          const isD = doubled.includes(l.symbol);
          return (
            <div key={l.symbol} className="relative flex flex-1 flex-col items-center rounded-xl border px-1 py-1.5" style={{ borderColor: isF ? "#7fe9ff88" : isD ? "#ffc86188" : "rgba(255,255,255,0.06)", background: isF ? "rgba(127,233,255,0.1)" : "rgba(15,8,32,0.6)" }}>
              {isD && <span className="absolute -top-2 right-0 rounded bg-[#ffc861] px-1 font-display text-[9px] font-bold text-[#1a0c02]">x2</span>}
              <TokenCoin symbol={l.symbol} size={28} glow={false} />
              <span className="mt-1 font-display text-[10px] font-bold text-white/60">{l.weight}%</span>
              <span className={`font-display text-xs font-bold tabular-nums ${isF ? "text-[#7fe9ff]" : mv >= 0 ? "text-[#3dff8a]" : "text-[#ff3b5c]"}`}>{isF ? "ice" : pct(mv)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StartLights({ count }: { count: number }) {
  const go = count === 0;
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-5">
        <div className={`${GLASS} flex gap-4 rounded-2xl px-6 py-4`}>
          <Corners color={go ? "#3dff8a" : "#ff3b5c"} />
          {[3, 2, 1].map((n) => {
            const on = go || count <= n;
            const c = go ? "#3dff8a" : "#ff3b5c";
            return <span key={n} className="h-9 w-9 rounded-full transition-all duration-200" style={{ background: on ? c : "rgba(255,255,255,0.08)", boxShadow: on ? `0 0 24px ${c}, inset 0 -4px 8px rgba(0,0,0,0.3)` : undefined }} />;
          })}
        </div>
        <span key={count} className="arena-pop font-display text-8xl font-bold italic leading-none" style={{ color: go ? "#3dff8a" : "#fff", textShadow: `0 0 40px ${go ? "#3dff8a" : "#ff3fb4"}` }}>
          {go ? "GO" : count}
        </span>
      </div>
    </div>
  );
}

export function MutationBanner({ m }: { m: RaceMutation }) {
  const art = MUTATION_ART[m.kind];
  const Icon = art.icon;
  return (
    <div className="arena-pop pointer-events-none absolute inset-x-0 top-[38%] flex justify-center">
      <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl border bg-[#0b0716]/90 px-6 py-4 backdrop-blur-xl" style={{ borderColor: art.color, boxShadow: `0 0 60px -10px ${art.color}` }}>
        <Corners color={art.color} />
        <div className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: art.color + "22", color: art.color }}>
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <div className="font-display text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: art.color }}>
            Mutation drawn by VRF
          </div>
          <div className="font-display text-2xl font-bold uppercase italic leading-tight">{m.label}</div>
        </div>
      </div>
    </div>
  );
}

/** Passage de la ligne : la course se voile, le verdict tombe, puis le podium prend le relais. */
export function FinishFlash({ win }: { win: boolean }) {
  const c = win ? ME : OPP;
  return (
    <div className="race-veil pointer-events-none absolute inset-0 z-30 grid place-items-center">
      <div className="arena-pop flex flex-col items-center text-center">
        <div className="race-checker h-3 w-48 opacity-70" />
        <GiCheckeredFlag className="mt-4 h-14 w-14 text-white drop-shadow-[0_0_20px_#ffc861]" />
        <span className="mt-3 font-display text-6xl font-bold uppercase italic leading-none sm:text-7xl" style={{ color: c, textShadow: `0 0 40px ${c}` }}>
          {win ? "You cross first" : "Rival crosses first"}
        </span>
        <span className="mt-4 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Heading to the podium
        </span>
      </div>
    </div>
  );
}

export function ResultCard({ win, my, opp, onAgain }: { win: boolean; my: number; opp: number; onAgain: () => void }) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-[#0b0716]/60 backdrop-blur-sm">
      <div className={`${GLASS} arena-pop w-[min(92vw,440px)] rounded-3xl p-7 text-center`}>
        <Corners color={win ? "#ffc861" : OPP} size={14} />
        <div className="font-display text-xs font-bold uppercase tracking-[0.35em] text-white/50">Duel over</div>
        <div
          className="mt-2 bg-clip-text font-display text-6xl font-bold uppercase italic leading-none text-transparent"
          style={{ backgroundImage: win ? "linear-gradient(90deg,#2de2ff,#ff3fb4,#ffc861)" : "linear-gradient(90deg,#ff3fb4,#ff3b5c)" }}
        >
          {win ? "Victory" : "Defeat"}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { l: "You", v: my, c: ME },
            { l: "Rival", v: opp, c: OPP },
          ].map((x) => (
            <div key={x.l} className="rounded-2xl border border-white/10 bg-black/30 py-3">
              <div className="font-display text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: x.c }}>
                {x.l}
              </div>
              <div className={`font-display text-3xl font-bold tabular-nums ${x.v >= 0 ? "text-[#3dff8a]" : "text-[#ff3b5c]"}`}>{pct(x.v)}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onAgain} className="flex-1 rounded-2xl bg-gradient-to-r from-[#ff3fb4] via-[#ff6a3d] to-[#ffc861] py-3.5 font-display text-lg font-bold uppercase tracking-wider text-[#1a0612] shadow-[0_10px_30px_-10px_#ff3fb4] transition hover:brightness-110">
            Race again
          </button>
          <Link href="/menu" className="grid place-items-center rounded-2xl border border-white/15 bg-white/5 px-5 font-display font-bold uppercase tracking-wider transition hover:bg-white/10">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
