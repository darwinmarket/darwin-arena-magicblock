"use client";

// Accueil : l'équivalent de la "borne" de la référence. Deux choix seulement : PLAY ou DASHBOARD.
// Fond : la rue Wall Street animée. PLAY = la caméra fonce dans la Bourse (bâtiment au drapeau),
// puis on arrive dans la salle des marchés (/play).
import { asset } from "@/lib/asset";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ENTER_MS, StreetBackground } from "@/components/brand/StreetBackground";

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
      <div
        className="flex min-h-[70vh] flex-col items-center justify-end pb-6 text-center transition-opacity duration-300"
        style={{ opacity: entering ? 0 : 1 }}
      >
        <p className="text-lg font-bold text-white/90 drop-shadow">Only the fittest basket survives.</p>
        <div className="mt-6 flex w-full max-w-md flex-col gap-4">
          <button
            onClick={play}
            className="rounded-3xl bg-neutral-950/90 py-6 text-3xl font-black uppercase text-white shadow-2xl"
          >
            ▶ Play
          </button>
          <Link
            href="/menu"
            className="rounded-3xl border border-white/40 bg-white/15 py-5 text-xl font-black uppercase backdrop-blur"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </>
  );
}
