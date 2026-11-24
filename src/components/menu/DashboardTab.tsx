"use client";

// Onglet 1, le cockpit : dernière course (grille de départ), télémétrie (compte tours du winrate
// et instruments), journal des courses. L'œil d'une carte pilote bascule la télémétrie affichée.
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import Link from "next/link";
import { GiCheckeredFlag, GiEyeTarget, GiFlame, GiRaceCar, GiSpeedometer, GiStopwatch, GiTrophyCup } from "react-icons/gi";
import { PlayerCard } from "@/components/PlayerCard";
import { Gauge } from "@/components/game/Gauge";
import { Corners } from "@/components/game/Hud";
import { Panel, StatTile, pct } from "@/components/ui";
import { useArena } from "@/lib/chain/ArenaProvider";
import { usePlayer } from "@/lib/chain/hooks";
import { profilePda } from "@/lib/chain/pdas";
import { matchesFromProfile, statsFromProfile } from "@/lib/chain/profile";
import { useProfile } from "@/lib/store";
import type { Match } from "@/lib/types";

// Classement de la course : P1 pour une victoire, P2 pour une défaite, dead heat pour une égalité.
const PLACE: Record<Match["result"], { tag: string; color: string; word: string }> = {
  VICTORY: { tag: "P1", color: "#ffc861", word: "Victory" },
  DEFEAT: { tag: "P2", color: "#ff3b5c", word: "Defeat" },
  DRAW: { tag: "=", color: "#2de2ff", word: "Dead heat" },
};

