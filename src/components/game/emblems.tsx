"use client";

// Emblèmes du jeu, dessinés en SVG (pas d'images générées) :
//  - BadgeEmblem : trophée hexagonal, cadre métal selon la rareté, glyphe Game-icons (CC BY 3.0)
//    rempli en dégradé, étoiles de rareté sur le ruban ;
//  - RankEmblem : écusson du palier d'évolution (Cell -> Darwinian) + division en chiffres romains.
import { useId } from "react";
import type { IconType } from "react-icons";
import {
  GiArcheryTarget,
  GiBasket,
  GiCoins,
  GiCrossedSwords,
  GiCrosshair,
  GiCutDiamond,
  GiDna1,
  GiDoubleFish,
  GiEagleHead,
  GiFlame,
  GiFrog,
  GiGorilla,
  GiLizardTongue,
  GiMedal,
  GiMegaphone,
  GiOwl,
  GiReturnArrow,
  GiSandsOfTime,
  GiScales,
  GiShield,
  GiSittingDog,
  GiSprout,
  GiStarsStack,
  GiSun,
  GiTRexSkull,
  GiTrophyCup,
  GiTwoCoins,
  GiChemicalDrop,
  GiVirus,
  GiWhaleTail,
  GiWolfHead,
} from "react-icons/gi";
import type { Badge, Division, RankTier } from "@/lib/types";

// ---------- Raretés ----------
export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

const RARITY: Record<Rarity, { label: string; stars: number; frame: string[]; core: string[]; glyph: string[]; glow: string }> = {
  common: { label: "Common", stars: 1, frame: ["#ffd6a8", "#c47a3e", "#6b3412"], core: ["#3a2214", "#170b06"], glyph: ["#ffe2bf", "#d9904f"], glow: "#e08a45" },
  rare: { label: "Rare", stars: 2, frame: ["#e6fdff", "#4fc6e8", "#13425a"], core: ["#0f2f44", "#06121c"], glyph: ["#f2feff", "#62d7f5"], glow: "#2de2ff" },
  epic: { label: "Epic", stars: 3, frame: ["#ffd3f4", "#e04cc0", "#4d0c45"], core: ["#3b0b36", "#14040f"], glyph: ["#fff0fb", "#ff6fd8"], glow: "#ff3fb4" },
  legendary: { label: "Legendary", stars: 4, frame: ["#fff6cf", "#f5b93d", "#6e3f05"], core: ["#3d2504", "#140c02"], glyph: ["#fffbe6", "#ffcf5a"], glow: "#ffc23d" },
  mythic: { label: "Mythic", stars: 5, frame: ["#7ff7ff", "#ff5fd2", "#ffd35a"], core: ["#1d0b34", "#07030f"], glyph: ["#ffffff", "#b9f6ff"], glow: "#c07bff" },
};
export const rarityLabel = (r: Rarity) => RARITY[r].label;
export const rarityColor = (r: Rarity) => RARITY[r].glow;

// ---------- Badges : glyphe + rareté ----------
export const BADGE_ART: Record<string, { icon: IconType; rarity: Rarity }> = {
  "first-win": { icon: GiTrophyCup, rarity: "common" },
  survivor: { icon: GiShield, rarity: "rare" },
  streak: { icon: GiFlame, rarity: "epic" },
  veteran: { icon: GiMedal, rarity: "rare" },
  grinder: { icon: GiSandsOfTime, rarity: "common" },
  mutant: { icon: GiChemicalDrop, rarity: "epic" },
  diversifier: { icon: GiBasket, rarity: "rare" },
  "all-in": { icon: GiArcheryTarget, rarity: "epic" },
  comeback: { icon: GiReturnArrow, rarity: "rare" },
  revenger: { icon: GiCrossedSwords, rarity: "rare" },
  whale: { icon: GiWhaleTail, rarity: "legendary" },
  rebalancer: { icon: GiScales, rarity: "rare" },
  minter: { icon: GiTwoCoins, rarity: "epic" },
  sniper: { icon: GiCrosshair, rarity: "legendary" },
  early: { icon: GiSprout, rarity: "common" },
  diamond: { icon: GiCutDiamond, rarity: "epic" },
  "sol-maxi": { icon: GiSun, rarity: "rare" },
  memelord: { icon: GiSittingDog, rarity: "epic" },
  bluechip: { icon: GiCoins, rarity: "rare" },
  flawless: { icon: GiStarsStack, rarity: "legendary" },
  "night-owl": { icon: GiOwl, rarity: "rare" },
  social: { icon: GiMegaphone, rarity: "common" },
  apex: { icon: GiTRexSkull, rarity: "legendary" },
  darwinian: { icon: GiDna1, rarity: "mythic" },
};

