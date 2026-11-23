"use client";

// État partagé du joueur. Le nom et le rang viennent du profil on-chain (Solana) ;
// la bannière et la vitrine de badges équipées dans Profil restent une
// personnalisation locale qui se répercute partout (Dashboard, Duel, Résultat).
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useArena } from "./chain/ArenaProvider";
import { playerFromProfile } from "./chain/profile";
import { ME } from "./mock";
import type { Player } from "./types";

interface ProfileCtx {
  me: Player;
  setBanner: (id: string) => void;
  setShowcaseSlot: (slot: number, badgeId: string) => void;
}

const Ctx = createContext<ProfileCtx | null>(null);

const GUEST: Player = { ...ME, id: "guest", name: "guest", rank: { tier: "Cell", division: "III", points: 0 } };

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { wallet, profile } = useArena();
  const [bannerId, setBannerId] = useState<string | null>(null);
  const [showcase, setShowcase] = useState<(string | null)[]>(ME.showcase);

  const me = useMemo<Player>(() => {
    const base = wallet ? playerFromProfile(wallet, profile) : GUEST;
    return { ...base, bannerId: bannerId ?? base.bannerId, showcase };
  }, [wallet, profile, bannerId, showcase]);

  const setBanner = (id: string) => setBannerId(id);
  const setShowcaseSlot = (slot: number, badgeId: string) =>
    setShowcase((cur) => {
      const next = cur.map((id) => (id === badgeId ? null : id)); // pas de doublon
      next[slot] = badgeId;
      return next;
    });
  return <Ctx.Provider value={{ me, setBanner, setShowcaseSlot }}>{children}</Ctx.Provider>;
}

export function useProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}
