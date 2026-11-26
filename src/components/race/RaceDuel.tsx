"use client";

// Le duel en direct, sous forme de course sur Wall Street (remplace l'ancien écran à courbes).
// Tout vient du compte Duel délégué au rollup MagicBlock : le crank fait avancer le score
// chaque seconde avec les prix Pyth Lazer, le VRF tire les mutations, les rééquilibrages
// sont signés par la clé de session. La durée suit le programme (endTs - startTs).
import { useCallback, useEffect, useRef, useState } from "react";
import { GiScales } from "react-icons/gi";
import { Corners, GLASS } from "@/components/game/Hud";
import { GameTimer } from "@/components/game/GameTimer";
import { MUTATION_ART, RebalanceSheet, type DuelOutcome } from "@/components/play/Duel";
import { BasketStrip, CarTag, Driver, FinishFlash, GapPill, ME, MutationBanner, OPP, RaceTrack, StartLights, type RaceMutation } from "@/components/race/RaceHud";
import { RaceScene, type RacePhase, type RaceState } from "@/components/race/RaceScene";
import { useArena, type LiveDuel } from "@/lib/chain/ArenaProvider";
import { MUTATION_AT } from "@/lib/chain/constants";
import { alignToLive, toLegs, toWeights } from "@/lib/chain/duel";
import { friendlyError } from "@/lib/chain/errors";
import { usePlayer } from "@/lib/chain/hooks";
import { ASSETS, DUEL_SECONDS, MAX_REBALANCES } from "@/lib/mock";
import { useProfile } from "@/lib/store";
import type { BasketLeg } from "@/lib/types";

