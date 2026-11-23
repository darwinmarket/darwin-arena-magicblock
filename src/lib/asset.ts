// Public files (/public) referenced from plain <img> tags or Image() are not rewritten by Next's
// basePath, so every such URL goes through this helper.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  return path.startsWith("/") ? `${BASE}${path}` : path;
}
