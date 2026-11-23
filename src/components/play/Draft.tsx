"use client";

// Étape 2 : le draft. On compose son panier en 60 s : 3 à 5 actifs, poids par pas de 5 %, total 100 %.
// Mise en page : en-tête (phase, chrono, adversaire qui drafte en caché) · panier à 5 emplacements
// · marché en cartes de jeu. "Lock basket" = commit du hash on-chain (mock).
import { useEffect, useMemo, useState } from "react";
import { GiPadlock, GiScales } from "react-icons/gi";
import { GameTimer, TimeDrain } from "@/components/game/GameTimer";
import { TokenCoin } from "@/components/game/TokenCoin";
import { Panel } from "@/components/ui";
import { ASSETS, DRAFT_SECONDS, OPPONENT } from "@/lib/mock";
import { formatPrice, sparkline, TOKEN_CLASSES, TOKENS, type TokenClass } from "@/lib/tokens";
import type { Asset, BasketLeg } from "@/lib/types";

const MIN_LEGS = 3;
const MAX_LEGS = 5;
const STEP = 5;

/** Répartit 100 % en pas de 5 entre n actifs (les premiers prennent le reste). */
function equalize(legs: BasketLeg[]): BasketLeg[] {
  const n = legs.length;
  if (!n) return legs;
  const base = Math.floor(100 / n / STEP) * STEP;
  let rest = 100 - base * n;
  return legs.map((l) => {
    const extra = rest > 0 ? STEP : 0;
    rest -= extra;
    return { ...l, weight: base + extra };
  });
}

