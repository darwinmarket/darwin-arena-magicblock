"use client";

// Étape 3 : le duel en direct.
// HUD : les deux joueurs, leur score en gros, le chrono, la barre de domination.
// Courbe live des deux scores avec les mutations sur la frise. Paniers détaillés des deux côtés.
// Les mutations arrivent en notification sur le côté : elles ne bloquent jamais l'écran.
// Tout vient du compte Duel délégué au rollup MagicBlock : le crank on-chain le fait
// avancer chaque seconde avec les prix Pyth Lazer, les mutations sont tirées par le VRF,
// les rééquilibrages sont signés par la clé de session (sans popup, sans frais).
import { useEffect, useRef, useState } from "react";
import { GiChemicalDrop, GiPadlock, GiScales, GiSnowflake1, GiCycle } from "react-icons/gi";
import type { IconType } from "react-icons";
import { Avatar } from "@/components/PlayerCard";
import { GameTimer, TimeDrain, fmtClock } from "@/components/game/GameTimer";
import { RankEmblem } from "@/components/game/emblems";
import { TokenCoin } from "@/components/game/TokenCoin";
import { Panel, pct } from "@/components/ui";
import { useArena, type LiveDuel } from "@/lib/chain/ArenaProvider";
import { MUTATION_AT } from "@/lib/chain/constants";
import { toLegs, toWeights } from "@/lib/chain/duel";
import { usePlayer } from "@/lib/chain/hooks";
import { ASSETS, DUEL_SECONDS, MAX_REBALANCES } from "@/lib/mock";
import { useProfile } from "@/lib/store";
import { TOKENS } from "@/lib/tokens";
import type { BasketLeg, Mutation, MutationKind, Player } from "@/lib/types";

const ME_COLOR = "#2de2ff";
const OPP_COLOR = "#ff3fb4";

/** Mutation on the timeline: drawn (VRF answered) or still hidden. */
type TimelineMutation = Mutation & { drawn: boolean };

const MUTATION_ART: Record<MutationKind, { icon: IconType; color: string; title: string }> = {
  DOUBLE: { icon: GiChemicalDrop, color: "#ffc861", title: "Double weight" },
  FREEZE: { icon: GiSnowflake1, color: "#7fe9ff", title: "Freeze" },
  SWAP: { icon: GiCycle, color: "#c07bff", title: "Swap" },
};

export interface DuelOutcome {
  myScore: number;
  oppScore: number;
  myBasket: BasketLeg[];
}

interface FeedItem {
  t: number;
  text: string;
  tone: "info" | "mutation" | "me";
}


