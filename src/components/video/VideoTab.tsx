"use client";

import { useState } from "react";
import type { Goal } from "@/lib/game";
import type { GameVideo, VideoItem } from "@/lib/video";
import { unlockSfx } from "@/lib/sfx";
import { Section } from "../ui";
import { GoalReplays } from "../game/GoalReplays";
import { preloadClipPlayer } from "../game/ClipPlayer";
import { ClipDialog, nextReelSession } from "./ClipDialog";
import type { Reel, ReelItem } from "./ClipDialog";

function length(sec: number | null) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  return `${m}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
}

const toItem = (v: VideoItem): ReelItem => ({ clipId: v.clipId, title: v.title, sub: length(v.seconds), url: v.url });

const Play = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
);

// Everything the NHL has posted for one game: recap and condensed game, goals, other highlights.
export function VideoTab({
  video,
  goals,
  isFinal,
  note,
}: {
  video: GameVideo | null;
  goals: Goal[];
  isFinal: boolean;
  note?: string;
}) {
  const [reel, setReel] = useState<Reel | null>(null);
  const open = (items: VideoItem[], start: number, playAll: boolean) => {
    if (playAll) unlockSfx();
    setReel({ items: items.map(toItem), start, playAll, session: nextReelSession() });
  };

  const full = [...(video?.recaps ?? []), ...(video?.condensed ?? [])];
  const highlights = video?.highlights ?? [];

  return (
    <>
      <Section title="Full game">
        {note ? (
          <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">{note}</p>
        ) : full.length === 0 ? (
          <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
            {isFinal
              ? "The recap and condensed game usually post within an hour or two of the final."
              : "The recap and condensed game post after the final."}
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {full.map((v) => (
              <button
                key={v.clipId}
                type="button"
                onPointerDown={preloadClipPlayer}
                onClick={() => open([v], 0, false)}
                className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-gold-line bg-gold-ground px-4 py-3.5 text-left"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-display text-xl font-extrabold tracking-wide">{v.title}</span>
                  <span className="text-xs text-muted">{v.seconds ? `${length(v.seconds)} · ` : ""}NHL.com</span>
                </span>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gold text-ground">
                  <Play />
                </span>
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Goals" aside={goals.length ? `${goals.filter((g) => g.clipId).length} of ${goals.length} posted` : undefined}>
        <GoalReplays goals={goals} />
      </Section>

      {highlights.length > 0 && (
        <Section title="Other highlights" aside={`${highlights.length} clip${highlights.length > 1 ? "s" : ""}`}>
          {highlights.length > 1 && (
            <button
              type="button"
              onPointerDown={preloadClipPlayer}
              onClick={() => open(highlights, 0, true)}
              className="mb-2.5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line-strong text-[15px] font-bold text-ink"
            >
              <Play /> Watch all highlights
            </button>
          )}
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            {highlights.map((h, i) => (
              <div key={h.clipId} className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-3 border-b border-line px-3.5 py-2.5 last:border-0">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-semibold">{h.title}</span>
                  {h.seconds ? <span className="text-xs text-muted">{length(h.seconds)}</span> : null}
                </span>
                <button
                  type="button"
                  aria-label={`Play ${h.title}`}
                  onPointerDown={preloadClipPlayer}
                  onClick={() => open(highlights, i, false)}
                  className="flex size-11 items-center justify-center rounded-full bg-line text-ink"
                >
                  <Play />
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      <ClipDialog reel={reel} noun="clip" onClose={() => setReel(null)} />
    </>
  );
}
