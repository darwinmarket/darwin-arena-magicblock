// Chrono HUD partagé (draft, duel) : module encadré façon viseur, chiffres m:ss,
// barre segmentée qui se vide. Passe à l'orange sous 30 %, au rouge (et pulse) sous 15 %.
// + TimeDrain : fine barre qui se vide le long du bord d'un panneau.

export function timerColor(left: number, total: number) {
  const r = left / total;
  return r <= 0.15 ? "#ff3b5c" : r <= 0.3 ? "#ffc861" : "#2de2ff";
}

export const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

export function GameTimer({
  left,
  total,
  label = "Time left",
  segments = 12,
  size = "md",
}: {
  left: number;
  total: number;
  label?: string;
  segments?: number;
  size?: "md" | "lg";
}) {
  const color = timerColor(left, total);
  const lit = Math.ceil((left / total) * segments);
  const danger = left / total <= 0.15;
  return (
    <div
      className="relative flex flex-col items-center rounded-2xl bg-black/45 px-6 py-2.5"
      style={{ boxShadow: `inset 0 0 0 1px ${color}40, inset 0 0 24px -8px ${color}` }}
    >
      {/* coins de viseur */}
      {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-l-2 border-b-2", "right-0 bottom-0 border-r-2 border-b-2"].map(
        (c) => (
          <span key={c} className={`absolute h-3 w-3 rounded-[3px] ${c}`} style={{ borderColor: color }} />
        ),
      )}
      <span className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">{label}</span>
      <span
        className={`font-display font-bold leading-none tabular-nums ${size === "lg" ? "text-6xl" : "text-5xl"} ${danger ? "animate-pulse" : ""}`}
        style={{ color: danger ? color : "white", textShadow: `0 0 18px ${color}99` }}
      >
        {fmtClock(left)}
      </span>
      <div className="mt-2 flex gap-[3px]">
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className="h-1.5 w-2.5 rounded-[2px] transition-colors duration-300"
            style={{ background: i < lit ? color : "rgba(255,255,255,0.1)", boxShadow: i < lit ? `0 0 6px ${color}` : undefined }}
          />
        ))}
      </div>
    </div>
  );
}

/** Barre de temps le long du bord bas d'un panneau (le parent doit être relative + overflow-hidden). */
export function TimeDrain({ left, total }: { left: number; total: number }) {
  const color = timerColor(left, total);
  return (
    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/5">
      <div
        className="h-full transition-[width] duration-1000 ease-linear"
        style={{ width: `${(left / total) * 100}%`, background: color, boxShadow: `0 0 12px ${color}` }}
      />
    </div>
  );
}
