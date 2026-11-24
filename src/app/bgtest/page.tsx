"use client";
// Page de debug (à supprimer) : /bgtest?v=draft | lobby | profil | rank
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { TradingFloorBackground } from "@/components/brand/TradingFloorBackground";
import { ProfilTab } from "@/components/menu/ProfilTab";
import { RankTab } from "@/components/menu/RankTab";
import { Draft } from "@/components/play/Draft";
import { RaceDuel } from "@/components/race/RaceDuel";
import { Result } from "@/components/play/Result";
import { StreetBackground } from "@/components/brand/StreetBackground";
import { Lobby } from "@/components/play/Lobby";
function Inner() {
  const v = useSearchParams().get("v") ?? "draft";
  return (
    <>
      <TradingFloorBackground dim={0.5} />
      {v === "draft" && <Draft onLocked={() => {}} initial={[{ symbol: "SOL", weight: 40 }, { symbol: "JUP", weight: 35 }, { symbol: "BONK", weight: 25 }]} />}
      {v === "lobby" && <Lobby onMatched={() => {}} />}
      {v === "profil" && <ProfilTab />}
      {v === "rank" && <RankTab />}
      {v === "result" && (
        <>
          <StreetBackground dim={0.6} />
          <Result outcome={{ myScore: 0.42, oppScore: 0.17, myBasket: [{ symbol: "SOL", weight: 40 }, { symbol: "JUP", weight: 35 }, { symbol: "BONK", weight: 25 }] }} stake={5} onRematch={() => {}} />
        </>
      )}
      {v === "duel" && <RaceDuel basket={[{ symbol: "WIF", weight: 40 }, { symbol: "BONK", weight: 30 }, { symbol: "JUP", weight: 30 }]} stake={5} onEnd={() => {}} />}
    </>
  );
}
export default function T() {
  return <Suspense><Inner /></Suspense>;
}
