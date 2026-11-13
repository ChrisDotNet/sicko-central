"use client";

import { useState } from "react";
import type { Goal } from "@/lib/game";
import { periodLabel } from "@/lib/format";
import { unlockSfx } from "@/lib/sfx";
import { preloadClipPlayer } from "./ClipPlayer";
import { ClipDialog, nextReelSession } from "../video/ClipDialog";
import type { Reel, ReelItem } from "../video/ClipDialog";

function strengthTag(g: Goal) {
  return g.strength === "EV" ? "" : ` · ${g.strength === "PP" ? "PPG" : g.strength === "SH" ? "SHG" : "ENG"}`;
}

function toItem(g: Goal): ReelItem {
  return {
    clipId: g.clipId as number,
    title: `${g.teamAbbrev} · ${g.scorer}${strengthTag(g)}`,
    sub: `${periodLabel(g.period, g.periodType)} ${g.time} · ${g.scoreAfter}`,
    url: g.clipUrl,
  };
}

export function GoalReplays({ goals }: { goals: Goal[] }) {
  const ready = goals.filter((g) => g.clipId);
  const [reel, setReel] = useState<Reel | null>(null);

  if (goals.length === 0) {
    return <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">No goals yet. Replays show up here a few minutes after each goal.</p>;
  }

  const open = (start: number, playAll: boolean) => {
    if (playAll) unlockSfx();
    setReel({ items: ready.map(toItem), start, playAll, session: nextReelSession() });
  };
  const totalSecs = ready.length * 40;

  return (
    <>
      {ready.length > 0 && (
        <button
          type="button"
          onPointerDown={preloadClipPlayer}
          onClick={() => open(0, true)}
          className="mb-2.5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sens text-[15px] font-bold text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5l12 7-12 7z" /></svg>
          Watch all goals{ready.length > 1 ? ` · about ${Math.max(1, Math.round(totalSecs / 60))} min` : ""}
        </button>
      )}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {[...goals].reverse().map((g) => {
          const idx = ready.indexOf(g);
          return (
            <div key={g.id} className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-3 border-b border-line px-3.5 py-2.5 last:border-0">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-1.5">
                  <span className={`rounded px-1.5 py-px text-[11px] font-bold tracking-wider ${g.team === "OTT" ? "bg-gold text-ground" : "bg-line-strong text-ink"}`}>
                    {g.teamAbbrev}
                  </span>
                  <span className="truncate text-sm font-semibold">
                    {g.scorer}
                    {g.scorerTotal ? ` (${g.scorerTotal})` : ""}
                    {strengthTag(g)}
                  </span>
                </span>
                <span className="truncate text-xs text-muted">
                  {periodLabel(g.period, g.periodType)} {g.time}
                  {g.assists.length ? ` · ${g.assists.join(", ")}` : " · Unassisted"} · {g.scoreAfter}
                </span>
              </div>
              {g.clipId ? (
                <button
                  type="button"
                  aria-label={`Play ${g.scorer} goal`}
                  onPointerDown={preloadClipPlayer}
                  onClick={() => open(idx, false)}
                  className="flex size-11 items-center justify-center rounded-full bg-line text-ink"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
                </button>
              ) : (
                <span className="text-center text-[11px] leading-tight text-muted">Soon</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">Clips appear as the NHL posts them, usually a few minutes after the goal.</p>
      <ClipDialog reel={reel} noun="goal" onClose={() => setReel(null)} />
    </>
  );
}
