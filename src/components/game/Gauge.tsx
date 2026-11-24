// Compteur de vitesse : arc gradué de 240°, aiguille animée, valeur digitale au centre.
export function Gauge({
  value,
  max = 100,
  label,
  display,
  size = 180,
}: {
  value: number;
  max?: number;
  label: string;
  display: string;
  size?: number;
}) {
  const r = 80;
  const C = { x: 100, y: 100 };
  const k = Math.max(0, Math.min(1, value / max));
  const ang = (f: number) => ((-210 + 240 * f) * Math.PI) / 180;
  const pt = (f: number, rad: number) => ({ x: C.x + rad * Math.cos(ang(f)), y: C.y + rad * Math.sin(ang(f)) });
  const arc = (f: number) => {
    const a = pt(0, r), b = pt(f, r);
    return `M${a.x} ${a.y} A${r} ${r} 0 ${240 * f > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
  };
  const ticks = Array.from({ length: 25 }, (_, i) => i / 24);
  return (
    <div className="relative" style={{ width: size, height: size * 0.82 }}>
      <svg viewBox="0 0 200 165" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="gauge-g" x1="0" x2="1">
            <stop offset="0" stopColor="#2de2ff" />
            <stop offset="0.55" stopColor="#9d6bff" />
            <stop offset="1" stopColor="#ff3fb4" />
          </linearGradient>
        </defs>
        <path d={arc(1)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round" />
        <path d={arc(Math.max(0.001, k))} fill="none" stroke="url(#gauge-g)" strokeWidth="10" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 6px #ff3fb4aa)", transition: "d 0.8s" }} />
        {ticks.map((f, i) => {
          const a = pt(f, i % 4 === 0 ? 62 : 66), b = pt(f, 70);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={f > 0.83 ? "#ff3b5c" : "rgba(255,255,255,0.45)"} strokeWidth={i % 4 === 0 ? 2 : 1} />;
        })}
        <g style={{ transform: `rotate(${-120 + 240 * k}deg)`, transformOrigin: "100px 100px", transition: "transform 1s cubic-bezier(0.34,1.56,0.64,1)", animation: "race-needle 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <path d="M98 100 L100 34 L102 100 Z" fill="#fff" style={{ filter: "drop-shadow(0 0 4px #fff)" }} />
        </g>
        <circle cx="100" cy="100" r="9" fill="#0b0716" stroke="#ff3fb4" strokeWidth="2.5" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="font-display text-3xl font-bold leading-none tabular-nums" style={{ textShadow: "0 0 18px #ff3fb488" }}>
          {display}
        </div>
        <div className="mt-1 font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">{label}</div>
      </div>
    </div>
  );
}
