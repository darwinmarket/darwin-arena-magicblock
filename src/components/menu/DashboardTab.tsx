"use client";

// Onglet 1 : VERSUS · STATS OVERVIEW · LAST MATCHES
// L'œil sur une carte joueur bascule les stats affichées (moi ou l'adversaire).
import { useState } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { Panel, StatTile, pct } from "@/components/ui";
import { MATCHES, OPPONENT, STATS } from "@/lib/mock";
import { useProfile } from "@/lib/store";
import type { Match } from "@/lib/types";

const ROW_TONE: Record<Match["result"], string> = {
  VICTORY: "border-green-500 from-green-900/60 text-green-400",
  DEFEAT: "border-red-500 from-red-900/60 text-red-400",
  DRAW: "border-amber-500 from-amber-900/60 text-amber-400",
};

export function DashboardTab() {
  const { me } = useProfile();
  const [viewing, setViewing] = useState<"me" | "opp">("me");
  const [openMatch, setOpenMatch] = useState<Match | null>(null);

  const stats = STATS[viewing];
  const matches = MATCHES[viewing];
  const viewingName = viewing === "me" ? me.name : OPPONENT.name;
  const last = MATCHES.me[0];

  const eyeLabel = (
    <span className="text-sm font-black italic text-amber-400">
      {viewingName} 👁
    </span>
  );

  return (
    <div className="space-y-5">
      <Panel title="Versus">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
          <PlayerCard player={me} selected={viewing === "me"} onEye={() => setViewing("me")} eyeActive={viewing === "me"} />
          <div className="text-center font-black italic">
            <div className="text-5xl">
              {pct(last.myScore)} <span className="text-2xl">vs</span> {pct(last.oppScore)}
            </div>
            <div className="mt-1 text-xs text-neutral-400">LAST DUEL <span className="ml-2 text-white/70">{last.stake} USDC</span></div>
          </div>
          <PlayerCard
            player={OPPONENT}
            mirrored
            selected={viewing === "opp"}
            onEye={() => setViewing("opp")}
            eyeActive={viewing === "opp"}
          />
        </div>
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Stats overview" right={eyeLabel}>
          <div className="mb-4 grid grid-cols-4 text-sm">
            {[
              ["Wins", stats.wins],
              ["Losses", stats.losses],
              ["Survived", stats.survived],
              ["Extinct", stats.extinct],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-neutral-400">{k}</div>
                <div className="text-xl font-black">{v}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Winrate" value={`${stats.winrate}%`} icon="◔" tone="green" />
            <StatTile label="Streak" value={`${stats.streak}`} icon="🔥" tone="orange" />
            <StatTile label="Avg return" value={pct(stats.avgReturn)} icon="📈" tone="teal" />
            <StatTile label="Best basket" value={pct(stats.bestBasket)} icon="🧺" tone="purple" />
          </div>
        </Panel>

        <Panel title="Last matches" right={eyeLabel}>
          <div className="space-y-2">
            {matches.map((m) => (
              <button
                key={m.id}
                onClick={() => setOpenMatch(m)}
                className={`grid w-full grid-cols-[1.4fr_1fr_0.8fr_0.8fr] items-center rounded-xl border-2 bg-gradient-to-r to-transparent px-4 py-2 text-left ${ROW_TONE[m.result]}`}
              >
                <span className="text-lg font-black italic">{m.result}</span>
                <Cell label="Score" value={`${pct(m.myScore)} : ${pct(m.oppScore)}`} />
                <Cell label="Stake" value={`${m.stake} USDC`} />
                <Cell label="Date" value={m.date} />
              </button>
            ))}
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
      <span className="block text-[10px] font-bold uppercase text-neutral-400">{label}</span>
      <span className="whitespace-nowrap font-black text-white">{value}</span>
    </span>
  );
}

/** Ajout Darwin : au clic sur un match, on revoit le panier joué. */
function MatchDetail({ match, onClose }: { match: Match; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-neutral-900 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-black italic uppercase">{match.result}</h3>
          <button onClick={onClose} className="text-2xl font-black">✕</button>
        </div>
        <p className="mb-4 text-sm text-neutral-400">
          vs {match.opponent} on {match.date} for {match.stake} USDC
        </p>
        <div className="mb-4 text-3xl font-black">
          {pct(match.myScore)} <span className="text-base text-neutral-400">vs</span> {pct(match.oppScore)}
        </div>
        <h4 className="mb-2 text-sm font-black uppercase">Basket played</h4>
        <div className="space-y-2">
          {match.basket.map((l) => (
            <div key={l.symbol} className="flex items-center gap-3">
              <span className="w-14 font-bold">{l.symbol}</span>
              <div className="h-3 flex-1 rounded-full bg-neutral-700">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${l.weight}%` }} />
              </div>
              <span className="w-10 text-right">{l.weight}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
