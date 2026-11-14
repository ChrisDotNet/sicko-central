"use client";

import { useEffect, useState } from "react";
import { onOpenLiveRadio } from "@/lib/media-bus";
import { setRadioMode, useRadio } from "@/lib/radio-store";

// iHeartRadio's official embeddable player for TSN 1200, the same one TSN uses on its
// own "Listen live" page. Loaded only when opened, so it costs nothing until someone listens.
// It's a third-party frame, so it can't be paused from here when a replay starts. While it
// plays it can shrink to one slim row (Shrink / Player), and Stop unloads it.
// Phones and tablets: a bar pinned above the bottom menu. Desktop: a card pinned to the
// bottom of the page's right-hand column. One instance either way, so switching tabs
// never cuts the audio. It sits in the root layout, so it also keeps playing across pages:
// shown with "Listen" on the Game page while a game is on, and on every page while playing.
const EMBED = "https://www.iheart.com/live/tsn-1200-7503/?embed=true&theme=dark";
const APP = "https://www.iheart.com/live/tsn-1200-7503/";

export function LiveRadioBar() {
  // closed: just the bar. open: the full player. small: still playing, player tucked away
  // (the frame stays loaded so the audio keeps going), one slim row.
  const { mode: state, offer } = useRadio();
  const setState = setRadioMode;
  useEffect(() => onOpenLiveRadio(() => setRadioMode("open")), []);
  // The bottom menu's height (it varies with the phone's home-indicator area), so the bar can
  // sit right on top of it.
  const [navH, setNavH] = useState(72);
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>("nav.fixed.bottom-0");
    if (!nav) return;
    const ro = new ResizeObserver(() => setNavH(nav.offsetHeight));
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);
  const playing = state !== "closed";
  const small = state === "small";
  if (!playing && offer === null) return null;
  const label = offer ?? "Playing";

  return (
    <>
    {/* Room at the bottom of every page so the bar never covers the last of it (phones). */}
    <div aria-hidden="true" className={`lg:hidden ${small ? "h-12" : "h-20"}`} />
    {/* Phones and tablets: open, a card floating just above the bottom menu; shrunk, a strip
        joined to the top of the menu with no gap. Desktop: a card at the bottom right. */}
    <div
      style={{ ["--nav-h" as string]: `${navH}px` }}
      className={`fixed inset-x-0 z-10 mx-auto max-w-xl md:max-w-4xl lg:inset-x-auto lg:bottom-6 lg:right-[max(2.5rem,calc((100vw-1360px)/2+2.5rem))] lg:mx-0 lg:w-[320px] lg:max-w-none lg:px-0 ${
        small ? "bottom-[var(--nav-h)] px-0" : "bottom-[calc(var(--nav-h)+8px)] px-3 md:px-6"
      }`}
    >
      <div
        className={`overflow-hidden border-line-strong bg-surface lg:rounded-2xl lg:border lg:shadow-none ${
          small ? "border-t bg-[#151518]" : "rounded-2xl border shadow-[0_-8px_24px_rgba(0,0,0,0.5)]"
        }`}
      >
        <div className={`flex items-center gap-3 px-3.5 ${state === "small" ? "py-1.5" : "py-2"}`}>
          <span className={`flex size-2 shrink-0 rounded-full bg-sens-bright ${playing ? "live-ring" : ""}`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">TSN 1200 live</div>
            {state !== "small" && <div className="truncate text-xs text-muted">{label}</div>}
          </div>
          {state === "closed" && (
            <button type="button" onClick={() => setState("open")} className="min-h-11 rounded-xl bg-sens px-3.5 text-sm font-bold text-white">
              Listen
            </button>
          )}
          {state === "open" && (
            <>
              <button type="button" onClick={() => setState("small")} aria-label="Shrink the radio player, keep listening" className="min-h-11 rounded-xl border border-line-strong px-3 text-sm font-semibold">
                Shrink
              </button>
              <button type="button" onClick={() => setState("closed")} className="min-h-11 rounded-xl border border-line-strong px-3 text-sm font-semibold">
                Stop
              </button>
            </>
          )}
          {state === "small" && (
            <>
              <button type="button" onClick={() => setState("open")} aria-label="Show the radio player" className="min-h-10 rounded-xl border border-line-strong px-3 text-sm font-semibold">
                Player
              </button>
              <button type="button" onClick={() => setState("closed")} className="min-h-10 rounded-xl border border-line-strong px-3 text-sm font-semibold">
                Stop
              </button>
            </>
          )}
        </div>
        {/* The player stays loaded while shrunk (hiding it with display:none can stop the audio), just out of sight. */}
        {playing && (
          <div className={state === "small" ? "pointer-events-none h-0 overflow-hidden" : "border-t border-line"}>
            <iframe src={EMBED} title="TSN 1200 live radio" allow="autoplay" className="block h-[200px] w-full border-0" />
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
    </>
  );
}
