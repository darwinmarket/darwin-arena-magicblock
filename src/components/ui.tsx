"use client";

// Briques de base du wireframe. Style volontairement neutre : la DA viendra après.
import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Bloc avec titre en italique gras capitales (VERSUS, STATS OVERVIEW…) */
export function Panel({
  title,
  right,
  children,
  className = "",
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative rounded-3xl border border-white/10 bg-[#120a24]/85 p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl ${className}`}
    >
      {/* liseré néon en haut du panneau */}
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#2de2ff]/70 to-transparent" />
      <header className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2.5 font-display text-lg font-bold uppercase tracking-wider">
          <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#2de2ff] to-[#ff3fb4]" />
          {title}
        </h2>
        {right}
      </header>
      {children}
    </section>
  );
}

/** Onglets en pilules, l'actif souligné */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  size = "md",
}: {
  tabs: readonly T[];
  active: T;
  onChange: (t: T) => void;
  size?: "md" | "sm";
}) {
  return (
    <div className="flex gap-3">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`rounded-xl bg-neutral-800 font-black uppercase transition hover:bg-neutral-700 ${
            size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs"
          } ${active === t ? "underline decoration-2 underline-offset-4 ring-2 ring-neutral-500" : ""}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/** Infobulle au survol (nom, condition, progression).
 *  Rendue dans un portail sur <body> en position fixe : jamais coupée par un parent en overflow-hidden. */
export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; below: boolean } | null>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const below = r.top < 110; // pas la place au-dessus : on passe dessous
    setPos({ x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below });
  };

  return (
    <div ref={ref} className="relative" onMouseEnter={show} onMouseLeave={() => setPos(null)} onFocus={show} onBlur={() => setPos(null)}>
      {children}
      {pos &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[100] w-max max-w-60 rounded-xl border border-white/15 bg-[#0b0716]/95 px-3 py-2 text-xs shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur"
            style={{
              left: Math.min(Math.max(pos.x, 130), window.innerWidth - 130),
              top: pos.y,
              transform: `translate(-50%, ${pos.below ? "0" : "-100%"})`,
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function ProgressBar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`h-2 rounded-full bg-white/10 ${/\bw-/.test(className) ? "" : "w-full"} ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#2de2ff] to-[#ff3fb4] shadow-[0_0_8px_#2de2ff88]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Tuile de stat colorée avec icône (Winrate, Streak…) */
export function StatTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: "green" | "orange" | "teal" | "purple";
}) {
  const tones = {
    green: "border-green-500 from-green-900/60",
    orange: "border-orange-500 from-orange-900/60",
    teal: "border-cyan-500 from-cyan-900/60",
    purple: "border-fuchsia-500 from-fuchsia-900/60",
  };
  return (
    <div className={`flex items-center justify-between rounded-2xl border-2 bg-gradient-to-r to-transparent p-4 ${tones[tone]}`}>
      <div>
        <div className="text-sm text-neutral-300">{label}</div>
        <div className="text-2xl font-black">{value}</div>
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  );
}

export const pct = (n: number) => {
  // Five-minute basket moves are often a fraction of a percent: keep two decimals below 1 %.
  const d = Math.abs(n) < 1 ? 2 : 1;
  return Math.abs(n) < 0.5 * 10 ** -d ? `0.${"0".repeat(d)}%` : `${n > 0 ? "+" : ""}${n.toFixed(d)}%`;
};