export function Duel({
  basket,
  stake,
  onEnd,
  live = null,
}: {
  basket: BasketLeg[];
  stake: number;
  onEnd: (o: DuelOutcome) => void;
  live?: LiveDuel | null;
}) {
  const { me } = useProfile();
  const { rebalance: sendRebalance, currentDuel } = useArena();
  const view = live?.view;
  const mySlot = live?.mySlot ?? 0;
  const oppSlot = mySlot === 0 ? 1 : 0;
  const OPPONENT = usePlayer(view?.players[oppSlot]) ?? { ...me, id: "rival", name: "Rival" };
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [history, setHistory] = useState<{ t: number; my: number; opp: number }[]>([{ t: 0, my: 0, opp: 0 }]);
  const [toast, setToast] = useState<Mutation | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([{ t: 0, text: "Duel started on the Ephemeral Rollup, baskets revealed", tone: "info" }]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ended = useRef(false);
  const seen = useRef<Set<number>>(new Set());

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 500);
    return () => clearInterval(t);
  }, []);

  // Everything below is read from the duel account on the rollup.
  const elapsed = view?.startTs ? Math.max(0, Math.min(DUEL_SECONDS, now - view.startTs)) : 0;
  const moves = view?.moves ?? {};
  const myBasket = view ? toLegs(view.weights[mySlot]) : basket;
  const OPP_BASKET = view ? toLegs(view.weights[oppSlot]) : [];
  const my = view?.score[mySlot] ?? 0;
  const opp = view?.score[oppSlot] ?? 0;
  const rebalances = view?.rebalancesLeft[mySlot] ?? MAX_REBALANCES;
  const frozen = view?.frozen ?? undefined;
  const doubled = view ? ASSETS.filter((_, i) => view.mult[i] > 1).map((a) => a.symbol) : [];
  const MUTATIONS: TimelineMutation[] = (view?.mutations ?? []).map((m, i) =>
    m.state === "applied"
      ? { at: m.at, kind: m.kind!, symbol: m.symbol!, label: m.label!, drawn: true }
      : { at: MUTATION_AT[i], kind: "DOUBLE", symbol: "", label: m.state === "drawing" ? "VRF drawing…" : "Hidden mutation", drawn: false },
  );

  // Historique pour la courbe (un point par seconde de duel)
  useEffect(() => {
    setHistory((h) => (h[h.length - 1].t === elapsed ? h : [...h, { t: elapsed, my, opp }]));
  }, [elapsed, my, opp]);

  // Cartes mutation (VRF on-chain) : notification + fil d'événements dès qu'elles tombent
  useEffect(() => {
    view?.mutations.forEach((m, i) => {
      if (m.state !== "applied" || seen.current.has(i)) return;
      seen.current.add(i);
      const mut: Mutation = { at: m.at, kind: m.kind!, symbol: m.symbol!, label: m.label! };
      setToast(mut);
      setFeed((f) => [{ t: m.at, text: `${m.label} (VRF)`, tone: "mutation" }, ...f]);
      setTimeout(() => setToast(null), 4000);
    });
  }, [view]);

  useEffect(() => {
    if (view && view.status >= 3 && !ended.current) {
      ended.current = true;
      onEnd({ myScore: my, oppScore: opp, myBasket: toLegs(view.startWeights[mySlot]) });
    }
  }, [view, my, opp, mySlot, onEnd]);

  const left = DUEL_SECONDS - elapsed;
  const diff = my - opp;

  return (
    <div className="space-y-5">
      {/* ================= HUD ================= */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#120a24]/90 p-5 pb-6 backdrop-blur-xl">
        <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
          <Fighter player={me} total={my} color={ME_COLOR} leading={diff > 0} />
          <div className="flex flex-col items-center gap-2">
            <GameTimer left={left} total={DUEL_SECONDS} label="Duel ends in" />
            <span className="rounded-full border border-[#ffc861]/40 bg-[#ffc861]/10 px-3 py-0.5 font-display text-xs font-bold uppercase tracking-widest text-[#ffc861]">
              Pot {(stake * 2 * 0.95).toFixed(2)} USDC
            </span>
          </div>
          <Fighter player={OPPONENT} total={opp} color={OPP_COLOR} leading={diff < 0} mirrored />
        </div>
        <TugOfWar diff={diff} />
        <TimeDrain left={left} total={DUEL_SECONDS} />
      </div>

      {/* ================= Courbe live ================= */}
      <Panel
        title="Live score"
        right={
          <div className="flex items-center gap-4 font-display text-xs font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full" style={{ background: ME_COLOR }} /> {me.name}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full" style={{ background: OPP_COLOR }} /> {OPPONENT.name}
            </span>
          </div>
        }
      >
        <ScoreChart history={history} elapsed={elapsed} mutations={MUTATIONS} />
      </Panel>

      {/* ================= Paniers ================= */}
      <div className="grid gap-5 md:grid-cols-2">
        <BasketBoard title="Your basket" basket={myBasket} moves={moves} color={ME_COLOR} frozen={frozen} doubled={doubled} />
        <BasketBoard
          title={`${OPPONENT.name}'s basket`}
          basket={OPP_BASKET}
          moves={moves}
          color={OPP_COLOR}
          frozen={frozen}
          doubled={doubled}
        />
      </div>

      {/* ================= Actions + fil ================= */}
      <div className="grid gap-5 md:grid-cols-[1fr_1.4fr]">
        <Panel
          title="Rebalance"
          right={
            <div className="flex gap-1.5">
              {Array.from({ length: MAX_REBALANCES }, (_, i) => (
                <span
                  key={i}
                  className="h-2.5 w-6 rounded-full"
                  style={{ background: i < rebalances ? "#ffc861" : "rgba(255,255,255,0.1)", boxShadow: i < rebalances ? "0 0 8px #ffc861" : undefined }}
                />
              ))}
            </div>
          }
        >
          <p className="mb-4 text-sm text-white/55">
            Shift your weights once the market turns. {rebalances} {rebalances === 1 ? "move" : "moves"} left this duel.
          </p>
          {error && <p className="mb-3 text-sm text-[#ff3b5c]">{error}</p>}
          <button
            disabled={rebalances === 0}
            onClick={() => setEditing(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffc861] to-[#ff8a3d] py-3.5 font-display text-lg font-bold uppercase tracking-wider text-[#1a0c02] shadow-[0_10px_30px_-10px_#ffc861] transition hover:brightness-110 disabled:from-white/10 disabled:to-white/10 disabled:text-white/40 disabled:shadow-none"
          >
            <GiScales className="h-5 w-5" /> Rebalance
          </button>
        </Panel>

        <Panel title="Arena feed">
          <ul className="max-h-36 space-y-1.5 overflow-auto pr-1">
            {feed.map((f, i) => (
              <li key={i} className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm ${i === 0 ? "bg-white/5" : ""}`}>
                <span className="font-mono text-xs text-white/40">{fmtClock(f.t)}</span>
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: f.tone === "mutation" ? "#ffc861" : f.tone === "me" ? ME_COLOR : "rgba(255,255,255,0.4)" }}
                />
                <span className={f.tone === "mutation" ? "font-semibold text-[#ffc861]" : "text-white/80"}>{f.text}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Notification de mutation : sur le côté, ne bloque pas l'écran */}
      {toast && <MutationToast mutation={toast} />}

      {editing && (
        <RebalanceSheet
          basket={myBasket}
          frozen={frozen}
          onCancel={() => setEditing(false)}
          onConfirm={async (b) => {
            setEditing(false);
            if (currentDuel === null) return;
            try {
              await sendRebalance(currentDuel, toWeights(b));
              setFeed((f) => [{ t: elapsed, text: "You rebalanced your basket (rollup, no fee)", tone: "me" }, ...f]);
            } catch (e) {
              setError(String((e as Error).message).slice(0, 160));
            }
          }}
        />
      )}
    </div>
  );
}

/* ================= Sous-composants ================= */

function Fighter({
  player,
  total,
  color,
  leading,
  mirrored,
}: {
  player: Player;
  total: number;
  color: string;
  leading: boolean;
  mirrored?: boolean;
}) {
  const up = total >= 0;
  return (
    <div className={`flex items-center gap-4 ${mirrored ? "flex-row-reverse text-right" : ""}`}>
      <div className="relative">
        <Avatar player={player} size={64} />
        <div className={`absolute -bottom-2 ${mirrored ? "-left-2" : "-right-2"}`}>
          <RankEmblem tier={player.rank.tier} division={player.rank.division} size={30} />
        </div>
      </div>
      <div className="min-w-0">
        <div className={`flex items-center gap-2 ${mirrored ? "flex-row-reverse" : ""}`}>
          <span className="truncate font-display text-lg font-bold">{player.name}</span>
          {leading && (
            <span
              className="rounded-md px-1.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest text-[#0b0716]"
              style={{ background: color }}
            >
              Leading
            </span>
          )}
        </div>
        <div
          className="font-display text-5xl font-bold tabular-nums leading-none transition-colors"
          style={{ color: up ? "#3dff8a" : "#ff3b5c", textShadow: `0 0 24px ${up ? "#3dff8a" : "#ff3b5c"}55` }}
        >
          {pct(total)}
        </div>
      </div>
    </div>
  );
}

/** Barre de domination : le curseur glisse vers le joueur qui perd */
function TugOfWar({ diff }: { diff: number }) {
  const lead = Math.max(-1, Math.min(1, diff / 2)); // ±2 % = domination totale
  const split = 50 + lead * 50;
  return (
    <div className="mt-5">
      <div className="relative h-3 rounded-full bg-white/5">
        <div
          className="absolute inset-y-0 left-0 rounded-l-full transition-all duration-700"
          style={{ width: `${split}%`, background: `linear-gradient(90deg, ${ME_COLOR}22, ${ME_COLOR})` }}
        />
        <div
          className="absolute inset-y-0 right-0 rounded-r-full transition-all duration-700"
          style={{ width: `${100 - split}%`, background: `linear-gradient(270deg, ${OPP_COLOR}22, ${OPP_COLOR})` }}
        />
        <div
          className="absolute top-1/2 grid h-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-[#0b0716] px-2 font-display text-[11px] font-bold tabular-nums shadow-[0_0_16px_rgba(255,255,255,0.6)] transition-all duration-700"
          style={{ left: `${split}%` }}
        >
          {diff === 0 ? "EVEN" : `${diff > 0 ? "+" : ""}${diff.toFixed(2)}%`}
        </div>
      </div>
    </div>
  );
}

function ScoreChart({
  history,
  elapsed,
  mutations: MUTATIONS,
}: {
  history: { t: number; my: number; opp: number }[];
  elapsed: number;
  mutations: TimelineMutation[];
}) {
  const W = 1000;
  const H = 220;
  const PAD = 8;
  const vals = history.flatMap((p) => [p.my, p.opp]);
  const ext = Math.max(1, ...vals.map(Math.abs)) * 1.15;
  const x = (t: number) => (t / DUEL_SECONDS) * W;
  const y = (v: number) => H / 2 - (v / ext) * (H / 2 - PAD);
  const path = (k: "my" | "opp") => history.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p[k]).toFixed(1)}`).join(" ");
  const area = (k: "my" | "opp") => `${path(k)} L${x(history[history.length - 1].t)} ${H / 2} L0 ${H / 2} Z`;
  const last = history[history.length - 1];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-56 w-full">
        <defs>
          {[["me", ME_COLOR], ["opp", OPP_COLOR]].map(([id, c]) => (
            <linearGradient key={id} id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={c} stopOpacity="0.28" />
              <stop offset="0.5" stopColor={c} stopOpacity="0" />
              <stop offset="1" stopColor={c} stopOpacity="0.28" />
            </linearGradient>
          ))}
        </defs>
        {/* grille */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={W * f} x2={W * f} y1="0" y2={H} stroke="rgba(255,255,255,0.05)" />
        ))}
        <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="rgba(255,255,255,0.25)" strokeDasharray="6 6" />
        {/* mutations sur la frise */}
        {MUTATIONS.map((m) => {
          const art = MUTATION_ART[m.kind];
          const done = m.drawn && m.at <= elapsed;
          return (
            <line
              key={m.at}
              x1={x(m.at)}
              x2={x(m.at)}
              y1="0"
              y2={H}
              stroke={done ? art.color : "rgba(255,255,255,0.18)"}
              strokeDasharray="4 5"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        <path d={area("opp")} fill="url(#area-opp)" />
        <path d={area("my")} fill="url(#area-me)" />
        <path d={path("opp")} fill="none" stroke={OPP_COLOR} strokeWidth="2.5" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 4px ${OPP_COLOR})` }} />
        <path d={path("my")} fill="none" stroke={ME_COLOR} strokeWidth="2.5" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 4px ${ME_COLOR})` }} />
        {/* curseur du temps */}
        <line x1={x(elapsed)} x2={x(elapsed)} y1="0" y2={H} stroke="rgba(255,255,255,0.35)" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* points de tête (en HTML pour rester ronds malgré l'étirement du SVG) */}
      {(["my", "opp"] as const).map((k) => (
        <span
          key={k}
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0b0716]"
          style={{
            left: `${(last.t / DUEL_SECONDS) * 100}%`,
            top: `${(y(last[k]) / H) * 100}%`,
            background: k === "my" ? ME_COLOR : OPP_COLOR,
            boxShadow: `0 0 10px ${k === "my" ? ME_COLOR : OPP_COLOR}`,
          }}
        />
      ))}

      {/* icônes des mutations : masquées tant qu'elles ne sont pas tombées */}
      {MUTATIONS.map((m) => {
        const art = MUTATION_ART[m.kind];
        const done = m.drawn && m.at <= elapsed;
        const Icon = art.icon;
        return (
          <div
            key={m.at}
            className="absolute -top-1 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-lg border bg-[#0b0716] font-display text-xs font-bold"
            style={{
              left: `${(m.at / DUEL_SECONDS) * 100}%`,
              borderColor: done ? art.color : "rgba(255,255,255,0.2)",
              color: done ? art.color : "rgba(255,255,255,0.4)",
              boxShadow: done ? `0 0 12px ${art.color}88` : undefined,
            }}
            title={done ? m.label : "Hidden mutation"}
          >
            {done ? <Icon className="h-4 w-4" /> : "?"}
          </div>
        );
      })}

      <div className="mt-1 flex justify-between font-mono text-[11px] text-white/35">
        <span>0:00</span>
        <span>{fmtClock(DUEL_SECONDS / 2)}</span>
        <span>{fmtClock(DUEL_SECONDS)}</span>
      </div>
    </div>
  );
}

function BasketBoard({
  title,
  basket,
  moves,
  color,
  frozen,
  doubled,
}: {
  title: string;
  basket: BasketLeg[];
  moves: Record<string, number>;
  color: string;
  frozen?: string;
  doubled: string[];
}) {
  const maxContrib = Math.max(0.3, ...basket.map((l) => Math.abs((l.weight / 100) * (moves[l.symbol] ?? 0))));
  return (
    <Panel title={title} className="!pb-4" right={<span className="h-2 w-8 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />}>
      <div className="space-y-2">
        {basket.map((l) => {
          const a = ASSETS.find((x) => x.symbol === l.symbol)!;
          const mv = moves[l.symbol] ?? 0;
          const contrib = (l.weight / 100) * mv;
          const up = mv >= 0;
          const isFrozen = frozen === l.symbol;
          const isDoubled = doubled.includes(l.symbol);
          return (
            <div
              key={l.symbol}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border px-3 py-2.5 transition"
              style={{
                borderColor: isFrozen ? "#7fe9ff88" : "rgba(255,255,255,0.06)",
                background: isFrozen ? "linear-gradient(90deg, rgba(127,233,255,0.12), rgba(15,8,32,0.6))" : "rgba(15,8,32,0.6)",
              }}
            >
              <TokenCoin symbol={l.symbol} size={36} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold">{l.symbol}</span>
                  <span className="rounded bg-white/10 px-1.5 font-display text-[11px] font-bold">{l.weight}%</span>
                  {isFrozen && (
                    <span className="flex items-center gap-1 rounded bg-[#7fe9ff]/15 px-1.5 font-display text-[10px] font-bold uppercase text-[#7fe9ff]">
                      <GiSnowflake1 className="h-3 w-3" /> Frozen
                    </span>
                  )}
                  {isDoubled && (
                    <span className="rounded bg-[#ffc861]/15 px-1.5 font-display text-[10px] font-bold uppercase text-[#ffc861]">x2</span>
                  )}
                </div>
                {/* contribution au score */}
                <div className="mt-1.5 h-1 w-full rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(Math.abs(contrib) / maxContrib) * 100}%`,
                      background: up ? "#3dff8a" : "#ff3b5c",
                    }}
                    title={`${a.name} adds ${pct(contrib)} to the score`}
                  />
                </div>
              </div>
              <span className={`w-16 text-right font-display text-lg font-bold tabular-nums ${up ? "text-[#3dff8a]" : "text-[#ff3b5c]"}`}>
                {pct(mv)}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function MutationToast({ mutation }: { mutation: Mutation }) {
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

function RebalanceSheet({
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
