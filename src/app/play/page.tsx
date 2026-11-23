"use client";

// Le parcours de jeu : Lobby -> Draft -> Duel -> Résultat, piloté par l'état on-chain
// du duel en cours (Solana pendant le matchmaking et le draft, le rollup MagicBlock
// pendant le duel, de nouveau Solana au règlement).
import { useCallback, useEffect, useState } from "react";
import { Draft } from "@/components/play/Draft";
import { Duel, type DuelOutcome } from "@/components/play/Duel";
import { Lobby } from "@/components/play/Lobby";
import { Result } from "@/components/play/Result";
import { useArena, useDuel } from "@/lib/chain/ArenaProvider";
import { STATUS } from "@/lib/chain/constants";
import type { BasketLeg } from "@/lib/types";
import { TradingFloorBackground } from "@/components/brand/TradingFloorBackground";

type Step = "lobby" | "draft" | "duel" | "result";
const STEPS: Step[] = ["lobby", "draft", "duel", "result"];

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
    } else if (status === STATUS.LIVE) setStep((s) => (s === "result" ? s : "duel"));
    else if (status === STATUS.DRAFTING && seated) setStep((s) => (s === "lobby" ? s : "draft"));
    // Functional update: the Duel screen may have just moved us to the result in
    // the same commit, and a stale `step` here would send us back.
    else if (status === STATUS.FINISHED || status === STATUS.SETTLED) setStep((s) => (s === "result" ? s : "duel"));
  }, [status, seated, setCurrentDuel]);

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
      <TradingFloorBackground dim={0.5} />
      {/* Fil d'Ariane des étapes (utile pour le dev, à retirer ou styliser à la DA) */}
      <ol className="mb-6 flex gap-2 text-xs font-black uppercase">
        {STEPS.map((s) => (
          <li key={s} className={`rounded-lg px-3 py-1 ${s === step ? "bg-amber-500 text-black" : "bg-neutral-800 text-neutral-400"}`}>
            {s}
          </li>
        ))}
        {live && (
          <li className="ml-auto rounded-lg bg-neutral-800 px-3 py-1 text-neutral-300">
            Duel #{live.view.id} · {live.layer === "er" ? "on the Ephemeral Rollup" : "on Solana"}
          </li>
        )}
      </ol>

      {step === "lobby" && <Lobby onMatched={onMatched} live={live} />}
      {step === "draft" && <Draft live={live} onLocked={(b) => setBasket(b)} />}
      {step === "duel" && <Duel basket={basket} stake={live?.view.stake ?? stake} onEnd={onEnd} live={live} />}
      {step === "result" && outcome && <Result outcome={outcome} stake={live?.view.stake ?? stake} live={live} onRematch={rematch} />}
    </div>
  );
}
