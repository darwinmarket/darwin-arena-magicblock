"use client";

// Barre HUD fixe : marque + saison à gauche, dock wallet (faucets, soldes, joueur) et menu à droite.
// Même DA que l'accueil : verre sombre, coins de viseur cyan, police display, icônes Gi.
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { GiCash, GiFuelTank, GiPowerButton, GiWallet } from "react-icons/gi";
import { DarwinMark } from "@/components/brand/DarwinMark";
import { Corners, GLASS } from "@/components/game/Hud";
import { useArena } from "@/lib/chain/ArenaProvider";
import { friendlyError } from "@/lib/chain/errors";
import { useProfile } from "@/lib/store";

/** Petite action du dock (faucets) : icône + libellé, s'allume au survol */
function DockAction({
  onClick,
  disabled,
  title,
  color,
  icon,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  color: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="group flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 font-display text-[11px] font-bold uppercase tracking-[0.18em] transition hover:bg-white/[0.06] disabled:opacity-50 sm:px-3"
      style={{ color }}
    >
      <span className="text-base transition group-hover:scale-110" style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
        {icon}
      </span>
      {children}
    </button>
  );
}

const FAUCET_USDC = 1000;

export function TopBar() {
  const { connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { usdc, sol, claimFaucet, requestSol, solStatus, ready } = useArena();
  const { me } = useProfile();
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);
  const toast = (text: string, ok: boolean) => {
    setNote({ text, ok });
    setTimeout(() => setNote((n) => (n?.text === text ? null : n)), 4500);
  };
  const lowSol = sol !== null && sol < 0.03;

  // Each click shows +1000 at once (expected balance); the claim lands in a slot or two and the real
  // balance takes over once it has caught up. Clicks may stack.
  const [incoming, setIncoming] = useState<number | null>(null);
  useEffect(() => {
    if (incoming !== null && usdc !== null && usdc >= incoming - 1e-6) setIncoming(null);
  }, [incoming, usdc]);
  const faucet = async () => {
    if (usdc !== null) setIncoming((t) => (t ?? usdc) + FAUCET_USDC);
    try {
      await claimFaucet();
    } catch (e) {
      console.error("faucet", e);
      setIncoming(null);
      toast(friendlyError(e), false);
    }
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <BrandChip />

      <div className="pointer-events-auto flex items-center gap-2.5">
        {connected ? (
          <div className={`${GLASS} flex items-center rounded-2xl p-1`}>
            <Corners />
            {lowSol && (
              <DockAction
                onClick={() => requestSol().catch((e) => toast(friendlyError(e), false))}
                disabled={solStatus === "requesting"}
                title="Free devnet SOL for fees, from this site's faucet"
                color="#2de2ff"
                icon={<GiFuelTank />}
              >
                <span className="hidden sm:inline">{solStatus === "requesting" ? "Fueling…" : "Get SOL"}</span>
              </DockAction>
            )}
            <DockAction
              onClick={() => void faucet()}
              disabled={!ready}
              title="1000 test USDC, sent by the site: no wallet prompt, no limit"
              color="#3dff8a"
              icon={<GiCash />}
            >
              <span className="hidden sm:inline">+{FAUCET_USDC} USDC</span>
            </DockAction>

            <span className="mx-1 h-7 w-px bg-white/10" />

            {/* Soldes */}
            <div className="flex items-center gap-4 px-3">
              <div className="flex flex-col leading-none">
                <span className="font-display text-[9px] font-semibold uppercase tracking-[0.25em] text-white/40">
                  {incoming !== null ? "Incoming…" : "USDC"}
                </span>
                {incoming !== null ? (
                  <span className="mt-1 min-w-[3.2rem] animate-pulse font-display text-base font-bold tabular-nums text-[#3dff8a] drop-shadow-[0_0_8px_#3dff8a88]">
                    {incoming.toFixed(2)}
                  </span>
                ) : (
                  <span className="mt-1 min-w-[3.2rem] font-display text-base font-bold tabular-nums text-[#ffc861] drop-shadow-[0_0_8px_#ffc86166]">
                    {usdc === null ? "…" : usdc.toFixed(2)}
                  </span>
                )}
              </div>
              {(
                <div className="hidden flex-col leading-none sm:flex">
                  <span className="font-display text-[9px] font-semibold uppercase tracking-[0.25em] text-white/40">SOL</span>
                  <span
                    className={`mt-1 min-w-[3.2rem] font-display text-base font-bold tabular-nums ${lowSol ? "animate-pulse text-[#ff3b5c]" : "text-white/80"}`}
                  >
                    {sol === null ? "…" : sol.toFixed(3)}
                  </span>
                </div>
              )}
            </div>

            <span className="mx-1 h-7 w-px bg-white/10" />

            {/* Joueur : clic pour se déconnecter */}
            <button
              onClick={() => disconnect()}
              title="Disconnect"
              className="group flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-3 transition hover:bg-white/[0.06]"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#2de2ff] to-[#ff3fb4] p-px">
                <span className="grid h-full w-full place-items-center rounded-[7px] bg-[#120a24] font-display text-xs font-bold uppercase">
                  <span className="group-hover:hidden">{me.name.slice(0, 1)}</span>
                  <GiPowerButton className="hidden text-[#ff3b5c] group-hover:block" />
                </span>
              </span>
              <span className="hidden font-display text-sm font-bold tracking-wide md:inline">{me.name}</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setVisible(true)}
            title="Connect a Solana wallet (devnet)"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#ff3fb4] via-[#ff6a3d] to-[#ffc861] p-px shadow-[0_10px_30px_-10px_#ff3fb4]"
          >
            <span className="relative flex items-center gap-2 rounded-[15px] bg-[#120a24]/90 px-4 py-2.5 font-display text-sm font-bold uppercase tracking-widest transition group-hover:bg-transparent group-hover:text-[#1a0612]">
              <GiWallet className="text-lg text-[#ffc861] transition group-hover:text-[#1a0612]" />
              <span className="whitespace-nowrap sm:hidden">Connect</span>
              <span className="hidden whitespace-nowrap sm:inline">Connect wallet</span>
            </span>
          </button>
        )}

        {/* Messages des robinets (SOL, USDC) */}
        {note && (
          <div
            role="status"
            className={`arena-pop absolute right-4 top-[76px] max-w-xs rounded-xl border px-4 py-2.5 font-display text-xs font-semibold backdrop-blur-xl sm:right-6 ${
              note.ok ? "border-[#3dff8a]/50 bg-[#0b1a12]/90 text-[#3dff8a]" : "border-[#ff3b5c]/50 bg-[#1a0b12]/90 text-[#ff8aa0]"
            }`}
          >
            {note.text}
          </div>
        )}

        {/* Menu */}
        <Link
          href="/menu"
          title="Menu"
          aria-label="Menu"
          className={`${GLASS} group grid h-[46px] w-[46px] place-items-center rounded-2xl transition hover:border-[#2de2ff]/40`}
        >
          <Corners />
          <span className="flex flex-col items-end gap-[5px]">
            <span className="h-0.5 w-5 rounded-full bg-white transition-all group-hover:bg-[#2de2ff]" />
            <span className="h-0.5 w-3.5 rounded-full bg-[#2de2ff] shadow-[0_0_6px_#2de2ff] transition-all group-hover:w-5" />
            <span className="h-0.5 w-5 rounded-full bg-white transition-all group-hover:bg-[#2de2ff]" />
          </span>
        </Link>
      </div>
    </header>
  );
}

