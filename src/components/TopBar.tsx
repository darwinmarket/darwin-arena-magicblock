"use client";

// Équivalent des éléments fixes de la référence : chip "GAME MODE" en haut à gauche,
// burger (menu) en haut à droite. On y ajoute le wallet (Solana devnet), le solde de
// test-USDC et le faucet.
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { useState } from "react";
import { useArena } from "@/lib/chain/ArenaProvider";
import { useProfile } from "@/lib/store";

export function TopBar() {
  const { connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { usdc, sol, claimFaucet, requestSol, solStatus, ready } = useArena();
  const { me } = useProfile();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const faucet = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await claimFaucet();
      setMsg("+100 USDC");
    } catch (e) {
      console.error("faucet", e);
      setMsg(String((e as Error).message).includes("FaucetCooldown") || String((e as Error).message).includes("6001") ? "Faucet: wait 10 min" : "Faucet failed");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-4">
      <Link href="/" className="rounded-xl bg-black/50 px-3 py-2 text-xs font-black uppercase">
        Darwin Arena <span className="ml-1.5 text-neutral-400">Season 1 · devnet</span>
      </Link>
      <div className="flex items-center gap-3">
        {connected && sol !== null && sol < 0.03 && (
          <button
            onClick={() => requestSol().catch((e) => setMsg(String((e as Error).message).slice(0, 60)))}
            disabled={solStatus === "requesting"}
            title="Free devnet SOL for fees, from this site's faucet"
            className="rounded-xl bg-black/50 px-3 py-2 text-xs font-black uppercase text-[#2de2ff] disabled:opacity-60"
          >
            {solStatus === "requesting" ? "Getting devnet SOL…" : "Get devnet SOL"}
          </button>
        )}
        {connected && (
          <button
            onClick={faucet}
            disabled={busy || !ready}
            title="Mint 100 test USDC (once every 10 minutes)"
            className="rounded-xl bg-black/50 px-3 py-2 text-xs font-black uppercase text-[#3dff8a] disabled:opacity-50"
          >
            {busy ? "Minting…" : msg ?? "+ Test USDC"}
          </button>
        )}
        <button
          onClick={() => (connected ? disconnect() : setVisible(true))}
          className="rounded-xl bg-black/50 px-4 py-2 text-sm font-black"
          title={connected ? "Disconnect" : "Connect a Solana wallet (devnet)"}
        >
          {connected ? (
            <>
              {me.name}{" "}
              <span className="ml-2 text-white/60">{usdc === null ? "…" : usdc.toFixed(2)} USDC</span>
              {sol !== null && <span className={`ml-2 ${sol < 0.03 ? "text-[#ff3b5c]" : "text-white/40"}`}>{sol.toFixed(3)} SOL</span>}
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
