"use client";

// Fond "Wall Street" animé du jeu : l'image fixe générée par Gemini (public/arena/street.png),
// plus des couches animées en code, alignées sur l'image :
//  - phares (voitures qui arrivent, voie de gauche) et feux arrière (voitures qui s'éloignent,
//    voie de droite) qui suivent la perspective de l'avenue ;
//  - bandeaux de cotations LED qui défilent par-dessus ceux de l'image, avec des prix qui bougent ;
//  - fenêtres et étoiles qui scintillent, enseigne DARWIN ARENA et néons qui pulsent ;
//  - parallaxe légère qui suit la souris.
// Tout est dans un conteneur au ratio de l'image, en mode "cover" : les % ci-dessous sont
// des positions dans l'image (1376 x 768).
import { useEffect, useRef, useState } from "react";
import { ASSETS } from "@/lib/mock";

const IMG_W = 1376;
const IMG_H = 768;
const VP = { x: 688, y: 312 }; // point de fuite de l'avenue
const BOTTOM_DY = IMG_H - VP.y;

// Décalage latéral des voies, en fraction de la distance au point de fuite (bord de route ≈ 0.74)
const LANES = [
  { k: -0.5, dir: -1 }, // voies de gauche : les voitures arrivent vers nous (phares blancs)
  { k: -0.16, dir: -1 },
  { k: 0.16, dir: 1 }, // voies de droite : les voitures s'éloignent (feux rouges)
  { k: 0.5, dir: 1 },
];

interface Car {
  lane: number;
  z: number; // profondeur (1 = bas de l'image, 40 = point de fuite)
  speed: number;
}

const Z_NEAR = 0.95;
const Z_FAR = 40;

function spawn(lane: number, initial = false): Car {
  const dir = LANES[lane].dir;
  const z = initial ? Z_NEAR + Math.random() * (Z_FAR - Z_NEAR) : dir < 0 ? Z_FAR : Z_NEAR;
  return { lane, z, speed: 2.2 + Math.random() * 1.8 };
}

// Entrée de la Bourse (le bâtiment à colonnes avec le drapeau), en % de l'image
const ENTRANCE = { x: 79.2, y: 50.8 };
export const ENTER_MS = 1100;

