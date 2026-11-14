"use client";

import { useEffect } from "react";
import { useFavourites } from "@/lib/favourites";
import { currentSubscription, loadPrefs, savePrefs } from "@/lib/push-client";

// Keeps the server's list of followed players in step with this phone's stars, so
// "Your players" alerts follow the stars. Does nothing unless notifications are on.
export function PushSync() {
  const favs = useFavourites();
  useEffect(() => {
    const now = JSON.stringify([...favs].sort());
    let last: string | null = null;
    try {
      last = localStorage.getItem("sicko:notify-favs");
    } catch {
      /* fine */
    }
    if (now === last) return;
    const id = setTimeout(() => {
      currentSubscription().then((s) => {
        if (!s) return;
        void savePrefs(loadPrefs());
        try {
          localStorage.setItem("sicko:notify-favs", now);
        } catch {
          /* fine */
        }
      });
    }, 1500);
    return () => clearTimeout(id);
  }, [favs]);
  return null;
}
