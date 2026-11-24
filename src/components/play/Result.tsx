"use client";

// Étape 4, le podium : verdict de la course, les deux pilotes sur leur marche (P1 / P2),
// gains et points, panier qui a roulé, puis les actions (rejouer, dashboard, partager,
// revoir, et réclamer ou frapper le trophée quand la chaîne a réglé le duel).
import Link from "next/link";
import { useEffect, useState } from "react";
import { GiCheckeredFlag, GiLaurelsTrophy, GiRaceCar, GiSteeringWheel } from "react-icons/gi";
import { Avatar } from "@/components/PlayerCard";
import { RankEmblem } from "@/components/game/emblems";
import { Corners, GLASS } from "@/components/game/Hud";
import { TokenCoin } from "@/components/game/TokenCoin";
import { ME, OPP } from "@/components/race/RaceHud";
import { pct } from "@/components/ui";
import { useArena, type LiveDuel } from "@/lib/chain/ArenaProvider";
import { STATUS } from "@/lib/chain/constants";
import { friendlyError } from "@/lib/chain/errors";
import { usePlayer } from "@/lib/chain/hooks";
import { duelPda, trophyPda } from "@/lib/chain/pdas";
import { duelUrl, explorerAddress, shareOnX } from "@/lib/share";
import { POINTS } from "@/lib/mock";
import { useProfile } from "@/lib/store";
import type { Player } from "@/lib/types";
import type { DuelOutcome } from "./Duel";

