"use client";

// Onglet 3 : YOUR RANK · PROGRESSION · RANKS (matrice paliers x divisions III/II/I)
import { Panel, ProgressBar } from "@/components/ui";
import { RankEmblem } from "@/components/game/emblems";
import { useArena } from "@/lib/chain/ArenaProvider";
import { useLeaderboard } from "@/lib/chain/hooks";
import { progression } from "@/lib/chain/rank";
import { POINTS, TIERS } from "@/lib/mock";
import type { Division, RankTier } from "@/lib/types";
import { useProfile } from "@/lib/store";

const DIVISIONS = ["III", "II", "I"] as const;

export function RankTab() {
  const { me } = useProfile();
  const { tier, division, points } = me.rank;
  const next = TIERS[TIERS.indexOf(tier) + 1] ?? tier;
  const PROGRESSION = progression(points);

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

      <Leaderboard />

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

/** Every player with a duel on chain, ranked by points (then wins). */
function Leaderboard() {
  const rows = useLeaderboard();
  const { wallet } = useArena();
  return (
    <Panel title="Leaderboard" right={<span className="text-xs text-neutral-400">{rows.length} players on chain</span>}>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-400">No duel settled yet.</p>
      ) : (
        <div className="max-h-96 space-y-1.5 overflow-auto pr-1">
          {rows.slice(0, 50).map((r, i) => {
            const me = wallet?.equals(r.key);
            return (
              <div
                key={r.key.toBase58()}
                className={`grid grid-cols-[2.5rem_auto_1fr_auto_auto] items-center gap-3 rounded-xl px-3 py-2 ${me ? "bg-[#ffc861]/15 ring-1 ring-[#ffc861]" : "bg-white/5"}`}
              >
                <span className="font-display text-lg font-bold text-white/60">#{i + 1}</span>
                <RankEmblem tier={r.player.rank.tier} division={r.player.rank.division} size={32} />
                <span className="truncate font-display font-bold">
                  {r.player.name}
                  {me && <span className="ml-2 text-xs text-[#ffc861]">you</span>}
                </span>
                <span className="text-sm text-neutral-400">
                  {r.wins}W {r.losses}L · {r.games ? Math.round((r.wins / r.games) * 100) : 0}%
                </span>
                <span className="w-20 text-right font-display font-bold">{r.points} PTS</span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
