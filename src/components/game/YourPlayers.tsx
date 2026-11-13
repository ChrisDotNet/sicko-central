"use client";

import Link from "next/link";
import type { Skater } from "@/lib/game";
import { useFavourites } from "@/lib/favourites";

// "Your players tonight": the players you follow, at the top of the game, with their line.
// Shows nothing until you follow someone who's dressed tonight.
export function YourPlayers({ skaters, className = "" }: { skaters: Skater[]; className?: string }) {
  const favs = useFavourites();
  const mine = skaters.filter((s) => favs.has(s.id));
  if (mine.length === 0) return null;
  const cell = (v: string | number, label: string) => (
    <span className="flex flex-col items-center">
      <b className="font-display text-[22px] leading-none">{v}</b>
      <span className="text-[10px] text-muted">{label}</span>
    </span>
  );
  return (
    <section className={`px-4 pt-4 ${className}`}>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-bold uppercase tracking-wider">Your players tonight</h2>
        <span className="text-xs text-muted">{mine.length} followed</span>
      </div>
      <div className="flex flex-col gap-2">
        {mine.map((s) => (
          <Link
            key={s.id}
            href={`/player/${s.id}`}
            className="grid grid-cols-[minmax(0,1fr)_repeat(4,44px)] items-center rounded-xl border border-gold-line bg-gold-ground px-3 py-2.5"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-bold">
                <span className="text-gold-text">★</span> {s.name}
              </span>
              <span className="text-xs text-muted">
                {s.g || s.a ? `${s.g}G ${s.a}A tonight` : "No points yet"}
              </span>
            </span>
            {cell(s.g + s.a, "PTS")}
            {cell(s.sog, "SOG")}
            {cell(s.hits ?? "–", "HIT")}
            {cell(s.toi ? s.toi.replace(/^0/, "") : "–", "TOI")}
          </Link>
        ))}
      </div>
    </section>
  );
}
