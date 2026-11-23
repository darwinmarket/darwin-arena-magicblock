"use client";

// LA pièce maîtresse, réutilisée partout (Versus, Profil, Duel, Résultat) :
// fond = bannière équipée · avatar + écusson de rang · pseudo + rang · vitrine 2x2 de trophées · œil.
import { BadgeEmblem, BADGE_ART, rarityColor, rarityLabel } from "@/components/game/emblems";
import { RankEmblem } from "@/components/game/emblems";
import { Tooltip } from "@/components/ui";
import { BADGES, BANNERS } from "@/lib/mock";
import type { Player } from "@/lib/types";

// Bannières : dégradé + couleur de liseré + motif
const BANNER_STYLE: Record<string, { bg: string; edge: string }> = {
  grey: { bg: "linear-gradient(115deg, #3a3550 0%, #1a1530 55%, #0e0a1c 100%)", edge: "#9a94b8" },
  teal: { bg: "linear-gradient(115deg, #0a5a6e 0%, #0d2a44 55%, #0b0f24 100%)", edge: "#2de2ff" },
  red: { bg: "linear-gradient(115deg, #7a1230 0%, #3a0c2a 55%, #140818 100%)", edge: "#ff3b5c" },
  purple: { bg: "linear-gradient(115deg, #6a1a8c 0%, #2e0f4a 55%, #110822 100%)", edge: "#ff3fb4" },
};

function bannerStyle(bannerId: string) {
  const color = BANNERS.find((b) => b.id === bannerId)?.color ?? "grey";
  return BANNER_STYLE[color];
}
/** Compat : ancien helper utilisé par l'onglet Profil */
export function bannerClass(bannerId: string) {
  return BANNERS.find((b) => b.id === bannerId)?.color ?? "grey";
}
export function bannerCss(bannerId: string) {
  return bannerStyle(bannerId);
}

/** Avatar : monogramme dans un médaillon aux couleurs de la bannière */
export function Avatar({ player, size = 72 }: { player: Player; size?: number }) {
  const s = bannerStyle(player.bannerId);
  const initials = player.name.replace(/\.sol$/, "").slice(0, 2).toUpperCase();
  return (
    <div
      className="grid place-items-center rounded-full font-display font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `radial-gradient(circle at 35% 30%, ${s.edge}55, #0b0716 70%)`,
        boxShadow: `inset 0 0 0 2px ${s.edge}, 0 0 18px -4px ${s.edge}`,
      }}
    >
      {initials}
    </div>
  );
}

export function PlayerCard({
  player,
  mirrored = false,
  selected = false,
  onEye,
  eyeActive,
}: {
  player: Player;
  mirrored?: boolean; // carte adverse : avatar à droite
  selected?: boolean;
  onEye?: () => void;
  eyeActive?: boolean;
}) {
  const s = bannerStyle(player.bannerId);
  const { tier, division, points } = player.rank;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 transition ${selected ? "ring-2 ring-[#ffc861]" : ""}`}
      style={{ background: s.bg, borderColor: `${s.edge}99`, boxShadow: `0 0 24px -10px ${s.edge}` }}
    >
      {/* motif de bannière : lignes diagonales + grain de lumière */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{ backgroundImage: "repeating-linear-gradient(115deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 14px)" }}
      />
      <div className={`relative flex items-center gap-4 ${mirrored ? "flex-row-reverse text-right" : ""}`}>
        {/* Avatar + écusson de rang */}
        <div className="relative">
          <Avatar player={player} />
          <div className={`absolute -bottom-3 ${mirrored ? "-left-3" : "-right-3"}`}>
            <RankEmblem tier={tier} division={division} size={38} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-xl font-bold leading-tight">{player.name}</div>
          <div className="font-display text-xs font-semibold uppercase tracking-widest" style={{ color: s.edge }}>
            {tier} {division ?? ""}
            <span className="ml-2 text-white/50">{points} RP</span>
          </div>
        </div>

        {/* Vitrine 2x2 de trophées */}
        <div className="grid grid-cols-2 gap-x-1.5 gap-y-1">
          {player.showcase.map((id, i) => {
            const badge = BADGES.find((b) => b.id === id);
            return badge ? (
              <Tooltip
                key={i}
                content={
                  <>
                    <div className="font-display font-bold">{badge.name}</div>
                    <div className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: rarityColor(BADGE_ART[badge.id].rarity) }}>
                      {rarityLabel(BADGE_ART[badge.id].rarity)}
                    </div>
                    <div className="text-white/60">{badge.condition}</div>
                  </>
                }
              >
                <BadgeEmblem badgeId={badge.id} size={34} showStars={false} />
              </Tooltip>
            ) : (
              <div key={i} className="grid h-[37px] w-[34px] place-items-center opacity-40">
                <svg viewBox="0 0 100 110" className="h-full w-full">
                  <polygon points="50,4 92,28 92,76 50,100 8,76 8,28" fill="none" stroke="white" strokeWidth="4" strokeDasharray="8 6" />
                </svg>
              </div>
            );
          })}
        </div>
      </div>

      {onEye && (
        <button
          onClick={onEye}
          className={`absolute top-2 ${mirrored ? "left-3" : "right-3"} text-sm transition ${eyeActive ? "opacity-100" : "opacity-50 hover:opacity-80"}`}
          title="Show stats"
        >
          👁
        </button>
      )}
    </div>
  );
}
