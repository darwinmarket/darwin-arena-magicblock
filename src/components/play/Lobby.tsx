"use client";

// Étape 1 : choisir sa table (mise), puis chercher un adversaire. "Find a match" mise
// les USDC on-chain (escrow) et s'assoit à la table : on rejoint le duel qui attend,
// ou on en ouvre un. Un bot du keeper vient s'asseoir après quelques secondes.
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import { GiCrossedSwords, GiCrown, GiSprout } from "react-icons/gi";
import { PlayerCard } from "@/components/PlayerCard";
import { Panel } from "@/components/ui";
import { useArena, type LiveDuel } from "@/lib/chain/ArenaProvider";
import { usePlayer } from "@/lib/chain/hooks";
import { STAKES } from "@/lib/mock";
import { useProfile } from "@/lib/store";

const TABLES: Record<number, { name: string; tag: string; icon: IconType; color: string }> = {
  1: { name: "Rookie Pit", tag: "Warm-up", icon: GiSprout, color: "#3dff8a" },
  5: { name: "The Arena", tag: "Most played", icon: GiCrossedSwords, color: "#2de2ff" },
  20: { name: "High Rollers", tag: "Big stakes", icon: GiCrown, color: "#ffc861" },
};

export function Lobby({ onMatched, live = null }: { onMatched: (stake: number) => void; live?: LiveDuel | null }) {
  const { me } = useProfile();
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { findMatch, cancelWaiting, summonBot, sol, solStatus, currentDuel, setCurrentDuel } = useArena();
  const [summoning, setSummoning] = useState(false);
  const [stake, setStake] = useState(STAKES[1]);
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On-chain state of our seat: waiting at the table, or a rival sat down.
  const seat = live && live.mySlot !== null && live.view.status <= 1 ? live : null;
  const searching = pending || !!seat;
  const found = !!seat?.view.players[1];
  const rival = usePlayer(seat ? seat.view.players[seat.mySlot === 0 ? 1 : 0] : null);
  const OPPONENT = rival ?? me;
  const seatStake = seat?.view.stake;
  useEffect(() => {
    if (seatStake) setStake(seatStake);
  }, [seatStake]);

  useEffect(() => {
    if (!searching || found) return;
    const tick = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(tick);
  }, [searching, found]);

  const find = async () => {
    if (!connected) return setVisible(true);
    setError(null);
    // Test USDC is minted in the stake transaction itself when the wallet has none.
    if (sol !== null && sol < 0.03) return setError(solStatus === "requesting" ? "Getting devnet SOL for you, one second…" : 'This wallet needs devnet SOL to play: click "Get devnet SOL" in the top bar.');
    setPending(true);
    try {
      setElapsed(0);
      await findMatch(stake);
    } catch (e) {
      setError(String((e as Error).message).slice(0, 160));
      setCurrentDuel(null);
    } finally {
      setPending(false);
    }
  };
  const practice = async () => {
    if (currentDuel === null) return;
    setSummoning(true);
    setError(null);
    try {
      await summonBot(currentDuel);
    } catch (e) {
      setError(String((e as Error).message).slice(0, 160));
    } finally {
      setSummoning(false);
    }
  };
  const leave = async () => {
    if (currentDuel === null) return;
    try {
      await cancelWaiting(currentDuel);
    } catch (e) {
      setError(String((e as Error).message).slice(0, 160));
    }
  };

  // 3, 2, 1 avant le draft
  useEffect(() => {
    if (!found) return;
    if (countdown === 0) return onMatched(stake);
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [found, countdown, stake, onMatched]);

  return (
    <div className="space-y-5">
      <Panel title="Choose your table">
        <div className="grid gap-3 md:grid-cols-3">
          {STAKES.map((s) => {
            const t = TABLES[s];
            const Icon = t.icon;
            const active = stake === s;
            return (
              <button
                key={s}
                disabled={searching}
                onClick={() => setStake(s)}
                className="group relative overflow-hidden rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed"
                style={{
                  borderColor: active ? t.color : "rgba(255,255,255,0.1)",
                  background: active
                    ? `radial-gradient(120% 90% at 0% 0%, ${t.color}33, #120a24 60%)`
                    : "rgba(255,255,255,0.02)",
                  boxShadow: active ? `0 0 0 1px ${t.color}, 0 0 30px -8px ${t.color}` : undefined,
                }}
              >
                <div className="flex items-start justify-between">
                  <Icon className="h-10 w-10" style={{ color: t.color, filter: `drop-shadow(0 0 8px ${t.color})` }} />
                  <span
                    className="rounded-full border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest"
                    style={{ borderColor: `${t.color}66`, color: t.color }}
                  >
                    {t.tag}
                  </span>
                </div>
                <div className="mt-4 font-display text-sm font-semibold uppercase tracking-widest text-white/60">{t.name}</div>
                <div className="font-display text-4xl font-bold">
                  {s} <span className="text-lg text-white/50">USDC</span>
                </div>
                <div className="mt-2 text-sm text-white/60">
                  Winner takes <span className="font-bold text-white">{(s * 2 * 0.95).toFixed(2)} USDC</span>
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel
        title={found ? "Opponent found" : searching ? "Scanning the arena" : "Find an opponent"}
        right={
          searching && !found ? (
            <span className="font-display text-sm text-white/60">
              0:{String(elapsed).padStart(2, "0")}
            </span>
          ) : null
        }
      >
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
          <PlayerCard player={me} />
          <div className="arena-vs text-center font-display text-5xl font-bold italic">VS</div>
          {found ? (
            <div className="arena-pop">
              <PlayerCard player={OPPONENT} mirrored />
            </div>
          ) : (
            <Radar active={searching} />
          )}
        </div>

        {found ? (
          <div className="mt-6 text-center font-display text-2xl font-bold uppercase tracking-widest">
            Draft starts in <span className="text-[#ffc861]">{countdown}</span>
          </div>
        ) : (
          <div className="mt-6 flex gap-3">
            <button
              disabled={searching}
              onClick={find}
              className="flex-1 rounded-2xl bg-gradient-to-r from-[#ff3fb4] via-[#ff6a3d] to-[#ffc861] py-4 font-display text-xl font-bold uppercase tracking-wider text-[#1a0612] shadow-[0_10px_40px_-10px_#ff3fb4] transition hover:brightness-110 disabled:opacity-60"
            >
              {pending ? "Staking…" : searching ? "Searching…" : connected ? `Find a match for ${stake} USDC` : "Connect wallet to play"}
            </button>
            {seat && !found ? (
              <button
                className="rounded-2xl border border-white/15 bg-white/5 px-6 font-display font-bold uppercase tracking-wider transition hover:bg-white/10"
                onClick={leave}
              >
                Leave table
              </button>
            ) : (
              <button
                disabled={searching}
                className="rounded-2xl border border-white/15 bg-white/5 px-6 font-display font-bold uppercase tracking-wider transition hover:bg-white/10 disabled:opacity-50"
                onClick={() => navigator.clipboard?.writeText(location.href)}
              >
                Invite a friend
              </button>
            )}
          </div>
        )}
        {seat && !found && elapsed >= 10 && (
          <button
            onClick={practice}
            disabled={summoning}
            className="mt-3 w-full rounded-2xl border border-[#2de2ff]/40 bg-[#2de2ff]/10 py-3 font-display text-sm font-bold uppercase tracking-wider text-[#2de2ff] transition hover:bg-[#2de2ff]/20 disabled:opacity-50"
          >
            {summoning ? "Practice bot is sitting down…" : "Nobody around? Play the practice bot"}
          </button>
        )}
        {error && <p className="mt-3 text-center text-sm text-[#ff3b5c]">{error}</p>}
      </Panel>
    </div>
  );
}

/** Emplacement adverse : radar qui balaye pendant la recherche */
function Radar({ active }: { active: boolean }) {
  return (
    <div className="relative grid h-[118px] place-items-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-black/30">
      {active ? (
        <>
          <div className="absolute h-56 w-56">
            {[0, 0.8, 1.6].map((d) => (
              <div
                key={d}
                className="arena-ping absolute inset-0 rounded-full border border-[#2de2ff]/60"
                style={{ animationDelay: `${d}s` }}
              />
            ))}
            <div
              className="arena-sweep absolute inset-0 rounded-full"
              style={{ background: "conic-gradient(from 0deg, transparent 0deg, rgba(45,226,255,0.35) 40deg, transparent 70deg)" }}
            />
          </div>
          <span className="relative font-display text-sm font-semibold uppercase tracking-widest text-[#2de2ff]">
            Looking for a worthy rival…
          </span>
        </>
      ) : (
        <span className="font-display text-sm uppercase tracking-widest text-white/40">Your rival appears here</span>
      )}
    </div>
  );
}