export function StreetBackground({ dim = 0.35, entering = false }: { dim?: number; entering?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const onMove = (e: MouseEvent) =>
      setMouse({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Canvas : voitures, fenêtres, étoiles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = IMG_W * dpr;
    canvas.height = IMG_H * dpr;
    ctx.scale(dpr, dpr);

    const cars: Car[] = [];
    LANES.forEach((_, i) => {
      cars.push(spawn(i, true), spawn(i, true), spawn(i, true));
    });

    // Fenêtres (sur les façades latérales) et étoiles (dans le ciel)
    const windows = Array.from({ length: 45 }, () => {
      const left = Math.random() < 0.5;
      return {
        x: left ? 20 + Math.random() * 520 : 840 + Math.random() * 520,
        y: 10 + Math.random() * 220,
        w: 6 + Math.random() * 6,
        h: 9 + Math.random() * 8,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.6,
        warm: Math.random() < 0.4,
      };
    });
    const stars = Array.from({ length: 40 }, () => ({
      x: 560 + Math.random() * 260,
      y: Math.random() * 150,
      r: 0.6 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
    }));

    const project = (lane: number, z: number, side: number) => {
      const dy = BOTTOM_DY / z;
      return { x: VP.x + (LANES[lane].k + side) * dy, y: VP.y + dy, dy };
    };

    const glow = (x: number, y: number, r: number, color: string, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${color},${a})`);
      g.addColorStop(0.35, `rgba(${color},${a * 0.45})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      ctx.clearRect(0, 0, IMG_W, IMG_H);
      ctx.globalCompositeOperation = "lighter";

      for (const s of stars) {
        const a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 1.7 + s.phase));
        ctx.fillStyle = `rgba(255,255,255,${a * 0.8})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const w of windows) {
        const a = Math.max(0, Math.sin(t * w.speed + w.phase)) ** 6 * 0.3;
        if (a < 0.02) continue;
        ctx.fillStyle = w.warm ? `rgba(255,214,140,${a})` : `rgba(120,235,255,${a})`;
        ctx.fillRect(w.x, w.y, w.w, w.h);
      }

      // Voitures : z diminue (arrivent) ou augmente (repartent) à vitesse constante en "monde"
      for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        const dir = LANES[c.lane].dir;
        c.z *= Math.exp(dir * c.speed * dt * 0.22); // perspective : variation proportionnelle à z
        if (c.z < Z_NEAR || c.z > Z_FAR) {
          cars[i] = spawn(c.lane);
          continue;
        }
        const fade = Math.min(1, (Z_FAR - c.z) / 8) * Math.min(1, (c.z - Z_NEAR) / 0.3 + 0.2);
        const half = 0.075; // demi-écart entre les deux phares (fraction de dy)
        const L = project(c.lane, c.z, -half);
        const R = project(c.lane, c.z, half);
        const r = Math.max(1.5, L.dy * 0.05);
        const color = dir < 0 ? "255,246,220" : "255,40,70";
        // Reflet sur la chaussée
        const g = ctx.createLinearGradient(0, L.y, 0, L.y + L.dy * 0.35);
        g.addColorStop(0, `rgba(${color},${0.22 * fade})`);
        g.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(L.x - r, L.y, R.x - L.x + 2 * r, L.dy * 0.35);
        // Les deux feux
        glow(L.x, L.y, r * 3, color, 0.9 * fade);
        glow(R.x, R.y, r * 3, color, 0.9 * fade);
      }

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const px = reduced ? 0 : mouse.x * -18;
  const py = reduced ? 0 : mouse.y * -10;

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-[#140c26]">
      {/* Conteneur au ratio de l'image, en "cover" */}
      <div
        className="absolute left-1/2 top-1/2 transition-transform duration-300 ease-out"
        style={{
          width: `max(100vw, calc(100vh * ${IMG_W / IMG_H}))`,
          height: `max(100vh, calc(100vw * ${IMG_H / IMG_W}))`,
          transform: `translate(calc(-50% + ${px}px), calc(-50% + ${py}px)) scale(1.05)`,
        }}
      >
        {/* Calque zoomable : quand on clique PLAY, la caméra fonce dans le bâtiment de la Bourse
            (colonnes + drapeau, à droite). L'origine du zoom est en % de l'image. */}
        <div
          className="absolute inset-0"
          style={{
            transformOrigin: `${ENTRANCE.x}% ${ENTRANCE.y}%`,
            transform: entering ? "scale(7)" : "scale(1)",
            filter: entering ? "blur(6px) brightness(1.6)" : "none",
            transition: `transform ${ENTER_MS}ms cubic-bezier(0.7,0,0.84,0), filter ${ENTER_MS}ms ease-in`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/arena/street.png" alt="" className="absolute inset-0 h-full w-full select-none" draggable={false} />

          {/* Pulsation des néons : un halo magenta/cyan qui respire sur toute la scène */}
          <div className="arena-neon absolute inset-0 mix-blend-screen" />

          {/* Halo pulsé derrière l'enseigne DARWIN ARENA */}
          <div className="arena-sign absolute rounded-md" style={{ left: "42.2%", top: "23.6%", width: "15.6%", height: "6.2%" }} />

          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          {/* Bandeaux LED par-dessus ceux de l'image */}
          <Ticker style={{ left: "0%", top: "31.8%", width: "15.9%", height: "8.2%" }} />
          <Ticker style={{ left: "87.2%", top: "31.8%", width: "12.8%", height: "8.2%" }} reverse />
        </div>
      </div>

      {/* Assombrissement pour que les panneaux de l'UI restent lisibles */}
      <div className="absolute inset-0" style={{ background: `rgba(8,5,20,${dim})` }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)]" />

      {/* Fondu final vers la salle des marchés */}
      <div
        className="absolute inset-0 bg-[#1a0f24]"
        style={{
          opacity: entering ? 1 : 0,
          transition: `opacity ${ENTER_MS * 0.45}ms ease-in ${ENTER_MS * 0.55}ms`,
        }}
      />
    </div>
  );
}

/** Deux lignes de cotations qui défilent, prix en marche aléatoire (à brancher sur l'oracle). */
function Ticker({ style, reverse }: { style: React.CSSProperties; reverse?: boolean }) {
  const [prices, setPrices] = useState(() => ASSETS.map((a) => ({ s: a.symbol, p: a.price, c: a.change24h })));

  useEffect(() => {
    const id = setInterval(
      () =>
        setPrices((ps) =>
          ps.map((x) => {
            const d = (Math.random() - 0.5) * 0.6;
            return { ...x, p: x.p * (1 + d / 100), c: +(x.c + d).toFixed(2) };
          }),
        ),
      1500,
    );
    return () => clearInterval(id);
  }, []);

  const fmt = (p: number) => (p < 0.01 ? p.toExponential(2) : p < 10 ? p.toFixed(3) : p.toFixed(2));
  const row = (offset: number) =>
    [...prices.slice(offset), ...prices.slice(0, offset)].map((x) => (
      <span key={x.s} className={`mx-3 ${x.c >= 0 ? "text-[#3dff8a]" : "text-[#ff3b5c]"}`}>
        {x.s} {fmt(x.p)} {x.c >= 0 ? "▲" : "▼"} {x.c >= 0 ? "+" : ""}
        {x.c.toFixed(2)}%
      </span>
    ));

  return (
    <div className="absolute flex flex-col justify-center overflow-hidden bg-[#0a0716] font-mono font-bold leading-tight" style={{ ...style, fontSize: "1.25vw" }}>
      {[0, 3].map((off, i) => (
        <div key={off} className="overflow-hidden whitespace-nowrap">
          <div
            className="arena-ticker inline-block"
            style={{
              animationDuration: `${18 + i * 6}s`,
              animationDirection: (i === 0) !== !!reverse ? "normal" : "reverse",
              textShadow: "0 0 6px currentColor",
            }}
          >
            {row(off)}
            {row(off)}
          </div>
        </div>
      ))}
    </div>
  );
}
