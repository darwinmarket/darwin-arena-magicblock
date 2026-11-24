// Logo Darwin (le D), rempli du dégradé cyan vers rose de l'Arena.
import { useId } from "react";

const PATHS = [
  "M1769 3633 l-233 -238 375 -5 374 -5 2 -385 c2 -212 3 -432 3 -489 l0 -103 111 106 c61 58 170 167 242 242 l131 136 2 472 c2 259 0 479 -2 489 -5 16 -32 17 -388 17 l-384 0 -233 -237z",
  "M1004 2858 l-239 -243 378 -3 377 -2 0 -563 0 -562 -125 -127 c-68 -71 -129 -128 -135 -128 -8 0 -11 56 -10 188 1 103 1 350 1 550 l-1 362 -378 0 -378 0 -242 -242 -242 -243 380 -3 380 -2 0 -535 0 -535 369 0 369 0 246 251 246 251 1 157 c1 86 3 497 3 914 l2 757 -381 0 -381 0 -240 -242z",
  "M2290 1749 l0 -582 -337 -339 -337 -338 -563 0 -563 0 0 535 0 535 -240 0 -240 0 -5 -22 c-4 -19 -1 -1527 4 -1535 0 -2 407 -3 904 -3 l902 0 478 478 477 478 1 319 c1 176 1 484 1 685 l-1 365 -241 3 -240 2 0 -581z",
];

export function DarwinMark({ className = "" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 279 387" className={className} aria-label="Darwin">
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2de2ff" />
          <stop offset="100%" stopColor="#ff3fb4" />
        </linearGradient>
      </defs>
      <g transform="translate(0,387) scale(0.1,-0.1)" fill={`url(#${id})`}>
        {PATHS.map((d) => (
          <path key={d.slice(0, 12)} d={d} />
        ))}
      </g>
    </svg>
  );
}