export function Result({
  outcome,
  stake,
  onRematch,
  live = null,
  rivalName,
}: {
  rivalName?: string;
  outcome: DuelOutcome;
  stake: number;
  onRematch: () => void;
  live?: LiveDuel | null;
}) {
  const { me } = useProfile();
  const { claim, currentDuel, refresh, mintTrophy, base } = useArena();
  const [minted, setMinted] = useState<string | null>(null);
  const [busy, setBusy] = useState<"claim" | "mint" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const view = live?.view;
  const mySlot = live?.mySlot ?? 0;
  const rival: Player = usePlayer(view?.players[mySlot === 0 ? 1 : 0]) ?? { ...me, id: "rival", name: rivalName ?? "Rival" };

  // Verdict de la course (la ligne d'arrivée à 1 minute).
  const draw = Math.abs(outcome.myScore - outcome.oppScore) < 0.005;
  const won = !draw && outcome.myScore > outcome.oppScore;
  const gap = Math.abs(outcome.myScore - outcome.oppScore);
  const prize = (stake * 2 * 0.95).toFixed(2);
  const accent = draw ? "#2de2ff" : won ? "#ffc861" : "#ff3b5c";

  // Ce que la chaîne a réglé (paiement, trophée).
  const settled = view?.status === STATUS.SETTLED && live?.layer === "base";
  const chainWon = !!view && view.winner !== 255 && view.winner === mySlot;
  const chainDraw = !!view && view.winner === 2;
  useEffect(() => {
    if (settled) refresh();
  }, [settled, refresh]);
  useEffect(() => {
    if (currentDuel === null || !settled || !chainWon) return;
    const t = trophyPda(duelPda(currentDuel));
    base.getAccountInfo(t).then((ai) => ai && setMinted(t.toBase58())).catch(() => {});
  }, [currentDuel, settled, chainWon, base]);

  const run = async (kind: "claim" | "mint") => {
    if (currentDuel === null) return;
    setBusy(kind);
    setMsg(null);
    try {
      if (kind === "claim") {
        const sig = await claim(currentDuel);
        setMsg(sig ? "Paid out on Solana" : "Already settled");
      } else {
        await mintTrophy(currentDuel);
        setMinted(trophyPda(duelPda(currentDuel)).toBase58());
      }
    } catch (e) {
      setMsg(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };
  const onShare = () => {
    if (currentDuel === null) return;
    shareOnX({
      result: draw ? "DRAW" : won ? "SURVIVED" : "EXTINCT",
      myScore: outcome.myScore,
      oppScore: outcome.oppScore,
      basket: outcome.myBasket,
      prize: won ? Number(prize) : 0,
      duelId: currentDuel,
    });
  };

  const first = won || draw ? { p: me, s: outcome.myScore, c: ME, you: true } : { p: rival, s: outcome.oppScore, c: OPP, you: false };
  const second = won || draw ? { p: rival, s: outcome.oppScore, c: OPP, you: false } : { p: me, s: outcome.myScore, c: ME, you: true };

  const status = settled
    ? { text: "Settled on Solana, profile updated", color: "#3dff8a", pulse: false }
    : view?.status === STATUS.FINISHED
      ? { text: live?.layer === "er" ? "Sending the result back to Solana" : "Settling on Solana", color: "#ffc861", pulse: true }
      : { text: "Official result syncing on chain", color: "#2de2ff", pulse: true };

  return (
    <div className="mx-auto max-w-4xl">
      <section className={`${GLASS} arena-pop relative rounded-3xl px-5 pb-6 pt-8 sm:px-8`}>
        <Corners color={accent} size={14} />
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="race-carbon absolute inset-0" />
          <div className="race-checker absolute inset-x-0 top-0 h-3 opacity-30" />
          <div className="absolute -top-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full blur-3xl" style={{ background: `${accent}33` }} />
        </div>

        {/* Verdict */}
        <div className="relative text-center">
          <div className="flex items-center justify-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.35em] text-white/50">
            <GiCheckeredFlag className="h-4 w-4" /> Race {currentDuel !== null ? `#${currentDuel}` : ""} finished
          </div>
          <h1
            className="mt-2 bg-clip-text font-display text-6xl font-bold uppercase italic leading-none text-transparent sm:text-7xl"
            style={{
              backgroundImage: draw
                ? "linear-gradient(90deg,#2de2ff,#9d6bff)"
                : won
                  ? "linear-gradient(90deg,#2de2ff,#ff3fb4,#ffc861)"
                  : "linear-gradient(90deg,#ff3fb4,#ff3b5c)",
              filter: `drop-shadow(0 0 24px ${accent}55)`,
            }}
          >
            {draw ? "Dead heat" : won ? "Victory" : "Defeat"}
          </h1>
          <p className="mt-2 font-display text-sm uppercase tracking-[0.2em] text-white/60">
            {draw ? "Same line, same time" : won ? `You crossed first, ${gap.toFixed(2)}% ahead` : `${rival.name} crossed first, ${gap.toFixed(2)}% ahead`}
          </p>
        </div>

        {/* Podium */}
        <div className="relative mt-8 grid grid-cols-2 items-end gap-4">
          <Step place="P1" data={first} height="h-28" delay={150} gold />
          <Step place="P2" data={second} height="h-16" delay={300} />
        </div>

        {/* Gains */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Reward label="Pot" value={draw ? "Refunded" : won ? `+${prize} USDC` : `-${stake} USDC`} color={draw ? "#2de2ff" : won ? "#3dff8a" : "#ff3b5c"} />
          <Reward label="Rank points" value={draw ? "0 PTS" : won ? `+${POINTS.win} PTS` : `${POINTS.loss} PTS`} color={draw ? "#2de2ff" : won ? "#3dff8a" : "#ff3b5c"} />
          <div className="col-span-2 flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-4 py-3 sm:col-span-1">
            <RankEmblem tier={me.rank.tier} division={me.rank.division} size={38} />
            <div>
              <div className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">Your license</div>
              <div className="font-display text-lg font-bold uppercase italic">
                {me.rank.tier} {me.rank.division}
              </div>
            </div>
          </div>
        </div>

        {/* Panier qui a roulé */}
        <div className="relative mt-5 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
          <div className="mb-2 font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">Your basket on track</div>
          <div className="flex flex-wrap gap-2">
            {outcome.myBasket.map((l) => (
              <span key={l.symbol} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3">
                <TokenCoin symbol={l.symbol} size={24} glow={false} />
                <span className="font-display text-sm font-bold">{l.symbol}</span>
                <span className="font-display text-xs text-white/50">{l.weight}%</span>
              </span>
            ))}
          </div>
        </div>

        {/* Actions principales */}
        <div className="sticky bottom-0 z-10 -mx-5 mt-6 grid grid-cols-[1.4fr_1fr] gap-3 rounded-b-2xl bg-gradient-to-t from-[#0b0716] from-60% to-transparent px-5 pb-3 pt-6 sm:static sm:mx-0 sm:bg-none sm:p-0">
          <button
            onClick={onRematch}
            className="group relative -skew-x-6 overflow-hidden rounded-xl bg-gradient-to-r from-[#ff3fb4] via-[#ff6a3d] to-[#ffc861] py-4 font-display text-lg font-bold uppercase italic tracking-wider text-[#1a0612] sm:text-xl shadow-[0_14px_40px_-12px_#ff3fb4] transition hover:brightness-110"
          >
            <span className="arena-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            <span className="relative flex skew-x-6 items-center justify-center gap-3">
              <GiRaceCar className="h-7 w-7 transition group-hover:translate-x-1" /> Race again
            </span>
          </button>
          <Link
            href="/menu"
            className="flex -skew-x-6 items-center justify-center gap-3 rounded-xl border border-white/15 bg-[#140c26]/90 py-4 backdrop-blur font-display text-lg font-bold uppercase italic tracking-wider transition hover:border-[#2de2ff]/60 hover:bg-white/10"
          >
            <span className="flex skew-x-6 items-center gap-3">
              <GiSteeringWheel className="hidden h-6 w-6 text-[#2de2ff] min-[420px]:block" /> Dashboard
            </span>
          </Link>
        </div>

        {/* Actions secondaires + statut onchain */}
        <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <span className="flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: status.color }}>
            <span className={`h-2 w-2 rounded-full ${status.pulse ? "animate-pulse" : ""}`} style={{ background: status.color, boxShadow: `0 0 8px ${status.color}` }} />
            {status.text}
          </span>
          <div className="flex flex-wrap gap-2">
            {(chainWon || chainDraw) && !settled && (
              <Small onClick={() => run("claim")} disabled={busy !== null}>
                {busy === "claim" ? "Claiming…" : "Claim now"}
              </Small>
            )}
            {chainWon && settled &&
              (minted ? (
                <a href={explorerAddress(minted)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-[#ffc861]/50 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-[#ffc861]">
                  <GiLaurelsTrophy className="h-4 w-4" /> Trophy minted ↗
                </a>
              ) : (
                <Small onClick={() => run("mint")} disabled={busy !== null} gold>
                  {busy === "mint" ? "Minting…" : "Mint trophy"}
                </Small>
              ))}
            <Small onClick={() => currentDuel !== null && window.open(duelUrl(currentDuel), "_blank")}>Replay</Small>
            <Small onClick={onShare}>Share on X</Small>
          </div>
        </div>
        {msg && <p className="relative mt-3 text-center font-display text-sm text-[#ffc861]">{msg}</p>}
      </section>
    </div>
  );
}

function Step({ place, data, height, delay, gold }: { place: string; data: { p: Player; s: number; c: string; you: boolean }; height: string; delay: number; gold?: boolean }) {
  const plate = gold ? "#ffc861" : "#cfd6e6";
  return (
    <div className="arena-rise flex flex-col items-center" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative">
        <Avatar player={data.p} size={gold ? 76 : 62} />
        {gold && <GiLaurelsTrophy className="absolute -right-3 -top-3 h-8 w-8 text-[#ffc861] drop-shadow-[0_0_10px_#ffc861]" />}
      </div>
      <div className="mt-2 max-w-full truncate font-display text-base font-bold">
        {data.p.name}
        {data.you && <span className="ml-2 font-display text-[10px] uppercase tracking-widest" style={{ color: data.c }}>you</span>}
      </div>
      <div className={`font-display text-2xl font-bold tabular-nums ${data.s >= 0 ? "text-[#3dff8a]" : "text-[#ff3b5c]"}`}>{pct(data.s)}</div>
      <div
        className={`relative mt-3 grid w-full place-items-center overflow-hidden rounded-t-xl border-x border-t ${height}`}
        style={{ borderColor: `${plate}66`, background: `linear-gradient(180deg, ${plate}33, ${data.c}14 70%, transparent)` }}
      >
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: data.c, boxShadow: `0 0 14px ${data.c}` }} />
        <span className="font-display text-4xl font-bold italic" style={{ color: plate, textShadow: `0 0 20px ${plate}88` }}>
          {place}
        </span>
      </div>
    </div>
  );
}

function Reward({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3" style={{ boxShadow: `inset 0 0 26px -16px ${color}` }}>
      <div className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">{label}</div>
      <div className="font-display text-xl font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function Small({ children, onClick, disabled, gold }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; gold?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 ${
        gold ? "border-[#ffc861]/60 bg-[#ffc861]/15 text-[#ffc861] hover:bg-[#ffc861]/25" : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
