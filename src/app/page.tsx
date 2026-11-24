"use client";

// Accueil : la "borne". Deux choix seulement : PLAY ou DASHBOARD.
// Fond : la rue Wall Street animée. PLAY = la caméra fonce dans la Bourse (bâtiment au drapeau),
// puis on arrive dans la salle des marchés (/play).
import { asset } from "@/lib/asset";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GiCrossedSwords, GiPodium } from "react-icons/gi";
import { ENTER_MS, StreetBackground } from "@/components/brand/StreetBackground";

const CORNERS = [
  "left-0 top-0 border-l-2 border-t-2",
  "right-0 top-0 border-r-2 border-t-2",
  "left-0 bottom-0 border-l-2 border-b-2",
  "right-0 bottom-0 border-r-2 border-b-2",
];

export default function Home() {
  const router = useRouter();
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    router.prefetch("/play");
    const img = new Image(); // précharge la salle des marchés pour éviter un flash
    img.src = asset("/arena/trading_floor.png");
  }, [router]);

  const play = () => {
    if (entering) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return router.push("/play");
    setEntering(true);
    setTimeout(() => router.push("/play"), ENTER_MS);
  };

  return (
    <>
      <StreetBackground dim={0.2} entering={entering} />
      {/* assombrit le bas de l'écran pour que le texte et les boutons ressortent */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 -z-0 h-[55vh] bg-gradient-to-t from-[#0b0716] via-[#0b0716]/70 to-transparent" />

      <div
        className="relative flex min-h-[84vh] flex-col items-center justify-end pb-6 text-center transition-opacity duration-300"
        style={{ opacity: entering ? 0 : 1 }}
      >

        <h1
          className="arena-rise font-display text-5xl font-bold uppercase italic leading-[0.95] tracking-tight sm:text-[64px]"
          style={{ animationDelay: "80ms" }}
        >
          <span className="block text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">Pick five.</span>
          <span
            className="block bg-gradient-to-r from-[#2de2ff] via-[#ff3fb4] to-[#ffc861] bg-clip-text pr-2 text-transparent"
            style={{ filter: "drop-shadow(0 0 18px rgba(255,63,180,0.45))" }}
          >
            Outlast one.
          </span>
        </h1>
        <p
          className="arena-rise mt-4 max-w-md text-base text-white/75 drop-shadow sm:text-lg"
          style={{ animationDelay: "160ms" }}
        >
          Draft a basket of tokens, race a real rival for one minute, and the fittest basket takes the pot.
        </p>

        <div className="arena-rise mt-8 flex w-full max-w-md flex-col gap-4" style={{ animationDelay: "240ms" }}>
          {/* PLAY : CTA principal, mêmes couleurs que "Find a match" */}
          <button onClick={play} className="group relative">
            <span className="arena-breathe absolute -inset-2 rounded-[28px] bg-gradient-to-r from-[#ff3fb4] via-[#ff6a3d] to-[#ffc861] opacity-60 blur-xl" />
            <span className="relative flex items-center justify-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-r from-[#ff3fb4] via-[#ff6a3d] to-[#ffc861] px-8 py-5 text-[#1a0612] shadow-[inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-4px_0_rgba(0,0,0,0.2)] transition duration-200 group-hover:-translate-y-0.5 group-hover:brightness-110 group-active:translate-y-0.5">
              <span className="arena-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              <GiCrossedSwords className="h-9 w-9 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
              <span className="text-left">
                <span className="block font-display text-4xl font-bold uppercase italic leading-none tracking-wide">Play</span>
                <span className="block font-display text-[11px] font-semibold uppercase tracking-[0.3em] opacity-70">Ranked duel 1v1</span>
              </span>
            </span>
          </button>

          {/* DASHBOARD : secondaire, verre + coins de viseur cyan comme le chrono */}
          <Link
            href="/menu"
            className="group relative flex items-center justify-center gap-3 rounded-2xl bg-[#120a24]/70 px-6 py-4 backdrop-blur-md transition hover:bg-[#120a24]/90"
            style={{ boxShadow: "inset 0 0 0 1px rgba(45,226,255,0.3), inset 0 0 24px -10px #2de2ff" }}
          >
            {CORNERS.map((c) => (
              <span key={c} className={`absolute h-3 w-3 rounded-[3px] border-[#2de2ff] transition-all group-hover:h-4 group-hover:w-4 ${c}`} />
            ))}
            <GiPodium className="h-6 w-6 text-[#2de2ff] drop-shadow-[0_0_8px_#2de2ff]" />
            <span className="font-display text-xl font-bold uppercase tracking-widest">Dashboard</span>
            <span className="font-display text-[11px] uppercase tracking-[0.2em] text-white/45">Rank and trophies</span>
          </Link>
        </div>
      </div>
    </>
  );
}
