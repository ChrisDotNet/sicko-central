"use client";

import { useEffect, useSyncExternalStore } from "react";

// Keeps the phone's screen from dimming and locking while a game is live, so the companion
// stays readable between glances at the TV. Uses the browser's Screen Wake Lock (Chrome,
// Edge, Safari 16.4+). The browser drops the lock whenever the tab is hidden, so it's
// requested again when the page comes back. On by default; the choice is saved on this device.
// Browsers without wake lock don't get the switch at all.

const KEY = "sicko:screen-awake";
const EVENT = "sicko:screen-awake";

type WakeLockSentinel = { release: () => Promise<void>; released: boolean };
type WakeLockApi = { request: (type: "screen") => Promise<WakeLockSentinel> };

function wakeLockApi(): WakeLockApi | null {
  return typeof navigator !== "undefined" && "wakeLock" in navigator ? (navigator as unknown as { wakeLock: WakeLockApi }).wakeLock : null;
}

function prefOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

function setPref(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* won't persist in private mode */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

const noop = () => () => {};

export function ScreenAwake({ active }: { active: boolean }) {
  const supported = useSyncExternalStore(noop, () => wakeLockApi() != null, () => false);
  const on = useSyncExternalStore(subscribe, prefOn, () => true);

  useEffect(() => {
    const api = wakeLockApi();
    if (!api || !active || !on) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const request = async () => {
      if (document.visibilityState !== "visible" || (lock && !lock.released)) return;
      try {
        const l = await api.request("screen");
        if (stopped) void l.release();
        else lock = l;
      } catch {
        /* refused (battery saver, etc.): the screen just behaves normally */
      }
    };
    void request();
    document.addEventListener("visibilitychange", request);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", request);
      void lock?.release().catch(() => {});
    };
  }, [active, on]);

  if (!supported || !active) return null;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setPref(!on)}
      title={on ? "Your screen stays on while the game is live. Tap to let it sleep." : "Your screen will dim and lock as usual. Tap to keep it on."}
      className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold ${
        on ? "border-gold bg-gold text-ground" : "border-line-strong text-ink-2"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      {on ? "Screen on" : "Screen can sleep"}
    </button>
  );
}
