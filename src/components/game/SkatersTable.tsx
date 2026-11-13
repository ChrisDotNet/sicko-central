"use client";

import Link from "next/link";
import { useState } from "react";
import type { Skater } from "@/lib/game";
import { useFavourites } from "@/lib/favourites";
import { StarButton } from "../StarButton";

// Top skaters first (points, then goals, then shots); the rest of the lineup is one tap away.
// Players you follow are starred, highlighted and always shown, even outside the top 8.
// Phones and tablets show goals, assists, shots and ice time; desktop adds hits, blocked
// shots and plus-minus.
const COLS = "grid-cols-[minmax(0,1fr)_30px_30px_40px_56px] lg:grid-cols-[minmax(0,1fr)_repeat(6,48px)_60px]";
const num = (n: number | null) => (n == null ? "–" : String(n));
const pm = (n: number | null) => (n == null ? "–" : n > 0 ? `+${n}` : String(n));
export function SkatersTable({ skaters, limit = 8, note }: { skaters: Skater[]; limit?: number; note?: string }) {
  const [all, setAll] = useState(false);
  const favs = useFavourites();
  if (skaters.length === 0) return null;
  const shown = all ? skaters : skaters.filter((k, i) => i < limit || favs.has(k.id));
  const hidden = skaters.length - shown.length;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className={`grid ${COLS} border-b border-line py-2.5 pr-3.5 pl-11 text-[11px] font-semibold text-muted`}>
          <span>Player</span><span className="text-right">G</span><span className="text-right">A</span><span className="text-right">SOG</span>
          <span className="hidden text-right lg:block">HIT</span><span className="hidden text-right lg:block">BLK</span><span className="hidden text-right lg:block">+/-</span>
          <span className="text-right">TOI</span>
        </div>
        {shown.map((k) => {
          const fav = favs.has(k.id);
          return (
          <div key={k.id} className={`flex items-center border-b border-line pl-1 last:border-0 ${fav ? "bg-gold-ground shadow-[inset_3px_0_0_#c2912c]" : ""}`}>
          <StarButton id={k.id} name={k.name} />
          <Link href={`/player/${k.id}`} className={`grid min-h-11 flex-1 ${COLS} items-center py-2.5 pr-3.5 text-sm tabular hover:bg-surface-2`}>
            <span className="truncate font-semibold">{k.name}</span>
            <span className="text-right">{k.g}</span>
            <span className="text-right">{k.a}</span>
            <span className="text-right">{k.sog}</span>
            <span className="hidden text-right lg:block">{num(k.hits)}</span>
            <span className="hidden text-right lg:block">{num(k.blocks)}</span>
            <span className="hidden text-right lg:block">{pm(k.plusMinus)}</span>
            <span className="text-right text-ink-2">{k.toi.replace(/^0/, "")}</span>
          </Link>
          </div>
          );
        })}
        {(hidden > 0 || all) && skaters.length > limit && (
          <button
            type="button"
            aria-expanded={all}
            onClick={() => setAll((a) => !a)}
            className="flex min-h-11 w-full items-center justify-center text-sm font-semibold text-ink"
          >
            {all ? "Show fewer" : `Show all ${skaters.length} skaters`}
          </button>
        )}
      </div>
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </>
  );
}
