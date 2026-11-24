"use client";

// Onglet 3, le championnat : licence de pilote (rang actuel), route vers le palier suivant
// (la petite voiture avance avec les points), classement façon tour de chronométrage,
// et la grille de toutes les licences (paliers x divisions III/II/I).
import { GiCheckeredFlag, GiTrophyCup } from "react-icons/gi";
import { RankEmblem, TIER_ART } from "@/components/game/emblems";
import { Corners } from "@/components/game/Hud";
import { MiniCar } from "@/components/race/RaceHud";
import { Panel } from "@/components/ui";
import { useArena } from "@/lib/chain/ArenaProvider";
import { useLeaderboard } from "@/lib/chain/hooks";
import { progression } from "@/lib/chain/rank";
import { POINTS, TIERS } from "@/lib/mock";
import type { Division, RankTier } from "@/lib/types";
import { useProfile } from "@/lib/store";

const DIVISIONS = ["III", "II", "I"] as const;
const PODIUM = ["#ffc861", "#cfd6e6", "#e0905a"];

export function RankTab() {
  const { me } = useProfile();
  const { tier, division, points } = me.rank;
  const next = TIERS[TIERS.indexOf(tier) + 1] ?? tier;
  const P = progression(points);
  const k = Math.max(0, Math.min(1, (points - P.from) / Math.max(1, P.to - P.from)));
  const glow = TIER_ART[tier].glow;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-[1fr_2fr]">
        {/* Licence de pilote */}
        <Panel title="Racing license">
          <div className="relative overflow-hidden rounded-xl border border-white/15 p-5" style={{ background: `linear-gradient(135deg, ${glow}33, #0b0716 60%)` }}>
            <Corners color={glow} size={12} />
            <div className="race-checker pointer-events-none absolute -right-6 top-0 h-full w-16 rotate-12 opacity-10" />
            <div className="flex items-center gap-4">
              <RankEmblem tier={tier} division={division} size={96} />
              <div>
                <div className="font-display text-[10px] font-semibold uppercase tracking-[0.35em] text-white/50">Season 1 class</div>
                <div className="font-display text-3xl font-bold uppercase italic leading-none" style={{ textShadow: `0 0 20px ${glow}` }}>
                  {tier} {division}
                </div>
                <div className="mt-2 inline-block -skew-x-12 rounded-md bg-white px-2.5 py-0.5 font-display text-sm font-bold text-[#0b0716]">
                  <span className="block skew-x-12 tabular-nums">{points} PTS</span>
                </div>
              </div>
            </div>
            <div className="mt-4 truncate font-display text-xs uppercase tracking-[0.25em] text-white/45">Driver {me.name}</div>
          </div>
        </Panel>

        {/* Route vers le palier suivant */}
        <Panel title="Road to promotion">
          <div className="flex items-center justify-between">
            <RankEmblem tier={tier} division={division} size={56} />
            <div className="text-center font-display text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">
              {P.to - points} pts to promotion
            </div>
            <RankEmblem tier={next} size={56} showDivision={false} />
          </div>
          <div className="relative my-5 h-12 overflow-hidden rounded-lg border border-white/10 bg-[#140c26]">
            <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.5)_0_14px,transparent_14px_26px)]" />
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#2de2ff]/30 to-[#ff3fb4]/30 transition-[width] duration-1000" style={{ width: `${k * 100}%` }} />
            <div className="race-checker absolute inset-y-0 right-0 w-5 opacity-80" />
            <span className="absolute top-1/2 -translate-x-[70%] -translate-y-1/2 transition-[left] duration-1000" style={{ left: `${Math.max(6, k * 100)}%` }}>
              <MiniCar color="#2de2ff" />
            </span>
          </div>
          <div className="flex justify-between font-display text-sm font-bold tabular-nums text-white/70">
            <span>{P.from} PTS</span>
            <span>{P.to} PTS</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <PitBoard icon={<GiTrophyCup />} label="Finish P1" value={`+${POINTS.win} PTS`} color="#3dff8a" />
            <PitBoard icon={<GiCheckeredFlag />} label="Finish P2" value={`${POINTS.loss} PTS`} color="#ff3b5c" />
          </div>
        </Panel>
      </div>

      <Standings />

      <Panel title="All licenses">
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-[auto_repeat(8,1fr)] items-center gap-y-4 text-center">
            <span />
            {TIERS.map((t) => (
              <span key={t} className={`font-display text-[11px] font-bold uppercase italic tracking-wider ${t === tier ? "text-[#ffc861]" : "text-white/60"}`}>
                {t}
              </span>
            ))}
            {DIVISIONS.map((d, row) => (
              <Row key={d} label={d} row={row} current={{ tier, division }} />
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function PitBoard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-4 py-3" style={{ boxShadow: `inset 0 0 26px -16px ${color}` }}>
      <span className="text-2xl" style={{ color, filter: `drop-shadow(0 0 6px ${color})` }}>
        {icon}
      </span>
      <div>
        <div className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">{label}</div>
        <div className="font-display text-lg font-bold tabular-nums" style={{ color }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Row({ label, row, current }: { label: string; row: number; current: { tier: string; division: string | null } }) {
  return (
    <>
      <span className="pr-3 font-display text-xs font-bold text-white/60">{label}</span>
      {TIERS.map((t) => {
        // Darwinian = division unique
        if (t === "Darwinian" && row > 0) return <span key={t} />;
        const isCurrent = t === current.tier && label === current.division;
        return (
          <span
            key={t}
            className={`mx-auto grid place-items-center rounded-xl p-1 transition hover:scale-110 ${isCurrent ? "bg-[#ffc861]/10 ring-2 ring-[#ffc861] shadow-[0_0_20px_-4px_#ffc861]" : ""}`}
          >
            <RankEmblem tier={t as RankTier} division={(t === "Darwinian" ? null : label) as Division} size={44 - row * 6} />
          </span>
        );
      })}
    </>
  );
}

/** Classement façon tour de chronométrage : tous les pilotes avec une course onchain. */
function Standings() {
  const rows = useLeaderboard();
  const { wallet } = useArena();
  return (
    <Panel title="Standings" right={<span className="font-display text-[11px] uppercase tracking-[0.2em] text-white/45">{rows.length} drivers on chain</span>}>
      {rows.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-white/15 py-10">
          <GiCheckeredFlag className="h-8 w-8 text-white/30" />
          <p className="font-display text-sm uppercase tracking-widest text-white/45">No race settled yet</p>
        </div>
      ) : (
        <div className="max-h-96 space-y-1.5 overflow-auto pr-1">
          {rows.slice(0, 50).map((r, i) => {
            const me = wallet?.equals(r.key);
            const pod = PODIUM[i];
            const gap = i === 0 ? "Leader" : `${r.points - rows[0].points} pts`;
            return (
              <div
                key={r.key.toBase58()}
                className={`arena-rise relative grid grid-cols-[3rem_auto_1fr_auto_auto] items-center gap-3 overflow-hidden rounded-xl border py-2 pl-1 pr-4 transition hover:translate-x-1 ${
                  me ? "border-[#2de2ff]/60 bg-[#2de2ff]/10 shadow-[0_0_24px_-10px_#2de2ff]" : "border-white/5 bg-black/30"
                }`}
                style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
              >
                <span
                  className="grid h-9 -skew-x-12 place-items-center rounded-md font-display text-lg font-bold italic"
                  style={pod ? { background: pod, color: "#0b0716", boxShadow: `0 0 16px -4px ${pod}` } : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}
                >
                  <span className="skew-x-12">{i + 1}</span>
                </span>
                <RankEmblem tier={r.player.rank.tier} division={r.player.rank.division} size={32} />
                <span className="truncate font-display font-bold">
                  {r.player.name}
                  {me && <span className="ml-2 font-display text-[10px] uppercase tracking-widest text-[#2de2ff]">you</span>}
                </span>
                <span className="hidden font-display text-xs uppercase tracking-wider text-white/50 sm:block">
                  {r.wins}W {r.losses}L <span className="ml-2 text-white/35">{r.games ? Math.round((r.wins / r.games) * 100) : 0}%</span>
                </span>
                <span className="w-24 text-right">
                  <span className="block font-display font-bold tabular-nums">{r.points} PTS</span>
                  <span className="block font-display text-[10px] uppercase tracking-wider text-white/40">{gap}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
