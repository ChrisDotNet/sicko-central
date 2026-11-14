"use client";

import { toggleFavourite, useFavourites } from "@/lib/favourites";

// Follow or unfollow a player. `size="lg"` is the labelled version for the player page.
export function StarButton({ id, name, size = "sm" }: { id: number; name: string; size?: "sm" | "lg" }) {
  const on = useFavourites().has(id);
  if (size === "lg") {
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => toggleFavourite(id)}
        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-bold ${
          on ? "border-gold bg-gold text-ground" : "border-line-strong text-ink"
        }`}
      >
        <span aria-hidden="true">{on ? "★" : "☆"}</span>
        {on ? "Following" : "Follow"}
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Stop following ${name}` : `Follow ${name}`}
      onClick={() => toggleFavourite(id)}
      className={`flex size-10 shrink-0 items-center justify-center text-lg leading-none ${on ? "text-gold-text" : "text-faint hover:text-ink-2"}`}
    >
      <span aria-hidden="true">{on ? "★" : "☆"}</span>
    </button>
  );
}
