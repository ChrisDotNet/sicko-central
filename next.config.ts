import type { NextConfig } from "next";

// Cache profiles used by the NHL data layer (src/lib/nhl.ts).
// - live:      in-game data; the NHL itself refreshes about every 13 s
// - frequent:  schedules and scores that change during a game night
// - daily:     rosters, player pages, standings
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  cacheLife: {
    live: { stale: 5, revalidate: 10, expire: 60 },
    frequent: { stale: 30, revalidate: 60, expire: 3600 },
    daily: { stale: 300, revalidate: 3600, expire: 86400 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "assets.nhle.com" }],
  },
};

export default nextConfig;
