"use client";

// Le menu de la référence : modale avec 3 onglets en pilules + croix de fermeture.
import Link from "next/link";
import { useState } from "react";
import { DashboardTab } from "@/components/menu/DashboardTab";
import { ProfilTab } from "@/components/menu/ProfilTab";
import { RankTab } from "@/components/menu/RankTab";
import { Tabs } from "@/components/ui";
import { StreetBackground } from "@/components/brand/StreetBackground";

const TABS = ["Dashboard", "Profil", "Rank"] as const;

export default function MenuPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Dashboard");
  return (
    <>
    <StreetBackground dim={0.25} />
    <div className="rounded-[2.5rem] bg-black/75 p-6 shadow-2xl backdrop-blur-md md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <Link href="/" className="text-4xl font-black" aria-label="Close">
          ✕
        </Link>
      </div>
      {tab === "Dashboard" && <DashboardTab />}
      {tab === "Profil" && <ProfilTab />}
      {tab === "Rank" && <RankTab />}
    </div>
    </>
  );
}
