"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipPlayer } from "../game/ClipPlayer";
import type { ClipPlayerHandle } from "../game/ClipPlayer";

export type ReelItem = { clipId: number; title: string; sub: string; url?: string };
export type Reel = { items: ReelItem[]; start: number; playAll: boolean; session: number };

// A fresh id each time a reel opens, so the player resets even when the same clips reopen.
let reelCount = 0;
export function nextReelSession() {
  reelCount += 1;
  return reelCount;
}

// The replay window used for goals, recaps and highlights: one clip or a "watch all" reel
// with the up-next card between clips. Open it by setting `reel`; close via onClose.
export function ClipDialog({ reel, noun, onClose }: { reel: Reel | null; noun: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (reel && !d.open) d.showModal();
    if (!reel && d.open) d.close();
  }, [reel]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-label="Video"
      className="m-auto w-[min(100vw-24px,640px)] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/80"
    >
      {reel && <ReelBody key={reel.session} reel={reel} noun={noun} onClose={onClose} />}
    </dialog>
  );
}

function ReelBody({ reel, noun, onClose }: { reel: Reel; noun: string; onClose: () => void }) {
  const { items, playAll } = reel;
  const [pos, setPos] = useState(reel.start);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
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

  // Called straight from the button tap, so the browser treats the clip change as user-started.
  const go = (next: number) => playerRef.current?.goTo(next);
  const current = items[pos];
  if (!current) return null;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{current.title}</div>
          <div className="text-xs text-muted">
            {current.sub}
            {items.length > 1 ? `${current.sub ? " · " : ""}${pos + 1} of ${items.length}` : ""}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close video" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-line">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div className="relative w-full bg-black" aria-label={`${current.title} video`}>
        <ClipPlayer
          ref={playerRef}
          items={items.map((i) => ({ clipId: i.clipId, title: i.title, sub: i.sub }))}
          start={reel.start}
          autoAdvance={playAll}
          onIndex={handleIndex}
          onDone={handleDone}
          onError={handleError}
        />
      </div>
      {failed && (
        <p className="px-4 pt-3 text-sm text-ink-2">
          This {noun} wouldn&apos;t load here. Use the NHL.com link below{playAll && pos < items.length - 1 ? `, or skip to the next ${noun}` : ""}.
        </p>
      )}
      {done && playAll && <p className="px-4 pt-3 text-sm text-ink-2">That&apos;s the last one.</p>}
      {items.length > 1 && (
        <div className="grid grid-cols-2 gap-2 p-3">
          <button type="button" disabled={pos === 0} onClick={() => go(pos - 1)} className="min-h-11 rounded-xl border border-line-strong text-sm font-semibold disabled:opacity-30">
            Previous {noun}
          </button>
          <button type="button" disabled={pos >= items.length - 1} onClick={() => go(pos + 1)} className="min-h-11 rounded-xl bg-ink text-sm font-semibold text-ground disabled:opacity-30">
            {playAll ? "Skip to next" : `Next ${noun}`}
          </button>
        </div>
      )}
      {playAll && !done && pos < items.length - 1 && (
        <p className="px-4 text-xs text-muted">Next up: {items[pos + 1].title}. Plays automatically after a short pause.</p>
      )}
      {current.url && (
        <a href={current.url} target="_blank" rel="noopener noreferrer" className="px-4 pt-2 pb-3 text-center text-xs text-muted underline">
          Not playing? Open it on NHL.com
        </a>
      )}
      {playAll && (
        <p className="px-4 pb-3 text-center text-[10px] text-muted">
          Slapshot sound: &ldquo;Hockey Puck Slap&rdquo; by jameb32, SoundBible.com,{" "}
          <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer" className="underline">
            CC BY 3.0
          </a>
        </p>
      )}
    </div>
  );
}
