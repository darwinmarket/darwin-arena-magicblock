"use client";

// État partagé de la personnalisation : la bannière et la vitrine de badges
// équipées dans Profil se répercutent partout (Dashboard, Duel, Résultat).
import { createContext, useContext, useState, type ReactNode } from "react";
import { ME } from "./mock";
import type { Player } from "./types";

interface ProfileCtx {
  me: Player;
  setBanner: (id: string) => void;
  setShowcaseSlot: (slot: number, badgeId: string) => void;
}

const Ctx = createContext<ProfileCtx | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Player>(ME);
  const setBanner = (bannerId: string) => setMe((p) => ({ ...p, bannerId }));
  const setShowcaseSlot = (slot: number, badgeId: string) =>
    setMe((p) => {
      const showcase = p.showcase.map((id) => (id === badgeId ? null : id)); // pas de doublon
      showcase[slot] = badgeId;
      return { ...p, showcase };
    });
  return <Ctx.Provider value={{ me, setBanner, setShowcaseSlot }}>{children}</Ctx.Provider>;
}

export function useProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}