export function RaceDuel({
  basket,
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
  const rival = usePlayer(view?.players[oppSlot]) ?? { ...me, id: "rival", name: "Rival" };

  const total = DUEL_SECONDS; // une course dure une minute
  const startTs = view?.startTs ?? 0;
  const [now, setNow] = useState(() => Date.now() / 1000);
  const elapsed = startTs ? Math.max(0, Math.min(total, now - startTs)) : 0;
  const sec = Math.floor(elapsed);

  const my = view?.score[mySlot] ?? 0;
  const opp = view?.score[oppSlot] ?? 0;
  const diff = my - opp;
  const myBasket = view ? toLegs(view.weights[mySlot]) : basket;
  const oppBasket = view ? toLegs(view.weights[oppSlot]) : [];
  const moves = view?.moves ?? {};
  const frozen = view?.frozen ?? undefined;
  const doubled = view ? ASSETS.filter((_, i) => view.mult[i] > 1).map((a) => a.symbol) : [];
  const rebalances = view?.rebalancesLeft[mySlot] ?? MAX_REBALANCES;
  const mutations: RaceMutation[] = (view?.mutations ?? []).map((m, i) =>
    m.state === "applied"
      ? { at: m.at, kind: m.kind!, label: m.label!, drawn: true }
      : { at: MUTATION_AT[i] ?? 0, kind: "DOUBLE", label: "Hidden mutation", drawn: false },
  );
  // The result is the chain's: it freezes when the rollup closes the duel (final tick, final
  // scores), not when the browser's clock reaches the line, whose last scores may be a tick or two
  // old and swap the order. Safety net: 15 s past the line without the close, take what we have.
  const closed = !!view && view.status >= 3;
  const overdue = startTs > 0 && now - startTs >= total + 15;
  const over = closed || overdue;
  const photoFinish = startTs > 0 && elapsed >= total && !over;

  // Cinématique d'entrée : on ne joue le 3 2 1 que si le duel vient vraiment de commencer.
  const [phase, setPhase] = useState<RacePhase>("intro");
  const [count, setCount] = useState(3);
  const state = useRef<RaceState>({ phase: "intro", t: 0, total, diff: 0, flash: null });
  const [banner, setBanner] = useState<RaceMutation | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef<Set<number>>(new Set());
  const ended = useRef(false);

  useEffect(() => {
    state.current.phase = phase;
  }, [phase]);
  useEffect(() => {
    state.current.diff = diff;
    state.current.total = total;
  }, [diff, total]);

  useEffect(() => {
    if (phase === "intro") {
      const id = setTimeout(() => setPhase("grid"), 1400);
      return () => clearTimeout(id);
    }
    if (phase === "grid") {
      // On attend l'horodatage onchain du départ : sans lui la route sauterait en le recevant.
      if (!startTs) return;
      const fresh = Date.now() / 1000 - startTs < 4;
      const id = setTimeout(() => setPhase(fresh ? "countdown" : "race"), 1300);
      return () => clearTimeout(id);
    }
    if (phase === "countdown") {
      if (count === 0) {
        const id = setTimeout(() => setPhase("race"), 600);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => setCount((c) => c - 1), 800);
      return () => clearTimeout(id);
    }
  }, [phase, count, startTs]);

  // Horloge fluide pour la scène, calée sur l'horodatage onchain du départ
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const n = Date.now() / 1000;
      state.current.t = startTs ? Math.max(0, Math.min(total, n - startTs)) : 0;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const id = setInterval(() => setNow(Date.now() / 1000), 250);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [startTs, total]);

  // Mutations tirées par le VRF : flash + bannière
  useEffect(() => {
    view?.mutations.forEach((m, i) => {
      if (m.state !== "applied" || seen.current.has(i)) return;
      seen.current.add(i);
      const mut: RaceMutation = { at: m.at, kind: m.kind!, label: m.label!, drawn: true };
      setBanner(mut);
      state.current.flash = { color: MUTATION_ART[mut.kind].color, at: performance.now() };
      setTimeout(() => setBanner((b) => (b === mut ? null : b)), 3200);
    });
  }, [view]);

  // Arrivée : on laisse les voitures passer la ligne avant l'écran de résultat.
  // Le minuteur ne dépend que de la phase : les mises à jour onchain ne l'annulent plus.
  const outcome = useRef<DuelOutcome | null>(null);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);
  const finish = useCallback(() => {
    if (ended.current || !outcome.current) return;
    ended.current = true;
    onEndRef.current(outcome.current);
  }, []);
  useEffect(() => {
    if (!view || !over) return;
    if (outcome.current) return; // le résultat est figé au passage de la ligne
    outcome.current = { myScore: my, oppScore: opp, myBasket: toLegs(view.startWeights[mySlot]) };
    setPhase((p) => (p === "done" ? p : "done"));
  }, [view, over, my, opp, mySlot]);
  useEffect(() => {
    if (phase !== "done") return;
    const id = setTimeout(finish, 2600);
    return () => clearTimeout(id);
  }, [phase, finish]);

  const racing = phase === "race";

  return (
    <div className="fixed inset-0 z-20 overflow-hidden">
      <RaceScene
        state={state}
        meColor={ME}
        oppColor={OPP}
        meLabel={<CarTag name={me.name} score={my} color={ME} lead={diff > 0} you />}
        oppLabel={<CarTag name={rival.name} score={opp} color={OPP} lead={diff < 0} />}
      />

      <div className={`absolute inset-x-0 top-20 flex items-start justify-center gap-4 px-4 md:justify-between transition-all duration-700 sm:px-6 ${phase === "intro" ? "-translate-y-6 opacity-0" : ""}`}>
        <div className="hidden min-w-0 md:block"><Driver player={me} score={my} color={ME} lead={diff > 0} /></div>
        <div className="flex flex-col items-center gap-2">
          <GameTimer left={Math.max(0, Math.ceil(total - elapsed))} total={total} label="Finish in" />
          <GapPill diff={diff} />
        </div>
        <div className="hidden min-w-0 md:block"><Driver player={rival} score={opp} color={OPP} lead={diff < 0} mirrored /></div>
      </div>

      {banner && <MutationBanner m={banner} />}
      {phase === "countdown" && <StartLights count={count} />}

      <div className={`absolute inset-x-0 bottom-0 px-4 pb-5 transition-all duration-700 sm:px-6 ${phase === "intro" || phase === "grid" ? "translate-y-8 opacity-0" : ""}`}>
        <RaceTrack t={sec} total={total} diff={diff} mutations={mutations} />
        {error && <p className="mt-2 text-center text-sm text-[#ff3b5c]">{error}</p>}
        <div className="mt-3 grid items-end gap-3 md:grid-cols-[1fr_auto_1fr]">
          <BasketStrip title="Your basket" basket={myBasket} moves={moves} color={ME} frozen={frozen} doubled={doubled} />
          <button
            disabled={!racing || rebalances === 0 || over}
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
          <div className="hidden md:block"><BasketStrip title={rival.name} basket={oppBasket} moves={moves} color={OPP} frozen={frozen} doubled={doubled} mirrored /></div>
        </div>
      </div>

      {editing && (
        <RebalanceSheet
          basket={myBasket}
          frozen={frozen}
          onCancel={() => setEditing(false)}
          onConfirm={async (b) => {
            setEditing(false);
            if (currentDuel === null) return;
            try {
              setError(null);
              // a SWAP may have landed while the sheet was open: send over the live assets
              await sendRebalance(currentDuel, toWeights(alignToLive(b, myBasket)));
            } catch (e) {
              setError(friendlyError(e));
            }
          }}
        />
      )}

      {photoFinish && (
        <div className="pointer-events-none fixed inset-x-0 top-1/3 z-30 text-center font-display text-2xl font-bold uppercase italic tracking-widest text-white drop-shadow-[0_0_18px_#2de2ff] animate-pulse">
          Photo finish… the chain decides
        </div>
      )}
      {phase === "done" && <FinishFlash win={(outcome.current ? outcome.current.myScore - outcome.current.oppScore : diff) >= 0} />}

    </div>
  );
}
