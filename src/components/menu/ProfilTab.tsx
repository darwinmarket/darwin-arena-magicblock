"use client";

// Onglet 2 : YOUR PROFIL · CUSTOM · COLLECTION (Badges / Banners)
// Custom : on clique un emplacement de la vitrine 2x2, puis un badge de la collection pour l'équiper.
// Banners : clic = équipe la bannière, appliquée immédiatement partout.
import { useMemo, useState } from "react";
import { GiLaurelsTrophy, GiPadlock, GiPaintBrush } from "react-icons/gi";
import { BadgeEmblem, BADGE_ART, RankEmblem, rarityColor, rarityLabel } from "@/components/game/emblems";
import { PlayerCard, bannerCss } from "@/components/PlayerCard";
import { Panel, ProgressBar, Tabs, Tooltip } from "@/components/ui";
import { useArena } from "@/lib/chain/ArenaProvider";
import { badgesFor } from "@/lib/chain/badges";
import { useTrophies } from "@/lib/chain/hooks";
import { toLegs } from "@/lib/chain/duel";
import { duelUrl, explorerAddress } from "@/lib/share";
import { TIER_ORDER } from "@/lib/chain/rank";
import { BANNERS as BANNER_DEFS } from "@/lib/mock";
import { useProfile } from "@/lib/store";

const COLLECTION_TABS = ["Badges", "Banners"] as const;
const PAGE_SIZE = 8; // 4 colonnes x 2 rangées

export function ProfilTab() {
  const { me, setBanner, setShowcaseSlot } = useProfile();
  const { profile, wallet } = useArena();
  const trophies = useTrophies(wallet);
  // Badges and banners follow the on-chain profile: progress from its counters
  // and recent history, banners unlocked up to the current rank tier.
  const BADGES = useMemo(() => {
    const shares = typeof localStorage === "undefined" ? 0 : Number(localStorage.getItem("darwin-arena:shares") ?? 0);
    return badgesFor(profile, { shares, trophies: trophies.length });
  }, [profile, trophies.length]);
  const tierIdx = TIER_ORDER.indexOf(me.rank.tier);
  const BANNERS = BANNER_DEFS.map((b) => ({ ...b, unlocked: TIER_ORDER.indexOf(b.rankIcon) <= tierIdx }));
  const [collection, setCollection] = useState<(typeof COLLECTION_TABS)[number]>("Badges");
  const [slot, setSlot] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const pages = Math.ceil(BANNERS.length / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-[1fr_1.4fr]">
        <Panel title="Driver card">
          <PlayerCard player={me} />
        </Panel>

        <Panel title="Livery">
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
                    className={`grid h-[70px] w-16 place-items-center rounded-xl border border-white/10 bg-black/40 font-display text-2xl text-white/40 transition hover:-translate-y-0.5 hover:border-white/30 ${
                      slot === i ? "border-[#ffc861] shadow-[0_0_18px_-4px_#ffc861]" : ""
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
              className="group relative grid h-28 flex-1 place-items-center overflow-hidden rounded-2xl border-2 transition hover:-translate-y-0.5"
              style={{ background: bannerCss(me.bannerId).bg, borderColor: bannerCss(me.bannerId).edge }}
            >
              <span className="race-checker pointer-events-none absolute inset-y-0 right-0 w-10 opacity-15" />
              <span className="flex -skew-x-12 items-center gap-2 rounded-md bg-black/55 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-widest backdrop-blur transition group-hover:bg-black/75">
                <GiPaintBrush className="h-4 w-4 skew-x-12" />
                <span className="skew-x-12">Change livery</span>
              </span>
            </button>
          </div>
          {slot !== null && (
            <p className="mt-3 font-display text-xs uppercase tracking-wider text-[#ffc861]">Slot {slot + 1} selected, pick a badge below</p>
          )}
        </Panel>
      </div>

      <Panel title="Trophy cabinet" right={<span className="font-display text-[11px] uppercase tracking-[0.2em] text-white/45">Winning baskets minted on chain</span>}>
        {trophies.length === 0 ? (
          <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-white/15 py-8 text-center">
            <GiLaurelsTrophy className="h-8 w-8 text-white/30" />
            <p className="font-display text-sm uppercase tracking-widest text-white/45">Win a race, then mint the basket on the result screen</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {trophies.map((t) => (
              <div key={t.address.toBase58()} className="relative overflow-hidden rounded-2xl border border-[#ffc861]/40 bg-gradient-to-br from-[#ffc861]/10 to-transparent p-4 transition hover:-translate-y-0.5 hover:shadow-[0_0_30px_-10px_#ffc861]">
                <span className="race-checker pointer-events-none absolute right-0 top-0 h-3 w-16 opacity-25" />
                <div className="flex items-baseline justify-between">
                  <span className="flex items-center gap-2 font-display text-lg font-bold italic">
                    <GiLaurelsTrophy className="h-5 w-5 text-[#ffc861]" /> Race #{t.duelId}
                  </span>
                  <span className="font-display font-bold text-[#3dff8a]">
                    {t.score >= 0 ? "+" : ""}
                    {t.score.toFixed(2)}% <span className="text-xs text-neutral-400">vs {t.oppScore.toFixed(2)}%</span>
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {toLegs(t.weights).map((l) => (
                    <span key={l.symbol} className="rounded-md bg-white/10 px-1.5 py-0.5">
                      {l.symbol} {l.weight}%
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-xs text-neutral-400">
                  {t.stake} USDC table, survived {t.mutations.join(", ") || "no mutation"}
                </div>
                <div className="mt-2 flex gap-3 text-xs font-bold uppercase">
                  <a className="text-[#2de2ff]" href={duelUrl(t.duelId)} target="_blank" rel="noreferrer">
                    Replay
                  </a>
                  <a className="text-[#2de2ff]" href={explorerAddress(t.address.toBase58())} target="_blank" rel="noreferrer">
                    Explorer ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

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
                    className={`flex h-20 w-full items-center justify-end overflow-hidden rounded-xl border px-3 transition ${
                      me.bannerId === bn.id ? "ring-2 ring-[#ffc861] shadow-[0_0_22px_-6px_#ffc861]" : ""
                    } ${bn.unlocked ? "hover:-translate-y-0.5" : "opacity-40 grayscale"}`}
                    style={{ background: bannerCss(bn.id).bg, borderColor: bannerCss(bn.id).edge }}
                  >
                    {!bn.unlocked && <GiPadlock className="mr-auto h-5 w-5" />}
                    <RankEmblem tier={bn.rankIcon} size={46} showDivision={false} />
                  </button>
                </Tooltip>
              ))}
            </div>
            {/* Pagination : flèches + points */}
            <div className="mt-4 flex items-center justify-between">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} aria-label="Previous" className="grid h-9 w-11 -skew-x-12 place-items-center rounded-md border border-white/15 bg-white/5 transition hover:bg-white/15 disabled:opacity-30" disabled={page === 0}>
                <span className="skew-x-12">◀</span>
              </button>
              <div className="flex gap-2">
                {Array.from({ length: pages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`h-1.5 -skew-x-12 rounded-sm transition-all ${i === page ? "w-8 bg-gradient-to-r from-[#2de2ff] to-[#ff3fb4]" : "w-4 bg-white/20 hover:bg-white/40"}`}
                  />
                ))}
              </div>
              <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} aria-label="Next" className="grid h-9 w-11 -skew-x-12 place-items-center rounded-md border border-white/15 bg-white/5 transition hover:bg-white/15 disabled:opacity-30" disabled={page === pages - 1}>
                <span className="skew-x-12">▶</span>
              </button>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
