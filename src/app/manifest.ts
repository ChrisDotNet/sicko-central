import type { MetadataRoute } from "next";

// Lets Sicko Central be added to a phone's Home Screen and open full screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sicko Central",
    short_name: "Sicko Central",
    description: "The game-watching companion for Ottawa Senators fans.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0d0e",
    theme_color: "#0d0d0e",
    categories: ["sports"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Game", url: "/live", description: "Tonight's game" },
      { name: "Schedule", url: "/schedule" },
    ],
  };
}
