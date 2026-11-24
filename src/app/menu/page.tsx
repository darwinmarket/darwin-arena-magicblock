"use client";

// Le garage du pilote : Dashboard (tableau de bord), Profil (garage et collection), Rank (championnat).
import Link from "next/link";
import { useState } from "react";
import { GiCarWheel, GiPodium, GiRaceCar, GiSteeringWheel } from "react-icons/gi";
import { StreetBackground } from "@/components/brand/StreetBackground";
import { Corners } from "@/components/game/Hud";
import { DashboardTab } from "@/components/menu/DashboardTab";
import { ProfilTab } from "@/components/menu/ProfilTab";
import { RankTab } from "@/components/menu/RankTab";
import { Tabs } from "@/components/ui";

const TABS = ["Dashboard", "Profil", "Rank"] as const;
const ICONS = {
  Dashboard: <GiSteeringWheel className="h-4 w-4" />,
  Profil: <GiCarWheel className="h-4 w-4" />,
  Rank: <GiPodium className="h-4 w-4" />,
};
const SUB: Record<(typeof TABS)[number], string> = {
  Dashboard: "Your cockpit",
  Profil: "Your garage",
  Rank: "The championship",
};

export default function MenuPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Dashboard");
  return (
    <>
      <StreetBackground dim={0.45} />
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b0716]/80 p-5 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl md:p-7">
        <Corners size={14} />
        <div className="race-carbon pointer-events-none absolute inset-0" />
        <div className="race-checker pointer-events-none absolute inset-x-0 top-0 h-2 opacity-20" />

        <div className="relative mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-display text-[11px] font-semibold uppercase tracking-[0.35em] text-[#2de2ff]">{SUB[tab]}</div>
            <h1 className="font-display text-4xl font-bold uppercase italic leading-none tracking-tight">
              Pit <span className="bg-gradient-to-r from-[#2de2ff] via-[#ff3fb4] to-[#ffc861] bg-clip-text text-transparent">Garage</span>
            </h1>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
            <Link
              href="/play"
              className="group relative w-full -skew-x-12 overflow-hidden rounded-md bg-gradient-to-r from-[#ff3fb4] via-[#ff6a3d] to-[#ffc861] px-6 py-2.5 font-display text-base md:w-auto font-bold uppercase italic tracking-wider text-[#1a0612] shadow-[0_10px_30px_-8px_#ff3fb4] transition hover:brightness-110"
            >
              <span className="arena-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              <span className="relative flex skew-x-12 items-center justify-center gap-2">
                <GiRaceCar className="h-5 w-5 transition group-hover:translate-x-1" /> Play
              </span>
            </Link>
            <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
            <div className="min-w-0 flex-1">
              <Tabs tabs={TABS} active={tab} onChange={setTab} icons={ICONS} />
            </div>
            <Link
              href="/"
              aria-label="Close"
              className="group hidden h-11 w-11 shrink-0 -skew-x-12 place-items-center md:grid rounded-md border border-white/15 bg-white/5 transition hover:border-[#ff3b5c] hover:bg-[#ff3b5c]/20"
            >
              <span className="skew-x-12 font-display text-xl font-bold transition group-hover:rotate-90">✕</span>
            </Link>
            </div>
          </div>
        </div>

        <div key={tab} className="arena-rise relative">
          {tab === "Dashboard" && <DashboardTab />}
          {tab === "Profil" && <ProfilTab />}
          {tab === "Rank" && <RankTab />}
        </div>
      </div>
    </>
  );
}
