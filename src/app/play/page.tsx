"use client";

// Le parcours de jeu : Lobby -> Draft -> Duel -> Résultat, piloté par l'état on-chain
// du duel en cours (Solana pendant le matchmaking et le draft, le rollup MagicBlock
// pendant le duel, de nouveau Solana au règlement).
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { GiCheckeredFlag, GiSteeringWheel } from "react-icons/gi";
import { Draft } from "@/components/play/Draft";
import { type DuelOutcome } from "@/components/play/Duel";
import { RaceDuel } from "@/components/race/RaceDuel";
import { Lobby } from "@/components/play/Lobby";
import { Result } from "@/components/play/Result";
import { useArena, useDuel } from "@/lib/chain/ArenaProvider";
import { STATUS } from "@/lib/chain/constants";
import type { BasketLeg } from "@/lib/types";
import { StreetBackground } from "@/components/brand/StreetBackground";
import { TradingFloorBackground } from "@/components/brand/TradingFloorBackground";

type Step = "lobby" | "draft" | "duel" | "result";
const STEPS: Step[] = ["lobby", "draft", "duel", "result"];
const LABEL: Record<Step, string> = { lobby: "Pick a table", draft: "Build your basket", duel: "Race", result: "Podium" };

export default function PlayPage() {
  const { currentDuel, setCurrentDuel } = useArena();
  const live = useDuel(currentDuel);
  const [step, setStep] = useState<Step>("lobby");
  const [stake, setStake] = useState(5);
  const [basket, setBasket] = useState<BasketLeg[]>([]);
  const [outcome, setOutcome] = useState<DuelOutcome | null>(null);

  // Follow the chain: a reload, or the rival locking first, lands on the right screen.
  const status = live?.mySlot !== null ? live?.view.status : undefined;
  const seated = !!live?.view.players[1];
  useEffect(() => {
    if (status === undefined) return;
    if (status === STATUS.CANCELLED) {
      setCurrentDuel(null);
      setStep("lobby");
    // Arrivée sur /play : on reste au lobby ; une course déjà lancée se rejoint par le bouton dédié.
    } else if (status === STATUS.LIVE) setStep((s) => (s === "result" || s === "lobby" ? s : "duel"));
    else if (status === STATUS.DRAFTING && seated) setStep((s) => (s === "lobby" ? s : "draft"));
    // Functional update: the Duel screen may have just moved us to the result in
    // the same commit, and a stale `step` here would send us back.
    else if (status === STATUS.FINISHED || status === STATUS.SETTLED) setStep((s) => (s === "result" || s === "lobby" ? s : "duel"));
  }, [status, seated, setCurrentDuel]);

  // Une étape de course sans course suivie (wallet changé, course annulée ailleurs) : retour à la table.
  useEffect(() => {
    if (currentDuel === null && (step === "draft" || step === "duel")) setStep("lobby");
  }, [currentDuel, step]);

  const onMatched = useCallback((s: number) => {
    setStake(s);
    setStep("draft");
  }, []);
  const onEnd = useCallback((o: DuelOutcome) => {
    setOutcome(o);
    setStep("result");
  }, []);
  const rematch = useCallback(() => {
    setCurrentDuel(null);
    setOutcome(null);
    setStep("lobby");
  }, [setCurrentDuel]);

  return (
    <div>
      {/* Salle des marchés pour le lobby et le draft ; le duel et le résultat se jouent dans la rue */}
      {step === "lobby" || step === "draft" ? <TradingFloorBackground dim={0.5} /> : step === "result" ? <StreetBackground dim={0.6} /> : null}
      {/* Étapes de la course + accès au dashboard */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => {
          const on = s === step;
          const done = STEPS.indexOf(step) > i;
          return (
            <span
              key={s}
              className={`-skew-x-12 rounded-md border px-4 py-1.5 font-display text-xs font-bold uppercase italic tracking-wider ${
                on
                  ? "border-transparent bg-gradient-to-r from-[#2de2ff] to-[#ff3fb4] text-[#0b0716] shadow-[0_0_20px_-6px_#ff3fb4]"
                  : done
                    ? "border-white/20 bg-white/10 text-white/80"
                    : "border-white/10 bg-black/40 text-white/40"
              }`}
            >
              <span className="block skew-x-12">{LABEL[s]}</span>
            </span>
          );
        })}
        {live && live.view.status >= 1 && step !== "lobby" && (
          <a
            href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/duel?id=${live.view.id}`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto font-display text-xs font-bold uppercase tracking-wider text-[#2de2ff] hover:underline"
            title="A public page anyone can watch this race on"
          >
            Spectator link ↗
          </a>
        )}
        <Link
          href="/menu"
          className={`${live && live.view.status >= 1 && step !== "lobby" ? "" : "ml-auto"} flex -skew-x-12 items-center gap-2 rounded-md border border-white/15 bg-[#120a24]/80 px-4 py-1.5 font-display text-xs font-bold uppercase italic tracking-wider backdrop-blur transition hover:border-[#2de2ff]/60 hover:bg-white/10`}
        >
          <span className="flex skew-x-12 items-center gap-2">
            <GiSteeringWheel className="h-4 w-4 text-[#2de2ff]" /> Dashboard
          </span>
        </Link>
      </div>

      {/* Une course lancée plus tôt tourne encore : on propose de la rejoindre, sans y forcer */}
      {step === "lobby" && live && live.mySlot !== null && live.view.status >= STATUS.LIVE && live.view.status <= STATUS.FINISHED && (
        <div className="arena-rise relative mb-5 flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-[#ffc861]/40 bg-[#120a24]/85 p-4 backdrop-blur-xl sm:flex-row">
          <div className="race-checker pointer-events-none absolute inset-y-0 right-0 w-16 opacity-10" />
          <GiCheckeredFlag className="h-8 w-8 shrink-0 text-[#ffc861] drop-shadow-[0_0_10px_#ffc861]" />
          <div className="flex-1 text-center sm:text-left">
            <div className="font-display text-sm font-bold uppercase italic tracking-wider text-[#ffc861]">Race #{live.view.id} is still on track</div>
            <div className="text-sm text-white/60">Jump back in to watch it finish, or leave it and start a new race below.</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep("duel")}
              className="-skew-x-12 rounded-md bg-gradient-to-r from-[#ffc861] to-[#ff8a3d] px-5 py-2 font-display text-sm font-bold uppercase italic tracking-wider text-[#1a0c02] transition hover:brightness-110"
            >
              <span className="block skew-x-12">Rejoin race</span>
            </button>
            <button
              onClick={() => setCurrentDuel(null)}
              className="-skew-x-12 rounded-md border border-white/15 px-5 py-2 font-display text-sm font-bold uppercase italic tracking-wider transition hover:bg-white/10"
            >
              <span className="block skew-x-12">New race</span>
            </button>
          </div>
        </div>
      )}

      {step === "lobby" && <Lobby onMatched={onMatched} live={live} />}
      {step === "draft" && <Draft live={live} onLocked={(b) => setBasket(b)} />}
      {step === "duel" && <RaceDuel basket={basket} stake={live?.view.stake ?? stake} onEnd={onEnd} live={live} />}
      {step === "result" && outcome && <Result outcome={outcome} stake={live?.view.stake ?? stake} live={live} onRematch={rematch} />}
    </div>
  );
}