const HEX_OUT = "50,4 92,28 92,76 50,100 8,76 8,28";
const HEX_MID = "50,10 86.5,31 86.5,73 50,94 13.5,73 13.5,31";
const HEX_IN = "50,16 81,34 81,70 50,88 19,70 19,34";

function Star({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${x + rr * Math.cos(a)},${y + rr * Math.sin(a)}`;
  }).join(" ");
  return <polygon points={pts} fill={fill} />;
}

/** Trophée hexagonal. `locked` = pas encore obtenu (silhouette + cadenas). */
export function BadgeEmblem({
  badgeId,
  size = 56,
  locked = false,
  showStars = true,
}: {
  badgeId: string;
  size?: number;
  locked?: boolean;
  showStars?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const art = BADGE_ART[badgeId];
  if (!art) return null;
  const r = RARITY[art.rarity];
  const Icon = art.icon;
  const id = (k: string) => `${k}-${uid}`;
  const h = size * 1.1;

  return (
    <div
      className="relative shrink-0"
      style={{
        width: size,
        height: h,
        filter: locked ? "grayscale(1) brightness(0.55)" : `drop-shadow(0 0 ${size * 0.12}px ${r.glow}99)`,
      }}
    >
      <svg viewBox="0 0 100 110" width={size} height={h} className="absolute inset-0">
        <defs>
          <linearGradient id={id("frame")} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor={r.frame[0]} />
            <stop offset="0.45" stopColor={r.frame[1]} />
            <stop offset="1" stopColor={r.frame[2]} />
          </linearGradient>
          <radialGradient id={id("core")} cx="0.5" cy="0.35" r="0.75">
            <stop offset="0" stopColor={r.core[0]} />
            <stop offset="1" stopColor={r.core[1]} />
          </radialGradient>
          <linearGradient id={id("glyph")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={r.glyph[0]} />
            <stop offset="1" stopColor={r.glyph[1]} />
          </linearGradient>
          <linearGradient id={id("shine")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* cadre métal + biseau */}
        <polygon points={HEX_OUT} fill={`url(#${id("frame")})`} />
        <polygon points={HEX_MID} fill="#000" opacity="0.35" />
        <polygon points={HEX_IN} fill={`url(#${id("core")})`} stroke={r.frame[1]} strokeOpacity="0.6" strokeWidth="1" />
        {/* reflet sur la moitié haute */}
        <polygon points="50,16 81,34 81,46 19,46 19,34" fill={`url(#${id("shine")})`} opacity="0.5" />
        {/* rivets */}
        {[[50, 7], [89, 29.5], [89, 74.5], [11, 74.5], [11, 29.5]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.6" fill={r.frame[0]} opacity="0.9" />
        ))}
        {/* ruban + étoiles de rareté */}
        {showStars && (
          <g>
            <path d="M22 92 L78 92 L74 104 L26 104 Z" fill={`url(#${id("frame")})`} />
            <path d="M25 94 L75 94 L72 102 L28 102 Z" fill={r.core[1]} />
            {Array.from({ length: r.stars }, (_, i) => (
              <Star key={i} x={50 + (i - (r.stars - 1) / 2) * 8} y={98} r={3.2} fill={r.glyph[1]} />
            ))}
          </g>
        )}
      </svg>
      {/* glyphe Game-icons rempli en dégradé */}
      <div className="absolute grid place-items-center" style={{ left: "24%", right: "24%", top: "19%", height: "48%" }}>
        <Icon style={{ width: "100%", height: "100%", fill: `url(#${id("glyph")})` }} />
      </div>
      {locked && (
        <div
          className="absolute grid place-items-center rounded-full bg-black/80 text-white ring-1 ring-white/30"
          style={{ width: size * 0.34, height: size * 0.34, right: -size * 0.04, bottom: size * 0.12, fontSize: size * 0.18 }}
        >
          <svg viewBox="0 0 24 24" width="60%" height="60%" fill="currentColor">
            <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z" />
          </svg>
        </div>
      )}
    </div>
  );
}

