// Pièce de jeu d'un actif : le vrai logo serti dans une pièce néon aux couleurs de la marque
// (anneau en dégradé conique, liseré sombre, reflet brillant, halo).
import { TOKENS } from "@/lib/tokens";

export function TokenCoin({ symbol, size = 48, glow = true }: { symbol: string; size?: number; glow?: boolean }) {
  const t = TOKENS[symbol];
  if (!t) return null;
  const ring = Math.max(2, size * 0.075);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 200deg, ${t.color}, ${t.accent}, ${t.color}, ${t.accent}, ${t.color})`,
          boxShadow: glow ? `0 0 ${size * 0.35}px -${size * 0.08}px ${t.color}` : undefined,
        }}
      />
      <div className="absolute rounded-full bg-[#0b0716]" style={{ inset: ring }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={t.logo}
        alt={symbol}
        draggable={false}
        className="absolute rounded-full object-cover"
        style={{ inset: ring * 1.6, width: size - ring * 3.2, height: size - ring * 3.2 }}
      />
      {/* reflet */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{ inset: ring, background: "linear-gradient(155deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 42%)" }}
      />
    </div>
  );
}
