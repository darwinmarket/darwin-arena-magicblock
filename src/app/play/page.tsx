"use client";

// Le parcours de jeu (absent de la vidéo de référence) : Lobby -> Draft -> Duel -> Résultat.
import { useCallback, useState } from "react";
import { Draft } from "@/components/play/Draft";
import { Duel, type DuelOutcome } from "@/components/play/Duel";
import { Lobby } from "@/components/play/Lobby";
import { Result } from "@/components/play/Result";
import type { BasketLeg } from "@/lib/types";
import { TradingFloorBackground } from "@/components/brand/TradingFloorBackground";

type Step = "lobby" | "draft" | "duel" | "result";
const STEPS: Step[] = ["lobby", "draft", "duel", "result"];

export default function PlayPage() {
  const [step, setStep] = useState<Step>("lobby");
  const [stake, setStake] = useState(5);
  const [basket, setBasket] = useState<BasketLeg[]>([]);
  const [outcome, setOutcome] = useState<DuelOutcome | null>(null);

  const onMatched = useCallback((s: number) => {
    setStake(s);
    setStep("draft");
  }, []);
  const onEnd = useCallback((o: DuelOutcome) => {
    setOutcome(o);
    setStep("result");
  }, []);

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
      </ol>

      {step === "lobby" && <Lobby onMatched={onMatched} />}
      {step === "draft" && (
        <Draft
          onLocked={(b) => {
            setBasket(b);
            setStep("duel");
          }}
        />
      )}
      {step === "duel" && <Duel basket={basket} stake={stake} onEnd={onEnd} />}
      {step === "result" && outcome && <Result outcome={outcome} stake={stake} onRematch={() => setStep("lobby")} />}
    </div>
  );
}