export function isUnlocked(b: Badge) {
  return b.progress >= b.goal;
}

// ---------- Rangs ----------
export const TIER_ART: Record<RankTier, { icon: IconType; colors: [string, string, string]; glow: string }> = {
  Cell: { icon: GiVirus, colors: ["#d9ffe8", "#5fbf8a", "#1d4a33"], glow: "#5fbf8a" },
  Fish: { icon: GiDoubleFish, colors: ["#d6f8ff", "#3fb5d9", "#0f3a52"], glow: "#3fb5d9" },
  Amphibian: { icon: GiFrog, colors: ["#eaffc9", "#7fd23c", "#244a0d"], glow: "#7fd23c" },
  Reptile: { icon: GiLizardTongue, colors: ["#d3fff3", "#21d3a5", "#06493a"], glow: "#21d3a5" },
  Mammal: { icon: GiWolfHead, colors: ["#ffe1c4", "#d8844a", "#5a2a0c"], glow: "#e08a45" },
  Primate: { icon: GiGorilla, colors: ["#f3f6ff", "#9aa8c9", "#2c3550"], glow: "#b8c6ff" },
  Apex: { icon: GiEagleHead, colors: ["#fff6cf", "#f5b93d", "#6e3f05"], glow: "#ffc23d" },
  Darwinian: { icon: GiDna1, colors: ["#7ff7ff", "#ff5fd2", "#ffd35a"], glow: "#c07bff" },
};

const SHIELD = "M50 4 L92 17 V55 C92 80 73 97 50 106 C27 97 8 80 8 55 V17 Z";
const SHIELD_IN = "M50 12 L84 22.5 V55 C84 75 69 89 50 97 C31 89 16 75 16 55 V22.5 Z";

/** Écusson de rang. */
export function RankEmblem({
  tier,
  division,
  size = 64,
  showDivision = true,
}: {
  tier: RankTier;
  division?: Division;
  size?: number;
  showDivision?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const art = TIER_ART[tier];
  const Icon = art.icon;
  const id = (k: string) => `${k}-${uid}`;
  const h = size * 1.08;
  const winged = tier === "Apex" || tier === "Darwinian";

  return (
    <div className="relative shrink-0" style={{ width: size, height: h, filter: `drop-shadow(0 0 ${size * 0.1}px ${art.glow}aa)` }}>
      <svg viewBox="0 0 100 110" width={size} height={h} className="absolute inset-0 overflow-visible">
        <defs>
          <linearGradient id={id("f")} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor={art.colors[0]} />
            <stop offset="0.5" stopColor={art.colors[1]} />
            <stop offset="1" stopColor={art.colors[2]} />
          </linearGradient>
          <radialGradient id={id("c")} cx="0.5" cy="0.3" r="0.8">
            <stop offset="0" stopColor={art.colors[2]} />
            <stop offset="1" stopColor="#07030f" />
          </radialGradient>
          <linearGradient id={id("g")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor={art.colors[0]} />
          </linearGradient>
        </defs>
        {winged && (
          <g fill={`url(#${id("f")})`} opacity="0.95">
            <path d="M8 30 C-6 34 -10 52 -4 66 C0 56 4 50 10 47 Z" />
            <path d="M92 30 C106 34 110 52 104 66 C100 56 96 50 90 47 Z" />
          </g>
        )}
        <path d={SHIELD} fill={`url(#${id("f")})`} />
        <path d={SHIELD_IN} fill={`url(#${id("c")})`} stroke={art.colors[1]} strokeOpacity="0.7" />
        <path d="M50 12 L84 22.5 V40 H16 V22.5 Z" fill="#fff" opacity="0.08" />
      </svg>
      <div className="absolute grid place-items-center" style={{ left: "26%", right: "26%", top: "18%", height: "46%" }}>
        <Icon style={{ width: "100%", height: "100%", fill: `url(#${id("g")})` }} />
      </div>
      {showDivision && division && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-md border px-1.5 font-display font-bold leading-none text-white"
          style={{
            bottom: size * 0.02,
            fontSize: Math.max(9, size * 0.17),
            paddingBlock: size * 0.03,
            background: "#0b0716",
            borderColor: art.colors[1],
            boxShadow: `0 0 8px ${art.glow}88`,
          }}
        >
          {division}
        </div>
      )}
    </div>
  );
}