/** Marque : au survol le D tremble, fonce jusqu'au bout de la box et efface le texte ; il revient en sortie. */
function BrandChip() {
  const box = useRef<HTMLAnchorElement>(null);
  const mark = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<"idle" | "in" | "out">("idle");

  const enter = () => {
    const m = mark.current?.getBoundingClientRect();
    const t = text.current?.getBoundingClientRect();
    if (m && t) box.current?.style.setProperty("--dash", `${t.right - m.right}px`);
    setPhase("in");
  };

  return (
    <Link
      ref={box}
      href="/"
      onMouseEnter={enter}
      onMouseLeave={() => setPhase((p) => (p === "idle" ? p : "out"))}
      data-dash={phase}
      className={`${GLASS} darwin-chip group pointer-events-auto flex items-center gap-3 overflow-hidden rounded-2xl py-2 pl-3 pr-2 transition hover:border-[#2de2ff]/40`}
    >
      <Corners />
      <span ref={mark} className="darwin-mark relative z-10 block" onAnimationEnd={() => phase === "out" && setPhase("idle")}>
        <span className="darwin-trail pointer-events-none absolute right-full top-1/2 h-5 w-28" />
        <DarwinMark className="relative h-6 w-auto drop-shadow-[0_0_8px_#2de2ff99]" />
      </span>
      <span ref={text} className="darwin-text flex items-center gap-3">
        <span className="hidden whitespace-nowrap font-display text-sm font-bold uppercase italic leading-none tracking-wider min-[420px]:inline">
          Darwin <span className="bg-gradient-to-r from-[#2de2ff] via-[#ff3fb4] to-[#ffc861] bg-clip-text text-transparent">Arena</span>
        </span>
        <span className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60 sm:flex">
          Season 1 <span className="text-[#2de2ff]">Devnet</span>
        </span>
      </span>
    </Link>
  );
}
