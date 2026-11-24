"use client";

// Le duel en course sur Wall Street : l'avenue de l'accueil (public/arena/street.png) devient
// une piste à deux voies. Caméra de poursuite derrière les deux voitures :
//  - la route défile (pointillés, traînées de vitesse) au rythme du chrono ;
//  - l'écart entre les voitures suit l'écart de score des deux paniers ;
//  - la ligne d'arrivée sort du point de fuite pendant les dernières secondes et arrive
//    pile sur les voitures au gong : celle qui est devant la franchit en premier.
// Tout est dessiné en coordonnées image (1376 x 768) dans un conteneur en mode "cover".
import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import { asset } from "@/lib/asset";

const IMG_W = 1376;
const IMG_H = 768;
const VP = { x: 688, y: 312 }; // point de fuite de l'avenue
const BOTTOM_DY = IMG_H - VP.y;
const ROAD = 0.7; // demi-largeur de la chaussée peinte (les néons cyan de l'image sont à 0.74)
const LANE = 0.36; // centre des deux voies
const Z_GRID = 2.2; // profondeur des voitures à égalité
const SPEED = 2.6; // vitesse de défilement (unités monde par seconde)
const GAP_SCALE = 0.06; // % d'écart pour ~76 % de l'avance maximale
const LEAD_Z = 2.3; // le meneur peut partir jusqu'à Z_GRID + 2.3
const TRAIL_Z = 0.18; // le poursuivant recule au plus de 0.18
const ENTRANCE = { x: 79.2, y: 50.8 }; // porte de la Bourse : on en ressort au début du duel

export type RacePhase = "intro" | "grid" | "countdown" | "race" | "done";

export interface RaceState {
  phase: RacePhase;
  t: number; // secondes de course écoulées
  total: number; // durée du duel
  diff: number; // mon score moins celui du rival, en %
  flash: { color: string; at: number } | null; // éclair de mutation (performance.now())
}

const project = (k: number, z: number, h = 0) => {
  const dy = BOTTOM_DY / z;
  return { x: VP.x + k * dy, y: VP.y + dy - h * dy, dy };
};

