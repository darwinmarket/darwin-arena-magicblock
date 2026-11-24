"use client";

// Briques de base du wireframe. Style volontairement neutre : la DA viendra après.
import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Panneau "stand de course" : fibre de carbone, damier en coin, double bande de course devant le titre. */
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
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f0a1d]/90 p-5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl ${className}`}
    >
      <div className="race-carbon pointer-events-none absolute inset-0" />
      <div className="race-checker pointer-events-none absolute right-0 top-0 h-4 w-40 opacity-25 [mask-image:linear-gradient(to_left,black,transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#2de2ff]/80 via-[#ff3fb4]/50 to-transparent" />
      <header className="relative mb-4 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-3 font-display text-lg font-bold uppercase italic tracking-wider">
          <span className="flex gap-[3px]">
            <span className="h-4 w-1.5 -skew-x-[20deg] bg-[#2de2ff] shadow-[0_0_8px_#2de2ff]" />
            <span className="h-4 w-1.5 -skew-x-[20deg] bg-[#ff3fb4] shadow-[0_0_8px_#ff3fb4]" />
          </span>
          {title}
        </h2>
        {right}
      </header>
      <div className="relative">{children}</div>
    </section>
  );
}

/** Onglets inclinés façon menu de jeu de course ; l'actif prend le dégradé néon. */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  size = "md",
  icons,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (t: T) => void;
  size?: "md" | "sm";
  icons?: Partial<Record<T, ReactNode>>;
}) {
  return (
    <div className="grid max-w-full auto-cols-fr grid-flow-col gap-2 py-1 sm:flex">
      {tabs.map((t) => {
        const on = active === t;
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`shrink-0 -skew-x-12 whitespace-nowrap rounded-md border font-display font-bold uppercase italic tracking-wider transition ${
              size === "md" ? "justify-center px-2 py-2.5 text-[11px] tracking-normal sm:px-5 sm:text-sm sm:tracking-wider" : "px-4 py-1.5 text-xs"
            } ${
              on
                ? "border-transparent bg-gradient-to-r from-[#2de2ff] via-[#9d6bff] to-[#ff3fb4] text-[#0b0716] shadow-[0_0_28px_-6px_#ff3fb4]"
                : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/25 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="flex skew-x-12 items-center justify-center gap-1.5 sm:gap-2">
              {icons?.[t]}
              {t}
            </span>
          </button>
        );
      })}
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

/** Barre façon compte tours : remplissage néon découpé en segments LED. */
export function ProgressBar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`relative h-2 overflow-hidden rounded-sm bg-white/10 ${/\bw-/.test(className) ? "" : "w-full"} ${className}`}>
      <div
        className="h-full bg-gradient-to-r from-[#2de2ff] via-[#9d6bff] to-[#ff3fb4] shadow-[0_0_10px_#2de2ff88] transition-[width] duration-700"
        style={{ width: `${pct}%` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_7px,rgba(11,7,22,0.85)_7px_9px)]" />
    </div>
  );
}

/** Cadran d'instrument : valeur en chiffres digitaux, icône et liseré de couleur incliné. */
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
  const c = { green: "#3dff8a", orange: "#ffc861", teal: "#2de2ff", purple: "#ff3fb4" }[tone];
  return (
    <div
      className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-white/10 bg-black/35 py-3 pl-5 pr-4 transition hover:-translate-y-0.5"
      style={{ boxShadow: `inset 0 0 30px -18px ${c}` }}
    >
      <span className="absolute inset-y-0 left-0 w-1.5 -skew-x-[12deg]" style={{ background: c, boxShadow: `0 0 12px ${c}` }} />
      <div>
        <div className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">{label}</div>
        <div className="font-display text-2xl font-bold tabular-nums" style={{ textShadow: `0 0 16px ${c}55` }}>
          {value}
        </div>
      </div>
      <div className="text-3xl transition group-hover:scale-110" style={{ color: c, filter: `drop-shadow(0 0 8px ${c})` }}>
        {icon}
      </div>
    </div>
  );
}

export const pct = (n: number) => {
  // Five-minute basket moves are often a fraction of a percent: keep two decimals below 1 %.
  const d = Math.abs(n) < 1 ? 2 : 1;
  return Math.abs(n) < 0.5 * 10 ** -d ? `0.${"0".repeat(d)}%` : `${n > 0 ? "+" : ""}${n.toFixed(d)}%`;
};