export function DashboardTab() {
  const { me } = useProfile();
  const [viewing, setViewing] = useState<"me" | "opp">("me");
  const [openMatch, setOpenMatch] = useState<Match | null>(null);

  // Stats and history straight from the on-chain profiles (mine, and the last rival's).
  const { profile, program } = useArena();
  const myMatches = matchesFromProfile(profile);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastOpp: PublicKey | null = profile && profile.historyLen > 0 ? (profile.history[profile.historyHead] as any).opponent : null;
  const OPPONENT = usePlayer(lastOpp) ?? { ...me, id: "none", name: "No rival yet" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [oppProfile, setOppProfile] = useState<any | null>(null);
  const oppKey = lastOpp?.toBase58();
  useEffect(() => {
    if (!oppKey) return;
    program.account.profile.fetchNullable(profilePda(new PublicKey(oppKey))).then(setOppProfile).catch(() => {});
  }, [oppKey, program]);
  const stats = statsFromProfile(viewing === "me" ? profile : oppProfile);
  const matches = viewing === "me" ? myMatches : matchesFromProfile(oppProfile);
  const viewingName = viewing === "me" ? me.name : OPPONENT.name;
  const last = myMatches[0] ?? { myScore: 0, oppScore: 0, stake: 0 };

  const eyeLabel = (
    <span className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wider text-[#ffc861]">
      <GiEyeTarget className="h-4 w-4" /> {viewingName}
    </span>
  );
  const iWonLast = last.myScore > last.oppScore;

  return (
    <div className="space-y-5">
      <Panel title="Last race">
        {myMatches.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-white/15 px-6 py-10 text-center">
            <GiCheckeredFlag className="h-10 w-10 text-white/40" />
            <p className="font-display text-lg font-bold uppercase italic tracking-wider">No race yet</p>
            <p className="max-w-sm text-sm text-white/55">Draft a basket, line up on the grid and your first race shows up here.</p>
            <Link
              href="/play"
              className="group relative -skew-x-12 overflow-hidden rounded-md bg-gradient-to-r from-[#ff3fb4] via-[#ff6a3d] to-[#ffc861] px-6 py-2.5 font-display font-bold uppercase italic tracking-wider text-[#1a0612] shadow-[0_10px_30px_-8px_#ff3fb4] transition hover:brightness-110"
            >
              <span className="flex skew-x-12 items-center gap-2 whitespace-nowrap">
                <GiRaceCar className="h-5 w-5 transition group-hover:translate-x-1" /> First race
              </span>
            </Link>
          </div>
        ) : (
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
          <PlayerCard player={me} selected={viewing === "me"} onEye={() => setViewing("me")} eyeActive={viewing === "me"} />
          <div className="relative flex flex-col items-center px-6 py-3 text-center">
            <GiCheckeredFlag className="h-9 w-9 text-white drop-shadow-[0_0_12px_#ffc861]" />
            <div className="mt-2 flex items-baseline gap-3 font-display font-bold italic tabular-nums">
              <span className="text-4xl" style={{ color: "#2de2ff", textShadow: "0 0 18px #2de2ff66" }}>{pct(last.myScore)}</span>
              <span className="text-lg text-white/40">vs</span>
              <span className="text-4xl" style={{ color: "#ff3fb4", textShadow: "0 0 18px #ff3fb466" }}>{pct(last.oppScore)}</span>
            </div>
            {myMatches.length > 0 && (
              <span
                className="mt-2 -skew-x-12 rounded-md px-3 py-0.5 font-display text-xs font-bold uppercase tracking-widest text-[#0b0716]"
                style={{ background: iWonLast ? "#ffc861" : "#ff3b5c" }}
              >
                <span className="block skew-x-12">{iWonLast ? "You finished P1" : "You finished P2"}</span>
              </span>
            )}
            <div className="mt-2 font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-white/45">{last.stake} USDC table</div>
          </div>
          <PlayerCard player={OPPONENT} mirrored selected={viewing === "opp"} onEye={() => setViewing("opp")} eyeActive={viewing === "opp"} />
        </div>
        )}
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Telemetry" right={eyeLabel}>
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <Gauge value={stats.winrate} label="Winrate" display={`${stats.winrate}%`} size={190} />
            <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 self-stretch">
              {[
                ["Wins", stats.wins, "#3dff8a"],
                ["Losses", stats.losses, "#ff3b5c"],
                ["Survived", stats.survived, "#2de2ff"],
                ["Extinct", stats.extinct, "#ffc861"],
              ].map(([k, v, c]) => (
                <div key={k as string} className="border-l-2 pl-3" style={{ borderColor: c as string }}>
                  <div className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">{k}</div>
                  <div className="font-display text-3xl font-bold tabular-nums">{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <StatTile label="Hot streak" value={`${stats.streak}`} icon={<GiFlame />} tone="orange" />
            <StatTile label="Avg return" value={pct(stats.avgReturn)} icon={<GiSpeedometer />} tone="teal" />
            <StatTile label="Best basket" value={pct(stats.bestBasket)} icon={<GiTrophyCup />} tone="purple" />
            <StatTile label="Races" value={`${stats.wins + stats.losses}`} icon={<GiStopwatch />} tone="green" />
          </div>
        </Panel>

        <Panel title="Race log" right={eyeLabel}>
          <div className="space-y-2">
            {matches.length === 0 && (
              <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-white/15 py-10 text-center">
                <GiCheckeredFlag className="h-8 w-8 text-white/30" />
                <p className="font-display text-sm uppercase tracking-widest text-white/45">No race on chain yet</p>
              </div>
            )}
            {matches.map((m, i) => {
              const p = PLACE[m.result];
              return (
                <button
                  key={m.id}
                  onClick={() => setOpenMatch(m)}
                  className="arena-rise group relative grid w-full grid-cols-[auto_1.2fr_1fr_0.8fr_0.8fr] items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-black/35 py-2.5 pl-2 pr-4 text-left transition hover:translate-x-1 hover:border-white/25"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span className="absolute inset-y-0 left-0 w-1" style={{ background: p.color, boxShadow: `0 0 12px ${p.color}` }} />
                  <span
                    className="ml-2 grid h-9 w-11 -skew-x-12 place-items-center rounded-md font-display text-lg font-bold italic text-[#0b0716]"
                    style={{ background: p.color }}
                  >
                    <span className="skew-x-12">{p.tag}</span>
                  </span>
                  <span className="font-display text-base font-bold uppercase italic" style={{ color: p.color }}>
                    {p.word}
                  </span>
                  <Cell label="Score" value={`${pct(m.myScore)} : ${pct(m.oppScore)}`} />
                  <Cell label="Table" value={`${m.stake} USDC`} />
                  <Cell label="Date" value={m.date} />
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      {openMatch && <MatchDetail match={openMatch} onClose={() => setOpenMatch(null)} />}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-center">
      <span className="block font-display text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">{label}</span>
      <span className="whitespace-nowrap font-display text-sm font-bold text-white">{value}</span>
    </span>
  );
}

/** Au clic sur une course : le panier qui a roulé. */
function MatchDetail({ match, onClose }: { match: Match; onClose: () => void }) {
  const p = PLACE[match.result];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="arena-pop relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0f0a1d] p-6" onClick={(e) => e.stopPropagation()}>
        <Corners color={p.color} size={12} />
        <div className="race-carbon pointer-events-none absolute inset-0" />
        <div className="relative">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-12 -skew-x-12 place-items-center rounded-md font-display text-xl font-bold italic text-[#0b0716]" style={{ background: p.color }}>
                <span className="skew-x-12">{p.tag}</span>
              </span>
              <h3 className="font-display text-2xl font-bold uppercase italic" style={{ color: p.color }}>
                {p.word}
              </h3>
            </div>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md border border-white/15 font-display font-bold transition hover:bg-white/10">
              ✕
            </button>
          </div>
          <p className="mb-4 text-sm text-white/55">
            Against {match.opponent} on {match.date}, {match.stake} USDC table
          </p>
          <div className="mb-5 flex items-baseline gap-3 font-display text-3xl font-bold italic tabular-nums">
            <span className="text-[#2de2ff]">{pct(match.myScore)}</span>
            <span className="text-base text-white/40">vs</span>
            <span className="text-[#ff3fb4]">{pct(match.oppScore)}</span>
          </div>
          <h4 className="mb-2 font-display text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">Basket on track</h4>
          <div className="space-y-2.5">
            {match.basket.map((l) => (
              <div key={l.symbol} className="flex items-center gap-3">
                <span className="w-14 font-display font-bold">{l.symbol}</span>
                <div className="relative h-2.5 flex-1 overflow-hidden rounded-sm bg-white/10">
                  <div className="h-full bg-gradient-to-r from-[#2de2ff] to-[#ff3fb4]" style={{ width: `${l.weight}%` }} />
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_7px,rgba(11,7,22,0.85)_7px_9px)]" />
                </div>
                <span className="w-10 text-right font-display font-bold tabular-nums">{l.weight}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
