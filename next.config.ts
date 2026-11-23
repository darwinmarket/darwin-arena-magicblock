import type { NextConfig } from "next";

// Served at darwin.market/arena-magicblock in production: the hosting build sets
// NEXT_PUBLIC_BASE_PATH=/arena-magicblock. Locally it stays unset and the app lives at /.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  basePath,
};

export default nextConfig;
