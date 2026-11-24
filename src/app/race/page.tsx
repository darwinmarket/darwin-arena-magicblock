"use client";

// Maquette jouable du nouveau duel : une course d'une minute sur Wall Street.
// Les prix et le rival sont simulés ici ; dans le vrai jeu tout viendra du compte Duel
// sur le rollup MagicBlock (même logique que components/play/Duel.tsx).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GiScales } from "react-icons/gi";
import { GameTimer } from "@/components/game/GameTimer";
import { Corners, GLASS } from "@/components/game/Hud";
import { MUTATION_ART, RebalanceSheet } from "@/components/play/Duel";
import { RaceScene, type RacePhase, type RaceState } from "@/components/race/RaceScene";
import { BasketStrip, CarTag, Driver, FinishFlash, GapPill, ME, MutationBanner, OPP, RaceTrack, StartLights } from "@/components/race/RaceHud";
import { asset } from "@/lib/asset";
import { Result } from "@/components/play/Result";
import { StreetBackground } from "@/components/brand/StreetBackground";
import { MAX_REBALANCES } from "@/lib/mock";
import { useProfile } from "@/lib/store";
import type { BasketLeg, MutationKind, Player } from "@/lib/types";

const TOTAL = 60;
const VOL: Record<string, number> = { SOL: 0.09, JUP: 0.13, BONK: 0.26, WIF: 0.22, JTO: 0.12, PYTH: 0.15 };
const SYMBOLS = Object.keys(VOL);

const RIVAL: Player = {
  id: "rival",
  name: "satoshi.sol",
  avatar: "",
  rank: { tier: "Reptile", division: "II", points: 0 },
  bannerId: "Reptile-red",
  showcase: [null, null, null, null],
};
const MY_START: BasketLeg[] = [
  { symbol: "SOL", weight: 30 },
  { symbol: "JUP", weight: 20 },
  { symbol: "BONK", weight: 20 },
  { symbol: "WIF", weight: 15 },
  { symbol: "JTO", weight: 15 },
];
const OPP_BASKET: BasketLeg[] = [
  { symbol: "SOL", weight: 20 },
  { symbol: "PYTH", weight: 25 },
  { symbol: "WIF", weight: 25 },
  { symbol: "BONK", weight: 15 },
  { symbol: "JTO", weight: 15 },
];
const MUTATIONS: { at: number; kind: MutationKind; symbol: string; label: string }[] = [
  { at: 15, kind: "DOUBLE", symbol: "BONK", label: "BONK counts double" },
  { at: 30, kind: "FREEZE", symbol: "SOL", label: "SOL is frozen" },
  { at: 45, kind: "SWAP", symbol: "WIF", label: "WIF and JUP swap weights" },
];

const zero = () => Object.fromEntries(SYMBOLS.map((s) => [s, 0])) as Record<string, number>;
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.4;

