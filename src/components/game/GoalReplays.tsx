"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Goal } from "@/lib/game";
import { periodLabel } from "@/lib/format";
import { ClipPlayer, preloadClipPlayer } from "./ClipPlayer";
import type { ClipPlayerHandle } from "./ClipPlayer";
import { unlockSfx } from "@/lib/sfx";

function strengthTag(g: Goal) {
  return g.strength === "EV" ? "" : ` · ${g.strength === "PP" ? "PPG" : g.strength === "SH" ? "SHG" : "ENG"}`;
}

export function GoalReplays({ goals }: { goals: Goal[] }) {
  const ready = goals.filter((g) => g.clipId);
  const [queue, setQueue] = useState<Goal[] | null>(null);
  const [pos, setPos] = useState(0);
  const [playAll, setPlayAll] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [session, setSession] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const playerRef = useRef<ClipPlayerHandle>(null);

  // The player decides when to move on (it must start the next clip inside the "ended"
  // event for iPhone Safari to allow it) and reports the new position here.
  const handleIndex = useCallback((i: number) => {
    setPos(i);
    setDone(false);
    setFailed(false);
  }, []);
  const handleDone = useCallback(() => setDone(true), []);
  const handleError = useCallback(() => setFailed(true), []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (queue && !d.open) d.showModal();
    if (!queue && d.open) d.close();
  }, [queue]);

  if (goals.length === 0) {
    return <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">No goals yet. Replays show up here a few minutes after each goal.</p>;
  }

  const open = (list: Goal[], start = 0, all = false) => {
    setQueue(list);
    setPos(start);
    setPlayAll(all);
    setDone(false);
    setFailed(false);
    setSession((s) => s + 1);
  };
  // Called straight from the button tap, so the browser treats the clip change as user-started.
  const go = (next: number) => playerRef.current?.goTo(next);
  const current = queue?.[pos];
  const totalSecs = ready.length * 40;

  return (
    <>
      {ready.length > 0 && (
        <button
          type="button"
          onPointerDown={preloadClipPlayer}
          onClick={() => {
            unlockSfx();
            open(ready, 0, true);
          }}
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
                  onClick={() => open(ready, idx)}
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
      <p className="mt-2 text-xs text-muted">Clips appear as the NHL posts them, usually a few minutes after the goal. Best watched at intermission.</p>

      <dialog
        ref={dialog}
        onClose={() => setQueue(null)}
        aria-label="Goal replay"
        className="m-auto w-[min(100vw-24px,640px)] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/80"
      >
        {current && (
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">
                  {current.teamAbbrev} · {current.scorer}
                  {strengthTag(current)}
                </div>
                <div className="text-xs text-muted">
                  {periodLabel(current.period, current.periodType)} {current.time}
                  {queue && queue.length > 1 ? ` · ${pos + 1} of ${queue.length}` : ""}
                </div>
              </div>
              <button type="button" onClick={() => setQueue(null)} aria-label="Close replay" className="flex size-11 items-center justify-center rounded-full bg-line">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <div className="relative w-full bg-black" aria-label={`${current.scorer} goal replay`}>
              {queue && (
                <ClipPlayer
                  key={session}
                  ref={playerRef}
                  items={queue.map((g) => ({
                    clipId: g.clipId as number,
                    title: `${g.teamAbbrev} · ${g.scorer}${strengthTag(g)}`,
                    sub: `${periodLabel(g.period, g.periodType)} ${g.time} · ${g.scoreAfter}`,
                  }))}
                  start={pos}
                  autoAdvance={playAll}
                  onIndex={handleIndex}
                  onDone={handleDone}
                  onError={handleError}
                />
              )}
            </div>
            {failed && (
              <p className="px-4 pt-3 text-sm text-ink-2">This clip wouldn&apos;t load here. Use the NHL.com link below{playAll && pos < (queue?.length ?? 0) - 1 ? ", or skip to the next goal" : ""}.</p>
            )}
            {done && playAll && <p className="px-4 pt-3 text-sm text-ink-2">That&apos;s every goal so far.</p>}
            {queue && queue.length > 1 && (
              <div className="grid grid-cols-2 gap-2 p-3">
                <button type="button" disabled={pos === 0} onClick={() => go(pos - 1)} className="min-h-11 rounded-xl border border-line-strong text-sm font-semibold disabled:opacity-30">
                  Previous goal
                </button>
                <button type="button" disabled={pos >= queue.length - 1} onClick={() => go(pos + 1)} className="min-h-11 rounded-xl bg-ink text-sm font-semibold text-ground disabled:opacity-30">
                  {playAll ? "Skip to next" : "Next goal"}
                </button>
              </div>
            )}
            {playAll && !done && queue && pos < queue.length - 1 && (
              <p className="px-4 text-xs text-muted">Next up: {queue[pos + 1].scorer}. Plays automatically after a short pause.</p>
            )}
            {current.clipUrl && (
              <a href={current.clipUrl} target="_blank" rel="noopener noreferrer" className="px-4 pb-3 text-center text-xs text-muted underline">
                Not playing? Open it on NHL.com
              </a>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