export function RaceScene({
  state,
  meColor,
  oppColor,
  meLabel,
  oppLabel,
}: {
  state: MutableRefObject<RaceState>;
  meColor: string;
  oppColor: string;
  meLabel: ReactNode;
  oppLabel: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const meTag = useRef<HTMLDivElement>(null);
  const oppTag = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = IMG_W * dpr;
    canvas.height = IMG_H * dpr;
    ctx.scale(dpr, dpr);
    const font = getComputedStyle(document.documentElement).getPropertyValue("--font-chakra").trim() || "sans-serif";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const streaks = Array.from({ length: 34 }, () => ({
      k: (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 0.9),
      w: Math.random() * 30,
      h: Math.random() < 0.4 ? 0.2 + Math.random() * 1.4 : 0,
    }));
    type P = { x: number; y: number; vx: number; vy: number; life: number; c: string; r: number };
    const parts: P[] = [];

    let phase: RacePhase = state.current.phase;
    let since = performance.now();
    let gap = 0;
    let gaining = 0; // vitesse de variation de l'écart (>0 : je reprends du terrain)
    let post = 0;
    let t0 = -1; // instant du duel où la course démarre à l'écran
    let last = performance.now();
    let raf = 0;

    const quad = (k1: number, k2: number, z1: number, z2: number, fill: string | CanvasGradient) => {
      const a = project(k1, z1), b = project(k2, z1), c = project(k2, z2), d = project(k1, z2);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();
    };

    const checker = (z: number, depth: number, cols: number, alpha: number) => {
      for (let r = 0; r < 2; r++)
        for (let i = 0; i < cols; i++) {
          const k1 = -ROAD + (i / cols) * ROAD * 2;
          const k2 = -ROAD + ((i + 1) / cols) * ROAD * 2;
          const z1 = z + (r * depth) / 2;
          quad(k1, k2, z1, z1 + depth / 2, (i + r) % 2 ? `rgba(15,8,28,${alpha})` : `rgba(255,255,255,${alpha * 0.92})`);
        }
    };

    const gantry = (z: number) => {
      const fade = Math.min(1, (34 - z) / 10);
      if (fade <= 0) return;
      ctx.globalAlpha = fade;
      const P = 0.86;
      for (const s of [-1, 1]) {
        const b = project(s * P, z), tp = project(s * P, z, 1.2);
        const w = Math.max(1.5, b.dy * 0.035);
        ctx.fillStyle = "#1a1030";
        ctx.fillRect(b.x - w / 2, tp.y, w, b.y - tp.y);
        ctx.fillStyle = "#ffc861";
        ctx.shadowColor = "#ffc861";
        ctx.shadowBlur = 12;
        ctx.fillRect(b.x - w / 2, tp.y, w * 0.25, b.y - tp.y);
        ctx.shadowBlur = 0;
      }
      const l = project(-P, z, 1.2), r = project(P, z, 0.95);
      const bh = r.y - l.y;
      ctx.fillStyle = "rgba(14,8,28,0.94)";
      ctx.fillRect(l.x, l.y, r.x - l.x, bh);
      // damier aux deux bouts de la banderole
      const cell = bh / 3;
      for (const x0 of [l.x, r.x - cell * 3])
        for (let i = 0; i < 3; i++)
          for (let j = 0; j < 3; j++)
            if ((i + j) % 2 === 0) {
              ctx.fillStyle = "#fff";
              ctx.fillRect(x0 + i * cell, l.y + j * cell, cell, cell);
            }
      ctx.strokeStyle = "#ffc861";
      ctx.lineWidth = Math.max(1, bh * 0.06);
      ctx.shadowColor = "#ffc861";
      ctx.shadowBlur = 16;
      ctx.strokeRect(l.x, l.y, r.x - l.x, bh);
      ctx.fillStyle = "#fff6dc";
      ctx.font = `italic 700 ${bh * 0.62}px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("FINISH", VP.x, l.y + bh / 2 + bh * 0.04);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    };

    const car = (k: number, z: number, color: string, t: number, rev: number) => {
      const p = project(k, z);
      const w = p.dy * 0.42;
      const h = w * 0.46;
      const shake = rev * Math.sin(t * 60 + k * 10) * w * 0.006;
      const x = p.x + shake;
      const y = p.y + Math.sin(t * 9 + k) * w * 0.004;

      // néon sous la voiture
      const g = ctx.createRadialGradient(x, y, 0, x, y, w * 0.95);
      g.addColorStop(0, color + "aa");
      g.addColorStop(0.45, color + "33");
      g.addColorStop(1, color + "00");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.95, w * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      ctx.ellipse(x, y - h * 0.02, w * 0.56, w * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();

      // roues
      ctx.fillStyle = "#05030a";
      for (const s of [-1, 1]) ctx.fillRect(x + s * w * 0.4 - w * 0.08, y - h * 0.34, w * 0.16, h * 0.34);

      // carrosserie
      const body = ctx.createLinearGradient(0, y - h * 0.7, 0, y);
      body.addColorStop(0, "#3a2160");
      body.addColorStop(1, "#130a22");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.5, y - h * 0.1);
      ctx.lineTo(x - w * 0.47, y - h * 0.62);
      ctx.lineTo(x + w * 0.47, y - h * 0.62);
      ctx.lineTo(x + w * 0.5, y - h * 0.1);
      ctx.quadraticCurveTo(x, y - h * 0.02, x - w * 0.5, y - h * 0.1);
      ctx.fill();

      // habitacle + vitre arrière qui reflète la couleur du joueur
      const glass = ctx.createLinearGradient(0, y - h * 1.02, 0, y - h * 0.62);
      glass.addColorStop(0, color + "66");
      glass.addColorStop(1, "#0b0716");
      ctx.fillStyle = "#1c1030";
      ctx.beginPath();
      ctx.moveTo(x - w * 0.4, y - h * 0.62);
      ctx.lineTo(x - w * 0.28, y - h * 1.04);
      ctx.lineTo(x + w * 0.28, y - h * 1.04);
      ctx.lineTo(x + w * 0.4, y - h * 0.62);
      ctx.fill();
      ctx.fillStyle = glass;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.34, y - h * 0.64);
      ctx.lineTo(x - w * 0.25, y - h * 0.98);
      ctx.lineTo(x + w * 0.25, y - h * 0.98);
      ctx.lineTo(x + w * 0.34, y - h * 0.64);
      ctx.fill();

      // aileron
      ctx.fillStyle = "#0e0818";
      ctx.fillRect(x - w * 0.49, y - h * 0.8, w * 0.98, h * 0.07);
      ctx.fillStyle = color;
      ctx.fillRect(x - w * 0.49, y - h * 0.8, w * 0.98, h * 0.02);

      // barre de feux à la couleur du joueur
      ctx.shadowColor = color;
      ctx.shadowBlur = w * 0.25;
      ctx.fillStyle = color;
      ctx.fillRect(x - w * 0.44, y - h * 0.5, w * 0.88, h * 0.08);
      ctx.fillStyle = "#ff2a55";
      ctx.shadowColor = "#ff2a55";
      for (const s of [-1, 1]) ctx.fillRect(x + s * w * 0.44 - (s > 0 ? w * 0.12 : 0), y - h * 0.53, w * 0.12, h * 0.14);
      ctx.shadowBlur = 0;

      // plaque
      ctx.fillStyle = "#0b0716";
      ctx.fillRect(x - w * 0.1, y - h * 0.33, w * 0.2, h * 0.12);

      return { x, top: y - h * 1.04, w, exhaust: { x: x, y: y - h * 0.12 } };
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const s = state.current;
      if (s.phase !== phase) {
        phase = s.phase;
        since = now;
      }
      const inPhase = (now - since) / 1000;

      // caméra
      if (phase === "done") post += dt;
      // Si on arrive en cours de duel, la caméra part de 0 et rattrape en douceur : elle atteint
      // la ligne pile au gong, sans saut.
      if (phase === "race" && t0 < 0) t0 = Math.min(s.t, s.total - 1);
      if (phase !== "race" && phase !== "done") t0 = -1;
      const raceCam = t0 < 0 ? 0 : (SPEED * s.total * Math.max(0, s.t - t0)) / Math.max(1, s.total - t0);
      const cam = phase === "race" ? raceCam : phase === "done" ? (t0 < 0 ? SPEED * s.total : raceCam) + SPEED * 1.4 * (1 - Math.exp(-post / 1.4)) : 0;
      const moving = phase === "race" ? 1 : phase === "done" ? Math.exp(-post / 1.4) : 0;

      // écart entre les voitures (lissé)
      // Écart amplifié : 0.01 % se voit déjà, 0.05 % c'est une vraie avance, au-delà ça plafonne.
      const target = Math.tanh(s.diff / GAP_SCALE);
      const prevGap = gap;
      gap += (target - gap) * (1 - Math.exp(-dt * 3));
      gaining = (gap - prevGap) / Math.max(dt, 1e-3);
      // entrée en grille : les voitures arrivent depuis sous la caméra
      const roll = phase === "intro" ? 0 : phase === "grid" ? 1 - Math.pow(1 - Math.min(1, inPhase / 1.3), 3) : 1;
      // Le meneur s'envole vers le fond de l'avenue, le poursuivant recule un peu sans sortir de l'écran.
      const grid = 0.55 + (Z_GRID - 0.55) * roll;
      const zOf = (g: number) => grid + (g > 0 ? g * LEAD_Z : g * TRAIL_Z);
      const zMe = zOf(gap);
      const zOpp = zOf(-gap);

      ctx.clearRect(0, 0, IMG_W, IMG_H);

      // chaussée repeinte en deux voies
      const zN = 0.82;
      const n = project(0, zN);
      const road = ctx.createLinearGradient(0, IMG_H, 0, VP.y);
      road.addColorStop(0, "rgba(20,12,36,1)");
      road.addColorStop(0.75, "rgba(30,18,50,0.97)");
      road.addColorStop(1, "rgba(60,30,60,0)");
      ctx.fillStyle = road;
      ctx.beginPath();
      ctx.moveTo(VP.x - ROAD * n.dy, n.y);
      ctx.lineTo(VP.x + ROAD * n.dy, n.y);
      ctx.lineTo(VP.x, VP.y);
      ctx.fill();
      for (const [side, c] of [[-1, meColor], [1, oppColor]] as const) {
        const lg = ctx.createLinearGradient(0, IMG_H, 0, VP.y + 40);
        lg.addColorStop(0, c + "22");
        lg.addColorStop(1, c + "00");
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(VP.x, n.y);
        ctx.lineTo(VP.x + side * ROAD * n.dy, n.y);
        ctx.lineTo(VP.x, VP.y);
        ctx.fill();
      }

      // pointillés centraux qui défilent
      const SP = 2.2;
      for (let w = Math.ceil(cam / SP) * SP; w < cam + 40; w += SP) {
        const z = w - cam;
        if (z < 0.5) continue;
        const a = Math.min(1, (40 - z) / 20);
        quad(-0.018, 0.018, z, z + 1, `rgba(255,255,255,${0.75 * a})`);
      }

      // ligne de départ (dépassée dès que la course démarre)
      const zStart = Z_GRID + 0.35 - cam;
      if (zStart > 0.5) checker(zStart, 0.18, 12, 0.85);

      // ligne d'arrivée : au gong elle est pile à la hauteur des voitures
      const zFinish = SPEED * s.total + Z_GRID - cam;
      const showFinish = zFinish > 0.5 && zFinish < 36;
      if (showFinish) {
        checker(zFinish, 0.32, 14, Math.min(1, (36 - zFinish) / 8));
        const a = project(-ROAD, zFinish), b = project(ROAD, zFinish);
        ctx.strokeStyle = "#ffc861";
        ctx.shadowColor = "#ffc861";
        ctx.shadowBlur = 14;
        ctx.lineWidth = Math.max(1, a.dy * 0.012);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // traînées de vitesse sur les trottoirs et les façades
      if (!reduced && moving > 0.05) {
        ctx.lineCap = "round";
        for (const st of streaks) {
          let z = st.w - (cam % 30);
          if (z < 0.6) z += 30;
          if (z > 14) continue;
          const a = project(st.k, z, st.h), b = project(st.k, z + 0.9 + moving * 0.8, st.h);
          ctx.strokeStyle = `rgba(255,255,255,${0.22 * moving * Math.min(1, (14 - z) / 4)})`;
          ctx.lineWidth = Math.max(0.6, a.dy * 0.006);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // voitures et portique, dans l'ordre de profondeur
      const rev = phase === "countdown" ? 1 : 0;
      const items: { z: number; draw: () => void }[] = [
        {
          z: zMe,
          draw: () => {
            const c = car(-LANE, zMe, meColor, t, rev);
            place(meTag.current, c.x, c.top, c.w);
            emit(c.exhaust.x, c.exhaust.y, c.w, meColor, moving + rev * 0.6 + Math.max(0, gaining) * 2, gaining > 0.05 ? 2 : s.diff > 0 ? 1.3 : 0.8);
          },
        },
        {
          z: zOpp,
          draw: () => {
            const c = car(LANE, zOpp, oppColor, t + 1.3, rev);
            place(oppTag.current, c.x, c.top, c.w);
            emit(c.exhaust.x, c.exhaust.y, c.w, oppColor, moving + rev * 0.6 + Math.max(0, -gaining) * 2, gaining < -0.05 ? 2 : s.diff < 0 ? 1.3 : 0.8);
          },
        },
      ];
      if (showFinish) items.push({ z: zFinish, draw: () => gantry(zFinish) });
      items.sort((a, b) => b.z - a.z).forEach((i) => i.draw());

      // étincelles d'échappement
      ctx.globalCompositeOperation = "lighter";
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.life -= dt * 1.8;
        if (q.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        ctx.fillStyle = q.c + Math.floor(q.life * 200).toString(16).padStart(2, "0");
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r * q.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      // éclair de mutation
      if (s.flash) {
        const a = 1 - (now - s.flash.at) / 700;
        if (a > 0) {
          ctx.fillStyle = s.flash.color + Math.floor(a * 90).toString(16).padStart(2, "0");
          ctx.fillRect(0, 0, IMG_W, IMG_H);
        }
      }

      // la caméra ressort de la Bourse au début du duel
      if (zoomRef.current) {
        const k = phase === "intro" ? Math.min(1, inPhase / 1.4) : 1;
        const e = 1 - Math.pow(1 - k, 3);
        zoomRef.current.style.transform = `scale(${1 + 5 * (1 - e)})`;
        zoomRef.current.style.filter = k < 1 ? `blur(${(1 - e) * 8}px) brightness(${1 + (1 - e) * 0.8})` : "none";
      }

      raf = requestAnimationFrame(frame);
    };

    const place = (el: HTMLDivElement | null, x: number, top: number, w: number) => {
      if (!el) return;
      el.style.left = `${(x / IMG_W) * 100}%`;
      el.style.top = `${(top / IMG_H) * 100}%`;
      el.style.transform = `translate(-50%, -115%) scale(${Math.max(0.72, Math.min(1.05, w / 150))})`;
    };

    const emit = (x: number, y: number, w: number, c: string, rate: number, boost: number) => {
      if (reduced || rate <= 0.05) return;
      if (Math.random() > rate * 0.9) return;
      for (const s of [-1, 1])
        parts.push({
          x: x + s * w * 0.22,
          y,
          vx: (Math.random() - 0.5) * 30 + s * 12,
          vy: 60 + Math.random() * 90 * boost,
          life: 0.5 + Math.random() * 0.4,
          c,
          r: w * 0.03 * boost,
        });
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [state, meColor, oppColor]);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-[#140c26]">
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: `max(100vw, calc(100vh * ${IMG_W / IMG_H}))`,
          height: `max(100vh, calc(100vw * ${IMG_H / IMG_W}))`,
        }}
      >
        <div ref={zoomRef} className="absolute inset-0" style={{ transformOrigin: `${ENTRANCE.x}% ${ENTRANCE.y}%`, transform: "scale(6)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/arena/street.png")} alt="" className="absolute inset-0 h-full w-full select-none" draggable={false} />
          <div className="arena-neon absolute inset-0 mix-blend-screen" />
          <div className="arena-sign absolute rounded-md" style={{ left: "42.2%", top: "23.6%", width: "15.6%", height: "6.2%" }} />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          <div ref={meTag} className="absolute origin-bottom">
            {meLabel}
          </div>
          <div ref={oppTag} className="absolute origin-bottom">
            {oppLabel}
          </div>
        </div>
      </div>
      {/* vignette pour la lisibilité du HUD */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,transparent_45%,rgba(6,3,16,0.7)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#0b0716]/80 to-transparent" />
    </div>
  );
}
