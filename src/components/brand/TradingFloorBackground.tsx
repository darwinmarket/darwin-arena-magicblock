"use client";

// Fond du jeu : la salle des marchés (public/arena/trading_floor.png), animée en code :
//  - intro : on "arrive" dans la salle (zoom arrière + mise au point), dans la continuité
//    du zoom dans la Bourse depuis la rue ;
//  - lampes du plafond et enseigne DARWIN ARENA qui pulsent ;
//  - écrans CRT qui scintillent ;
//  - tickets de bourse qui tombent en virevoltant, poussière dans les faisceaux de lumière ;
//  - parallaxe légère à la souris.
// Les % sont des positions dans l'image (1024 x 572).
import { asset } from "@/lib/asset";
import { useEffect, useRef, useState } from "react";

const IMG_W = 1024;
const IMG_H = 572;

// Lampes suspendues (centre du cône de lumière)
const LAMPS = [
  [215, 70], [335, 135], [372, 160], [400, 178],
  [808, 70], [688, 135], [650, 160], [622, 178],
  [65, 225], [955, 225],
];
// Écrans CRT visibles (centre de l'écran)
const SCREENS = [
  [28, 350], [100, 352], [185, 360], [107, 410], [185, 418], [32, 408],
  [850, 365], [920, 405], [1000, 352], [1003, 412], [233, 278], [300, 268],
  [700, 270], [760, 272],
];

export function TradingFloorBackground({ dim = 0.5 }: { dim?: number }) {
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = IMG_W * dpr;
    canvas.height = IMG_H * dpr;
    ctx.scale(dpr, dpr);

    // Tickets de papier qui tombent
    const papers = Array.from({ length: 26 }, () => ({
      x: Math.random() * IMG_W,
      y: Math.random() * IMG_H,
      w: 7 + Math.random() * 6,
      h: 4 + Math.random() * 3,
      vy: 8 + Math.random() * 14,
      sway: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 2,
    }));
    // Poussière dans les faisceaux
    const dust = Array.from({ length: 60 }, () => {
      const [lx, ly] = LAMPS[Math.floor(Math.random() * LAMPS.length)];
      return { x: lx + (Math.random() - 0.5) * 60, y: ly + Math.random() * 120, phase: Math.random() * 6.28, lx, ly };
    });
    const screens = SCREENS.map(([x, y]) => ({ x, y, phase: Math.random() * 6.28, speed: 2 + Math.random() * 6 }));

    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      ctx.clearRect(0, 0, IMG_W, IMG_H);
      ctx.globalCompositeOperation = "lighter";

      // Cônes de lumière des lampes qui respirent
      LAMPS.forEach(([x, y], i) => {
        const a = 0.1 + 0.06 * Math.sin(t * 1.3 + i);
        const g = ctx.createRadialGradient(x, y + 30, 0, x, y + 30, 70);
        g.addColorStop(0, `rgba(255,214,150,${a})`);
        g.addColorStop(1, "rgba(255,214,150,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y + 30, 70, 0, Math.PI * 2);
        ctx.fill();
      });

      // Écrans CRT : scintillement vert
      for (const s of screens) {
        const flick = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        const a = 0.06 + 0.12 * flick * flick;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 26);
        g.addColorStop(0, `rgba(80,255,160,${a})`);
        g.addColorStop(1, "rgba(80,255,160,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 26, 0, Math.PI * 2);
        ctx.fill();
      }

      // Poussière
      for (const d of dust) {
        d.y += dt * 4;
        if (d.y > d.ly + 140) d.y = d.ly;
        const a = 0.25 + 0.25 * Math.sin(t * 2 + d.phase);
        ctx.fillStyle = `rgba(255,230,190,${a})`;
        ctx.fillRect(d.x + Math.sin(t + d.phase) * 4, d.y, 1.2, 1.2);
      }

      ctx.globalCompositeOperation = "source-over";

      // Tickets qui tombent en virevoltant
      for (const p of papers) {
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.y > IMG_H + 10) {
          p.y = -10;
          p.x = Math.random() * IMG_W;
        }
        const x = p.x + Math.sin(t * 1.2 + p.sway) * 12;
        ctx.save();
        ctx.translate(x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.abs(Math.cos(t * 2 + p.sway)) * 0.8 + 0.2); // effet de retournement
        ctx.fillStyle = "rgba(240,232,215,0.85)";
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.fillStyle = "rgba(60,180,110,0.7)";
        ctx.fillRect(-p.w / 2 + 1, -0.5, p.w - 2, 1);
        ctx.restore();
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const px = reduced ? 0 : mouse.x * -16;
  const py = reduced ? 0 : mouse.y * -9;

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-[#1a0f24]">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: `max(100vw, calc(100vh * ${IMG_W / IMG_H}))`,
          height: `max(100vh, calc(100vw * ${IMG_H / IMG_W}))`,
          transform: `translate(calc(-50% + ${px}px), calc(-50% + ${py}px)) scale(1.05)`,
          transition: "transform 300ms ease-out",
        }}
      >
        {/* Intro : on arrive dans la salle (zoom arrière + mise au point), animation CSS one-shot */}
        <div className="arena-arrive absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/arena/trading_floor.png")} alt="" className="absolute inset-0 h-full w-full select-none" draggable={false} />
          {/* Halo pulsé de l'enseigne DARWIN ARENA */}
          <div className="arena-sign absolute rounded-md" style={{ left: "42.2%", top: "27.6%", width: "15.4%", height: "13%" }} />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          {/* Lignes de balayage CRT très légères */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.12)_0px,rgba(0,0,0,0.12)_1px,transparent_1px,transparent_3px)] mix-blend-multiply" />
        </div>
      </div>
      <div className="absolute inset-0" style={{ background: `rgba(10,6,20,${dim})` }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}
