"use client";

// Onglet 2 : YOUR PROFIL · CUSTOM · COLLECTION (Badges / Banners)
// Custom : on clique un emplacement de la vitrine 2x2, puis un badge de la collection pour l'équiper.
// Banners : clic = équipe la bannière, appliquée immédiatement partout.
import { useState } from "react";
import { BadgeEmblem, BADGE_ART, RankEmblem, rarityColor, rarityLabel } from "@/components/game/emblems";
import { PlayerCard, bannerCss } from "@/components/PlayerCard";
import { Panel, ProgressBar, Tabs, Tooltip } from "@/components/ui";
import { BADGES, BANNERS } from "@/lib/mock";
import { useProfile } from "@/lib/store";

const COLLECTION_TABS = ["Badges", "Banners"] as const;
const PAGE_SIZE = 8; // 4 colonnes x 2 rangées

export function ProfilTab() {
  const { me, setBanner, setShowcaseSlot } = useProfile();
  const [collection, setCollection] = useState<(typeof COLLECTION_TABS)[number]>("Badges");
  const [slot, setSlot] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const pages = Math.ceil(BANNERS.length / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-[1fr_1.4fr]">
        <Panel title="Your profil">
          <PlayerCard player={me} />
        </Panel>

        <Panel title="Custom">
          <div className="flex items-center gap-6">
            {/* Vitrine 2x2 éditable */}
            <div className="grid grid-cols-2 gap-2">
              {me.showcase.map((id, i) => {
                const badge = BADGES.find((b) => b.id === id);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSlot(i);
                      setCollection("Badges");
                    }}
                    className={`grid h-[70px] w-16 place-items-center rounded-xl bg-black/30 font-display text-2xl text-white/40 transition hover:bg-black/50 ${
                      slot === i ? "ring-2 ring-[#ffc861]" : ""
                    }`}
                  >
                    {badge ? <BadgeEmblem badgeId={badge.id} size={52} showStars={false} /> : "+"}
                  </button>
                );
              })}
            </div>
            {/* Aperçu bannière + crayon */}
            <button
              onClick={() => setCollection("Banners")}
              className="grid h-28 flex-1 place-items-center rounded-2xl border-2 text-2xl"
              style={{ background: bannerCss(me.bannerId).bg, borderColor: bannerCss(me.bannerId).edge }}
            >
              ✏️
            </button>
          </div>
          {slot !== null && (
            <p className="mt-3 text-xs text-[#ffc861]">Slot {slot + 1} selected: pick a badge below.</p>
          )}
        </Panel>
      </div>

      <Panel title="Collection">
        <div className="mb-4">
          <Tabs tabs={COLLECTION_TABS} active={collection} onChange={setCollection} size="sm" />
        </div>

        {collection === "Badges" ? (
          <div className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-6 md:grid-cols-8">
            {BADGES.map((b) => {
              const unlocked = b.progress >= b.goal;
              return (
                <Tooltip
                  key={b.id}
                  content={
                    <div>
                      <div className="font-display font-bold">{b.name}</div>
                      <div className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: rarityColor(BADGE_ART[b.id].rarity) }}>
                        {rarityLabel(BADGE_ART[b.id].rarity)}
                      </div>
                      <div className="text-neutral-300">{b.condition}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <ProgressBar value={b.progress} max={b.goal} className="w-24" />
                        <span>
                          {Math.min(b.progress, b.goal)}/{b.goal}
                        </span>
                      </div>
                    </div>
                  }
                >
                  <button
                    disabled={!unlocked}
                    onClick={() => {
                      if (slot !== null) {
                        setShowcaseSlot(slot, b.id);
                        setSlot(null);
                      }
                    }}
                    className={`flex w-full flex-col items-center gap-1.5 transition ${unlocked ? "hover:-translate-y-1" : ""}`}
                  >
                    <BadgeEmblem badgeId={b.id} size={64} locked={!unlocked} />
                    <span className={`w-full truncate text-center font-display text-[11px] font-bold uppercase tracking-wide ${unlocked ? "" : "text-white/40"}`}>
                      {b.name}
                    </span>
                    {!unlocked && (
                      <ProgressBar value={b.progress} max={b.goal} className="h-1 w-12" />
                    )}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {BANNERS.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((bn) => (
                <Tooltip
                  key={bn.id}
                  content={
                    <div>
                      <div className="font-black italic">
                        {bn.rankIcon} {bn.color} banner
                      </div>
                      <div className="text-neutral-300">{bn.condition}</div>
                    </div>
                  }
                >
                  <button
                    disabled={!bn.unlocked}
                    onClick={() => setBanner(bn.id)}
                    className={`flex h-20 w-full items-center justify-end overflow-hidden rounded-xl border px-3 ${
                      me.bannerId === bn.id ? "ring-2 ring-[#ffc861]" : ""
                    } ${bn.unlocked ? "" : "opacity-40 grayscale"}`}
                    style={{ background: bannerCss(bn.id).bg, borderColor: bannerCss(bn.id).edge }}
                  >
                    {!bn.unlocked && <span className="mr-auto text-xl">🔒</span>}
                    <RankEmblem tier={bn.rankIcon} size={46} showDivision={false} />
                  </button>
                </Tooltip>
              ))}
            </div>
            {/* Pagination : flèches + points */}
            <div className="mt-4 flex items-center justify-between">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} className="text-xl">◀</button>
              <div className="flex gap-2">
                {Array.from({ length: pages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`h-3 w-3 rounded-full ${i === page ? "bg-white" : "bg-neutral-600"}`}
                  />
                ))}
              </div>
              <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} className="text-xl">▶</button>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
