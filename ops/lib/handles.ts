// Realistic, varied player handles for ops-created players (battery, e2e), so
// the public leaderboard reads like a real lobby. Unique within a run; never
// "test", "bot" or "battery". Bots that are bots keep an explicit bot name.
const A = ["degen", "sol", "apex", "lune", "kaito", "mammal", "reptile", "alpha", "basket", "jup", "bonk", "wif", "pyth", "jito", "whale", "shrimp", "darwin", "fossil", "raptor", "otter", "falcon", "gecko", "mantis", "orca", "lynx", "moon", "rekt", "chad", "anon", "fren", "sigma", "delta", "theta", "vega", "gamma", "candle", "wick", "pump", "hodl", "yield"];
const B = ["maxi", "hunter", "trader", "ape", "lord", "king", "queen", "farmer", "sniper", "chad", "monk", "wizard", "rider", "hands", "brain", "fren", "punk", "goblin", "shark", "tiger", "fox", "wolf", "owl", "crab", "dino", "mutant", "survivor", "alpha", "bull", "bear"];
const SUFFIX = ["", "", "", ".sol", "x", "42", "69", "777", "88", "2049", "_sol", "fi", "zz"];

function pick<T>(xs: T[], r: () => number): T {
  return xs[Math.floor(r() * xs.length)];
}

/// A deterministic handle for a seed (e.g. a public key), so reruns agree.
export function handleFor(seed: string): string {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const r = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0), h / 2 ** 32);
  const style = Math.floor(r() * 5);
  const a = pick(A, r);
  const b = pick(B, r);
  const name =
    style === 0
      ? `${a}_${b}`
      : style === 1
        ? `${a}${b}${pick(SUFFIX, r)}`
        : style === 2
          ? `${a}${Math.floor(r() * 990) + 10}`
          : style === 3
            ? `${a}.sol`
            : `${b}${pick(SUFFIX, r)}`;
  return name.slice(0, 20);
}

/// Handles for a list of seeds, made unique by appending digits on collision.
export function uniqueHandles(seeds: string[]): string[] {
  const seen = new Set<string>();
  return seeds.map((s) => {
    let h = handleFor(s);
    for (let i = 2; seen.has(h); i++) h = `${handleFor(s).slice(0, 18)}${i}`;
    seen.add(h);
    return h;
  });
}
