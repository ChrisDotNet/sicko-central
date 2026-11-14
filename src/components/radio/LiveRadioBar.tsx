"use client";

import { useEffect, useRef, useState } from "react";
import { onOpenLiveRadio } from "@/lib/media-bus";
import { setRadioStarted, useRadio } from "@/lib/radio-store";

// TSN 1200 live, as one slim strip: start and stop, nothing else.
// The audio comes from iHeartRadio's official embeddable player (the one TSN uses on its own
// "Listen live" page). It's a third-party frame, so it can't be started from our own button:
// browsers only let it play after a tap inside it. So the strip shows the player through a
// small round window cut over iHeart's own play/stop button, and the rest of the player stays
// out of sight. Tapping it is tapping their button.
// Shown on the Game page while a game is on; once started it follows you to every page (it
// lives in the root layout, so the audio never cuts out) until you close it.
// Phones and tablets: joined to the top of the bottom menu with no gap. Desktop: a small card
// at the bottom right.
const EMBED = "https://www.iheart.com/live/tsn-1200-7503/?embed=true&theme=dark";
const APP = "https://www.iheart.com/live/tsn-1200-7503/";

// Where iHeart's play/stop button sits in a 318 × 200 player (its layout depends on the size,
// so the frame is always exactly this size). If iHeart moves it, these two numbers change.
const FRAME_W = 318;
const FRAME_H = 200;
const BTN_X = 35; // button centre, from the player's left edge
const BTN_Y = 169; // button centre, from the player's top edge
const WINDOW = 44; // the round window's size

export function LiveRadioBar() {
  const { offer, started } = useRadio();
  const frame = useRef<HTMLIFrameElement>(null);
  const [flash, setFlash] = useState(false);

  // A tap inside the player moves focus into its frame: that's how we know it was started
  // (the frame can't tell us), so the strip can stay on screen as you change pages.
  useEffect(() => {
    const onBlur = () =>
      setTimeout(() => {
        if (frame.current && document.activeElement === frame.current) setRadioStarted(true);
      }, 0);
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  // "Listen" buttons elsewhere (the intermission card) point at the strip.
  useEffect(
    () =>
      onOpenLiveRadio(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 1600);
      }),
    [],
  );

  // The bottom menu's height (it varies with the phone's home-indicator area), so the strip
  // can sit right on top of it.
  const [navH, setNavH] = useState(72);
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>("nav.fixed.bottom-0");
    if (!nav) return;
    const ro = new ResizeObserver(() => setNavH(nav.offsetHeight));
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  if (offer === null && !started) return null;

  return (
    <>
      {/* Room at the bottom of every page so the strip never covers the last of it (phones). */}
      <div aria-hidden="true" className="h-14 lg:hidden" />
      <div
        style={{ ["--nav-h" as string]: `${navH}px` }}
        className="fixed inset-x-0 bottom-[var(--nav-h)] z-10 mx-auto max-w-xl md:max-w-4xl lg:inset-x-auto lg:bottom-6 lg:right-[max(2.5rem,calc((100vw-1360px)/2+2.5rem))] lg:mx-0 lg:w-[320px] lg:max-w-none"
      >
        <div
          className={`flex items-center gap-3 border-t border-line-strong bg-[#151518] px-3.5 py-1.5 transition-shadow lg:rounded-2xl lg:border ${
            flash ? "shadow-[0_0_0_2px_var(--color-sens-bright)]" : ""
          }`}
        >
          {/* iHeart's own play/stop button, seen through a round window. */}
          <div
            className="relative shrink-0 overflow-hidden rounded-full"
            style={{ width: WINDOW, height: WINDOW }}
            title="Start or stop TSN 1200"
          >
            <iframe
              ref={frame}
              src={EMBED}
              title="TSN 1200 live radio: start or stop"
              allow="autoplay"
              scrolling="no"
              className="absolute block max-w-none border-0"
              style={{ width: FRAME_W, height: FRAME_H, left: WINDOW / 2 - BTN_X, top: WINDOW / 2 - BTN_Y }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-bold">
              {started && <span className="live-ring flex size-2 shrink-0 rounded-full bg-sens-bright" aria-hidden="true" />}
              TSN 1200 live
            </div>
            <div className="truncate text-xs text-muted">{offer ?? "Keeps playing as you browse"}</div>
          </div>
          <a
            href={APP}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open TSN 1200 in iHeartRadio"
            title="Open in iHeartRadio"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
            </svg>
          </a>
          {offer === null && (
            <button
              type="button"
              onClick={() => setRadioStarted(false)}
              aria-label="Stop and close the radio"
              title="Close"
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-2 hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