export default function RacePage() {
  const { me } = useProfile();
  const [phase, setPhase] = useState<RacePhase>("intro");
  const [count, setCount] = useState(3);
  const [sec, setSec] = useState(0);
  const [moves, setMoves] = useState(zero);
  const [score, setScore] = useState({ my: 0, opp: 0 });
  const [myBasket, setMyBasket] = useState(MY_START);
  const [oppBasket, setOppBasket] = useState(OPP_BASKET);
  const [mult, setMult] = useState<Record<string, number>>({});
  const [frozen, setFrozen] = useState<string | undefined>();
  const [banner, setBanner] = useState<(typeof MUTATIONS)[number] | null>(null);
  const [rebalances, setRebalances] = useState(MAX_REBALANCES);
  const [editing, setEditing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [run, setRun] = useState(0);
  const state = useRef<RaceState>({ phase: "intro", t: 0, total: TOTAL, diff: 0, flash: null });
  const live = useRef({ moves: zero(), my: 0, opp: 0, myBasket: MY_START, oppBasket: OPP_BASKET, mult: {} as Record<string, number>, frozen: undefined as string | undefined });

  useEffect(() => {
    state.current.phase = phase;
  }, [phase]);
  useEffect(() => {
    state.current.diff = score.my - score.opp;
  }, [score]);
  useEffect(() => {
    live.current.myBasket = myBasket;
  }, [myBasket]);

  // Séquence : sortie de la Bourse, arrivée en grille, 3 2 1, course
  useEffect(() => {
    if (phase === "intro") {
      const id = setTimeout(() => setPhase("grid"), 1400);
      return () => clearTimeout(id);
    }
    if (phase === "grid") {
      const id = setTimeout(() => setPhase("countdown"), 1400);
      return () => clearTimeout(id);
    }
    if (phase === "countdown") {
      if (count === 0) {
        const id = setTimeout(() => setPhase("race"), 650);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => setCount((c) => c - 1), 850);
      return () => clearTimeout(id);
    }
    if (phase === "done") {
      const id = setTimeout(() => setShowResult(true), 2600);
      return () => clearTimeout(id);
    }
  }, [phase, count]);

  // Course : chrono fluide pour la scène, un tick de prix par seconde (comme le crank onchain)
  useEffect(() => {
    if (phase !== "race") return;
    const start = performance.now();
    let raf = 0;
    let tick = 0;
    const loop = (now: number) => {
      const t = Math.min(TOTAL, (now - start) / 1000);
      state.current.t = t;
      const s = Math.floor(t);
      while (tick < s) {
        tick++;
        step(tick);
      }
      if (t >= TOTAL) {
        setPhase("done");
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, run]);

  const step = (tick: number) => {
    const L = live.current;
    const d: Record<string, number> = {};
    for (const sym of SYMBOLS) d[sym] = L.frozen === sym ? 0 : gauss() * VOL[sym] + 0.004;
    const contrib = (b: BasketLeg[]) => b.reduce((acc, l) => acc + (l.weight / 100) * d[l.symbol] * (L.mult[l.symbol] ?? 1), 0);
    L.my += contrib(L.myBasket);
    L.opp += contrib(L.oppBasket);
    for (const sym of SYMBOLS) L.moves[sym] += d[sym];

    const m = MUTATIONS.find((x) => x.at === tick);
    if (m) {
      if (m.kind === "DOUBLE") L.mult = { ...L.mult, [m.symbol]: 2 };
      if (m.kind === "FREEZE") L.frozen = m.symbol;
      if (m.kind === "SWAP") {
        const swap = (b: BasketLeg[]) => {
          const a = b.find((l) => l.symbol === "WIF")?.weight;
          const j = b.find((l) => l.symbol === "JUP")?.weight;
          return b.map((l) => (l.symbol === "WIF" && j !== undefined ? { ...l, weight: j } : l.symbol === "JUP" && a !== undefined ? { ...l, weight: a } : l));
        };
        L.myBasket = swap(L.myBasket);
        L.oppBasket = swap(L.oppBasket);
        setMyBasket(L.myBasket);
        setOppBasket(L.oppBasket);
      }
      setMult(L.mult);
      setFrozen(L.frozen);
      setBanner(m);
      state.current.flash = { color: MUTATION_ART[m.kind].color, at: performance.now() };
      setTimeout(() => setBanner((b) => (b === m ? null : b)), 3200);
    }
    setSec(tick);
    setMoves({ ...L.moves });
    setScore({ my: L.my, opp: L.opp });
  };

  const restart = useCallback(() => {
    live.current = { moves: zero(), my: 0, opp: 0, myBasket: MY_START, oppBasket: OPP_BASKET, mult: {}, frozen: undefined };
    state.current = { phase: "intro", t: 0, total: TOTAL, diff: 0, flash: null };
    setMoves(zero());
    setScore({ my: 0, opp: 0 });
    setMyBasket(MY_START);
    setOppBasket(OPP_BASKET);
    setMult({});
    setFrozen(undefined);
    setBanner(null);
    setRebalances(MAX_REBALANCES);
    setSec(0);
    setCount(3);
    setShowResult(false);
    setPhase("intro");
    setRun((r) => r + 1);
  }, []);

  const diff = score.my - score.opp;
  const racing = phase === "race" || phase === "done";
  const doubled = useMemo(() => Object.keys(mult), [mult]);

  return (
    <div className="fixed inset-0 z-20 overflow-hidden">
      <RaceScene
        key={run}
        state={state}
        meColor={ME}
        oppColor={OPP}
        meLabel={<CarTag name={me.name} score={score.my} color={ME} lead={diff > 0} you />}
        oppLabel={<CarTag name={RIVAL.name} score={score.opp} color={OPP} lead={diff < 0} />}
      />

      {/* On quitte la salle des marchés : elle s'ouvre et s'efface, la rue apparaît */}
      {phase === "intro" && (
        <div className="race-exit pointer-events-none absolute inset-0 -z-[5]" style={{ backgroundImage: `url(${asset("/arena/trading_floor.png")})` }} />
      )}

      {/* ===== Haut : les deux pilotes et le chrono ===== */}
      <div className={`absolute inset-x-0 top-20 flex items-start justify-center gap-4 px-4 md:justify-between transition-all duration-700 sm:px-6 ${phase === "intro" ? "-translate-y-6 opacity-0" : ""}`}>
        <div className="hidden min-w-0 md:block"><Driver player={me} score={score.my} color={ME} lead={diff > 0} /></div>
        <div className="flex flex-col items-center gap-2">
          <GameTimer left={Math.max(0, TOTAL - sec)} total={TOTAL} label="Finish in" />
          <GapPill diff={diff} />
        </div>
        <div className="hidden min-w-0 md:block"><Driver player={RIVAL} score={score.opp} color={OPP} lead={diff < 0} mirrored /></div>
      </div>

      {/* ===== Bannière de mutation ===== */}
      {banner && <MutationBanner m={banner} />}

      {/* ===== Départ ===== */}
      {(phase === "countdown" || (phase === "race" && sec === 0)) && <StartLights count={phase === "race" ? 0 : count} />}

      {/* ===== Bas : paniers et progression ===== */}
      <div className={`absolute inset-x-0 bottom-0 px-4 pb-5 transition-all duration-700 sm:px-6 ${phase === "intro" || phase === "grid" ? "translate-y-8 opacity-0" : ""}`}>
        <RaceTrack t={sec} total={TOTAL} diff={diff} mutations={MUTATIONS} />
        <div className="mt-3 grid items-end gap-3 md:grid-cols-[1fr_auto_1fr]">
          <BasketStrip title="Your basket" basket={myBasket} moves={moves} color={ME} frozen={frozen} doubled={doubled} />
          <button
            disabled={!racing || rebalances === 0 || phase === "done"}
            onClick={() => setEditing(true)}
            className={`${GLASS} group flex flex-col items-center gap-1 rounded-2xl px-6 py-3 transition hover:border-[#ffc861]/60 disabled:opacity-40`}
          >
            <Corners color="#ffc861" />
            <span className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wider text-[#ffc861]">
              <GiScales className="h-5 w-5" /> Rebalance
            </span>
            <span className="flex gap-1.5">
              {Array.from({ length: MAX_REBALANCES }, (_, i) => (
                <span key={i} className="h-1.5 w-5 rounded-full" style={{ background: i < rebalances ? "#ffc861" : "rgba(255,255,255,0.12)", boxShadow: i < rebalances ? "0 0 8px #ffc861" : undefined }} />
              ))}
            </span>
          </button>
          <div className="hidden md:block"><BasketStrip title={`${RIVAL.name}`} basket={oppBasket} moves={moves} color={OPP} frozen={frozen} doubled={doubled} mirrored /></div>
        </div>
      </div>

      {editing && (
        <RebalanceSheet
          basket={myBasket}
          frozen={frozen}
          onCancel={() => setEditing(false)}
          onConfirm={(b) => {
            setEditing(false);
            setMyBasket(b);
            live.current.myBasket = b;
            setRebalances((r) => r - 1);
          }}
        />
      )}

      {phase === "done" && !showResult && <FinishFlash win={diff >= 0} />}
      {showResult && (
        <div className="race-podium fixed inset-0 z-40 overflow-y-auto px-4 pb-10 pt-24">
          <StreetBackground dim={0.6} />
          <Result outcome={{ myScore: score.my, oppScore: score.opp, myBasket: MY_START }} stake={5} onRematch={restart} rivalName={RIVAL.name} />
        </div>
      )}
    </div>
  );
}

