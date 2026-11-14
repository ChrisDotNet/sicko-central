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

const PATHS = {
  play: <path d="M8 5.5v13l11-6.5z" fill="currentColor" />,
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor" />,
  down: <path d="M6 9l6 6 6-6" />,
  up: <path d="M6 15l6-6 6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
};

// Round icon buttons: play is red; the rest are outlined.
function IconButton({ label, title, onClick, icon, primary = false }: { label: string; title: string; onClick: () => void; icon: keyof typeof PATHS; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      className={`flex size-10 shrink-0 items-center justify-center rounded-full ${primary ? "bg-sens text-white" : "border border-line-strong text-ink-2 hover:text-ink"}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {PATHS[icon]}
      </svg>
    </button>
  );
}

export function LiveRadioBar() {
  // closed: just the bar (Game page only). open: the full player. small: still playing,
  // player tucked away (the frame stays loaded so the audio keeps going), one slim row.
  // stopped: the slim row with play and close, on any page.
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
  const playing = state === "open" || state === "small";
  const strip = state === "small" || state === "stopped"; // slim row joined to the menu
  if (state === "closed" && offer === null) return null;
  const label = offer ?? "Playing";
  const small = strip;

  const stop = <IconButton label="Stop the radio" title="Stop" onClick={() => setState("stopped")} icon="stop" />;

  return (
    <>
    {/* Room at the bottom of every page so the bar never covers the last of it (phones). */}
    <div aria-hidden="true" className={`lg:hidden ${small ? "h-12" : "h-20"}`} />
    {/* Phones and tablets: open, a card floating just above the bottom menu; shrunk or
        stopped, a strip joined to the top of the menu with no gap. Desktop: a card at the
        bottom right. */}
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
        <div className={`flex items-center gap-2 px-3.5 ${small ? "py-1.5" : "py-2"}`}>
          <span className={`mr-1 flex size-2 shrink-0 rounded-full ${playing ? "live-ring bg-sens-bright" : "bg-line-strong"}`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">TSN 1200 live</div>
            {!small && <div className="truncate text-xs text-muted">{label}</div>}
            {state === "stopped" && <div className="truncate text-xs text-muted">Stopped</div>}
          </div>
          {state === "closed" && <IconButton label="Listen to TSN 1200 live" title="Listen" onClick={() => setState("open")} icon="play" primary />}
          {state === "open" && (
            <>
              <IconButton label="Shrink the player (keeps playing)" title="Shrink" onClick={() => setState("small")} icon="down" />
              {stop}
            </>
          )}
          {state === "small" && (
            <>
              <IconButton label="Show the radio player" title="Open the player" onClick={() => setState("open")} icon="up" />
              {stop}
            </>
          )}
          {state === "stopped" && (
            <>
              <IconButton label="Play TSN 1200 again" title="Play" onClick={() => setState("open")} icon="play" primary />
              <IconButton label="Close the radio bar" title="Close" onClick={() => setState("closed")} icon="close" />
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
