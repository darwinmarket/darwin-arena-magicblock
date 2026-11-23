"use client";

// Onglet 3 : YOUR RANK · PROGRESSION · RANKS (matrice paliers x divisions III/II/I)
import { Panel, ProgressBar } from "@/components/ui";
import { RankEmblem } from "@/components/game/emblems";
import { POINTS, PROGRESSION, TIERS } from "@/lib/mock";
import type { Division, RankTier } from "@/lib/types";
import { useProfile } from "@/lib/store";

const DIVISIONS = ["III", "II", "I"] as const;

export function RankTab() {
  const { me } = useProfile();
  const { tier, division, points } = me.rank;
  const next = TIERS[TIERS.indexOf(tier) + 1] ?? tier;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-[1fr_2fr]">
        <Panel title="Your rank">
          <div className="flex flex-col items-center py-4">
            <RankEmblem tier={tier} division={division} size={120} />
            <div className="mt-4 font-display text-3xl font-bold uppercase">
              {tier} {division}
            </div>
            <div className="text-sm font-bold italic text-neutral-400">{points} PTS</div>
          </div>
        </Panel>

        <Panel title="Progression">
          <div className="flex items-center justify-between text-4xl">
            <RankEmblem tier={tier} division={division} size={56} />
            <RankEmblem tier={next} size={56} showDivision={false} />
          </div>
          <ProgressBar value={points - PROGRESSION.from} max={PROGRESSION.to - PROGRESSION.from} className="my-4 h-4" />
          <div className="flex justify-between text-sm font-bold">
            <span>{PROGRESSION.from} PTS</span>
            <span>{PROGRESSION.to} PTS</span>
          </div>
          <div className="mt-5 flex justify-center gap-10 font-black">
            <span>
              🏆 WIN = <span className="text-green-400">+{POINTS.win} PTS</span>
            </span>
            <span>
              💀 LOSS = <span className="text-red-400">{POINTS.loss} PTS</span>
            </span>
          </div>
        </Panel>
      </div>

      <Panel title="Ranks">
        <div className="grid grid-cols-[auto_repeat(8,1fr)] items-center gap-y-4 text-center">
          <span />
          {TIERS.map((t) => (
            <span key={t} className={`text-[11px] font-black uppercase ${t === tier ? "text-amber-400" : ""}`}>
              {t}
            </span>
          ))}
          {DIVISIONS.map((d, row) => (
            <Row key={d} label={d} row={row} current={{ tier, division }} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Row({
  label,
  row,
  current,
}: {
  label: string;
  row: number;
  current: { tier: string; division: string | null };
}) {
  return (
    <>
      <span className="pr-3 text-xs font-black">{label}</span>
      {TIERS.map((t) => {
        // Darwinian = division unique (comme "Unreal" dans la référence)
        if (t === "Darwinian" && row > 0) return <span key={t} />;
        const isCurrent = t === current.tier && label === current.division;
        return (
          <span
            key={t}
            className={`mx-auto grid place-items-center rounded-xl p-1 ${isCurrent ? "bg-white/10 ring-2 ring-[#ffc861]" : ""}`}
          >
            <RankEmblem tier={t as RankTier} division={(t === "Darwinian" ? null : label) as Division} size={44 - row * 6} />
          </span>
        );
      })}
    </>
  );
}
