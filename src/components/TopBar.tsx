"use client";

// Équivalent des éléments fixes de la référence : chip "GAME MODE" en haut à gauche,
// burger (menu) en haut à droite. On y ajoute le wallet.
import Link from "next/link";
import { useState } from "react";

export function TopBar() {
  const [connected, setConnected] = useState(false); // mock, remplacé par le Solana wallet adapter
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-4">
      <Link href="/" className="rounded-xl bg-black/50 px-3 py-2 text-xs font-black uppercase">
        Darwin Arena <span className="ml-1.5 text-neutral-400">Season 1</span>
      </Link>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setConnected((c) => !c)}
          className="rounded-xl bg-black/50 px-4 py-2 text-sm font-black"
        >
          {connected ? (
            <>
              tom.sol <span className="ml-2 text-white/60">42.0 USDC</span>
            </>
          ) : (
            "Connect wallet"
          )}
        </button>
        <Link href="/menu" className="rounded-xl bg-black/50 px-3 py-2 text-xl" title="Menu">
          ☰
        </Link>
      </div>
    </header>
  );
}
