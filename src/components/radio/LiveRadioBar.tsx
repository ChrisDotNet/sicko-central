"use client";

import { useEffect, useState } from "react";
import { onOpenLiveRadio } from "@/lib/media-bus";

// iHeartRadio's official embeddable player for TSN 1200, the same one TSN uses on its
// own "Listen live" page. Loaded only when opened, so it costs nothing until someone listens.
// It's a third-party frame, so it can't be paused from here when a replay starts.
// Phones and tablets: a bar pinned above the bottom menu. Desktop: a card pinned to the
// bottom of the page's right-hand column. One instance either way, so switching tabs
// never cuts the audio.
const EMBED = "https://www.iheart.com/live/tsn-1200-7503/?embed=true&theme=dark";
const APP = "https://www.iheart.com/live/tsn-1200-7503/";

export function LiveRadioBar({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => onOpenLiveRadio(() => setOpen(true)), []);

  return (
    <div className="fixed inset-x-0 bottom-[72px] z-10 mx-auto max-w-xl px-3 pb-[env(safe-area-inset-bottom)] md:max-w-4xl md:px-6 lg:inset-x-auto lg:bottom-6 lg:right-[max(2.5rem,calc((100vw-1360px)/2+2.5rem))] lg:mx-0 lg:w-[320px] lg:max-w-none lg:px-0 lg:pb-0">
      <div className="overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.5)] lg:shadow-none">
        <div className="flex items-center gap-3 px-3.5 py-2">
          <span className="flex size-2 shrink-0 rounded-full bg-sens-bright" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">TSN 1200 live</div>
            <div className="truncate text-xs text-muted">{label}</div>
          </div>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className={`min-h-11 rounded-xl px-3.5 text-sm font-bold ${open ? "border border-line-strong text-ink" : "bg-sens text-white"}`}
          >
            {open ? "Hide" : "Listen"}
          </button>
        </div>
        {open && (
          <div className="border-t border-line">
            <iframe
              src={EMBED}
              title="TSN 1200 live radio"
              allow="autoplay"
              className="block h-[200px] w-full border-0"
            />
            <div className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs text-muted">
              <span>Pause the radio before watching a replay.</span>
              <a href={APP} target="_blank" rel="noopener noreferrer" className="shrink-0 underline">
                Open in iHeartRadio
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