export function Draft({ onLocked, initial = [] }: { onLocked: (basket: BasketLeg[]) => void; initial?: BasketLeg[] }) {
  const [legs, setLegs] = useState<BasketLeg[]>(initial);
  const [left, setLeft] = useState(DRAFT_SECONDS);
  const [filter, setFilter] = useState<TokenClass | "All">("All");
  const [oppPicks, setOppPicks] = useState(0);
  const total = legs.reduce((s, l) => s + l.weight, 0);
  const valid = legs.length >= MIN_LEGS && legs.length <= MAX_LEGS && total === 100;

  useEffect(() => {
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    // l'adversaire drafte en caché (mock)
    const o = setInterval(() => setOppPicks((p) => Math.min(4, p + 1)), 6500);
    return () => {
      clearInterval(t);
      clearInterval(o);
    };
  }, []);

  const toggle = (symbol: string) =>
    setLegs((ls) =>
      ls.some((l) => l.symbol === symbol)
        ? equalize(ls.filter((l) => l.symbol !== symbol))
        : ls.length < MAX_LEGS
          ? equalize([...ls, { symbol, weight: 0 }])
          : ls,
    );
  const nudge = (symbol: string, d: number) =>
    setLegs((ls) =>
      ls.map((l) => (l.symbol === symbol ? { ...l, weight: Math.max(STEP, Math.min(100, l.weight + d)) } : l)),
    );

  const market = useMemo(() => ASSETS.filter((a) => filter === "All" || TOKENS[a.symbol]?.klass === filter), [filter]);

  const lockHint =
    legs.length < MIN_LEGS
      ? `Pick ${MIN_LEGS - legs.length} more asset${MIN_LEGS - legs.length > 1 ? "s" : ""}`
      : total !== 100
        ? `Total must be 100% (now ${total}%)`
        : "Basket ready";

  return (
    <div className="space-y-5">
      {/* ---------- En-tête de phase ---------- */}
      <div className="relative grid items-center gap-5 overflow-hidden rounded-3xl border border-white/10 bg-[#120a24]/85 p-5 pb-6 backdrop-blur-xl md:grid-cols-[1fr_auto_1fr]">
        <div>
          <div className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-[#2de2ff]">Draft phase</div>
          <h1 className="font-display text-3xl font-bold uppercase">Build your basket</h1>
          <p className="mt-1 text-sm text-white/60">
            Pick {MIN_LEGS} to {MAX_LEGS} assets and split 100% between them. Your rival only sees your basket when the duel starts.
          </p>
        </div>
        <GameTimer left={left} total={DRAFT_SECONDS} label="Draft ends in" />
        <OpponentDrafting picks={oppPicks} />
        <TimeDrain left={left} total={DRAFT_SECONDS} />
      </div>

      {/* ---------- Panier ---------- */}
      <Panel
        title="Your basket"
        right={
          <button
            onClick={() => setLegs((ls) => equalize(ls))}
            disabled={!legs.length}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition hover:bg-white/10 disabled:opacity-40"
          >
            <GiScales className="h-4 w-4" /> Equalize
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: MAX_LEGS }, (_, i) => {
            const leg = legs[i];
            return leg ? (
              <BasketSlot key={leg.symbol} leg={leg} index={i} onNudge={nudge} onRemove={toggle} />
            ) : (
              <div
                key={`empty-${i}`}
                className="grid min-h-[168px] place-items-center rounded-2xl border border-dashed border-white/15 bg-black/20 text-center"
              >
                <div>
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-dashed border-white/25 font-display text-2xl text-white/40">
                    +
                  </div>
                  <div className="mt-2 font-display text-[11px] font-semibold uppercase tracking-widest text-white/40">
                    Slot {i + 1}
                    <span className="block text-white/25">{i < MIN_LEGS ? "Required" : "Optional"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Barre d'allocation aux couleurs des tokens */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between font-display text-xs font-semibold uppercase tracking-widest">
            <span className="text-white/50">Allocation</span>
            <span className={total === 100 ? "text-[#3dff8a]" : total > 100 ? "text-[#ff3b5c]" : "text-[#ffc861]"}>
              {total}% / 100%
            </span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
            {legs.map((l) => {
              const t = TOKENS[l.symbol];
              return (
                <div
                  key={l.symbol}
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(l.weight, 100)}%`,
                    background: `linear-gradient(90deg, ${t.color}, ${t.accent})`,
                    boxShadow: `inset -2px 0 0 #0b0716`,
                  }}
                  title={`${l.symbol} ${l.weight}%`}
                />
              );
            })}
          </div>
        </div>

        <button
          disabled={!valid}
          onClick={() => onLocked(legs)}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#ff3fb4] via-[#ff6a3d] to-[#ffc861] py-4 font-display text-xl font-bold uppercase tracking-wider text-[#1a0612] shadow-[0_10px_40px_-10px_#ff3fb4] transition hover:brightness-110 disabled:from-white/10 disabled:via-white/10 disabled:to-white/10 disabled:text-white/40 disabled:shadow-none"
        >
          <GiPadlock className="h-6 w-6" />
          {valid ? "Lock basket" : lockHint}
        </button>
      </Panel>

      {/* ---------- Marché ---------- */}
      <Panel
        title="Market"
        right={
          <div className="flex flex-wrap justify-end gap-1.5">
            {(["All", ...TOKEN_CLASSES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`rounded-full px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wider transition ${
                  filter === c ? "bg-white text-[#0b0716]" : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {market.map((a) => {
            const slot = legs.findIndex((l) => l.symbol === a.symbol);
            return (
              <TokenCard
                key={a.symbol}
                asset={a}
                slot={slot}
                full={legs.length >= MAX_LEGS && slot < 0}
                onClick={() => toggle(a.symbol)}
              />
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ================= Sous-composants ================= */

/** L'adversaire drafte : ses cartes arrivent face cachée */
function OpponentDrafting({ picks }: { picks: number }) {
  return (
    <div className="md:text-right">
      <div className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-[#ff3fb4]">
        {OPPONENT.name} is drafting
      </div>
      <div className="mt-2 flex gap-1.5 md:justify-end">
        {Array.from({ length: MAX_LEGS }, (_, i) => (
          <div
            key={i}
            className={`h-12 w-9 rounded-md border transition-all duration-500 ${
              i < picks ? "arena-pop border-[#ff3fb4]/70" : "border-dashed border-white/15"
            }`}
            style={
              i < picks
                ? {
                    background:
                      "repeating-linear-gradient(45deg, #3a0c3a 0 4px, #24082a 4px 8px), radial-gradient(circle, #ff3fb4 0 30%, transparent 31%)",
                    boxShadow: "0 0 12px -2px #ff3fb4",
                  }
                : undefined
            }
          >
            {i < picks && <div className="grid h-full place-items-center font-display text-sm font-bold text-[#ff3fb4]">?</div>}
          </div>
        ))}
      </div>
      <div className="mt-1 text-xs text-white/40">Hidden until the duel starts</div>
    </div>
  );
}

function BasketSlot({
  leg,
  index,
  onNudge,
  onRemove,
}: {
  leg: BasketLeg;
  index: number;
  onNudge: (s: string, d: number) => void;
  onRemove: (s: string) => void;
}) {
  const t = TOKENS[leg.symbol];
  return (
    <div
      className="arena-pop relative flex min-h-[168px] flex-col items-center rounded-2xl border p-3 text-center"
      style={{
        borderColor: `${t.color}aa`,
        background: `radial-gradient(100% 70% at 50% 0%, ${t.color}30, #0f0820 70%)`,
        boxShadow: `0 0 24px -10px ${t.color}`,
      }}
    >
      <span className="absolute left-2.5 top-2 font-display text-[10px] font-bold text-white/40">#{index + 1}</span>
      <button
        onClick={() => onRemove(leg.symbol)}
        className="absolute right-2 top-1.5 text-sm text-white/40 transition hover:text-white"
        aria-label={`Remove ${leg.symbol}`}
      >
        ✕
      </button>
      <TokenCoin symbol={leg.symbol} size={48} />
      <div className="mt-1.5 font-display text-sm font-bold">{leg.symbol}</div>
      <div className="font-display text-3xl font-bold leading-none" style={{ color: t.accent }}>
        {leg.weight}
        <span className="text-base">%</span>
      </div>
      <div className="mt-auto flex w-full gap-1.5 pt-2">
        {[-STEP, STEP].map((d) => (
          <button
            key={d}
            onClick={() => onNudge(leg.symbol, d)}
            className="flex-1 rounded-lg bg-white/10 py-1 font-display text-lg font-bold leading-none transition hover:bg-white/20 active:scale-95"
          >
            {d > 0 ? "+" : "−"}
          </button>
        ))}
      </div>
    </div>
  );
}

function Sparkline({ symbol, change }: { symbol: string; change: number }) {
  const pts = sparkline(symbol, change);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const W = 200;
  const H = 44;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * W, H - 4 - ((v - min) / (max - min || 1)) * (H - 8)]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const up = change >= 0;
  const color = up ? "#3dff8a" : "#ff3b5c";
  const gid = `spark-${symbol}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-11 w-full">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r="3" fill={color} />
    </svg>
  );
}

function TokenCard({ asset, slot, full, onClick }: { asset: Asset; slot: number; full: boolean; onClick: () => void }) {
  const t = TOKENS[asset.symbol];
  const picked = slot >= 0;
  const up = asset.change24h >= 0;
  return (
    <button
      onClick={onClick}
      disabled={full}
      className="group relative overflow-hidden rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
      style={{
        borderColor: picked ? t.color : "rgba(255,255,255,0.08)",
        background: `radial-gradient(120% 80% at 0% 0%, ${t.color}${picked ? "38" : "1c"}, #0f0820 65%)`,
        boxShadow: picked ? `0 0 0 1px ${t.color}, 0 0 32px -8px ${t.color}` : undefined,
      }}
    >
      {/* bande de couleur de marque */}
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${t.color}, ${t.accent})` }} />

      <div className="flex items-center gap-3">
        <TokenCoin symbol={asset.symbol} size={52} />
        <div className="min-w-0 flex-1">
          <div className="font-display text-2xl font-bold leading-none">{asset.symbol}</div>
          <div className="truncate text-sm text-white/55">{asset.name}</div>
        </div>
        {picked ? (
          <span
            className="rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-[#0b0716]"
            style={{ background: t.accent, boxShadow: `0 0 12px ${t.color}` }}
          >
            ✓ Slot {slot + 1}
          </span>
        ) : (
          <span
            className="rounded-full border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider"
            style={{ borderColor: `${t.color}66`, color: t.accent }}
          >
            {t.klass}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between">
        <span className="font-mono text-lg font-semibold">{formatPrice(asset.price)}</span>
        <span
          className={`rounded-md px-1.5 py-0.5 font-display text-sm font-bold ${
            up ? "bg-[#3dff8a]/10 text-[#3dff8a]" : "bg-[#ff3b5c]/10 text-[#ff3b5c]"
          }`}
        >
          {up ? "▲" : "▼"} {Math.abs(asset.change24h).toFixed(1)}%
        </span>
      </div>
      <Sparkline symbol={asset.symbol} change={asset.change24h} />

      {/* jauge de volatilité */}
      <div className="mt-2 flex items-center justify-between">
        <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-white/45">Volatility</span>
        <div className="flex gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className="h-2 w-4 rounded-sm"
              style={{
                background: i < t.volatility ? (t.volatility >= 4 ? "#ff3fb4" : "#2de2ff") : "rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </div>
      </div>

      {!picked && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent py-2 text-center font-display text-xs font-bold uppercase tracking-widest opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
          + Add to basket
        </div>
      )}
    </button>
  );
}
