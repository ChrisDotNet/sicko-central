"use client";

import { useSyncExternalStore } from "react";
import { alertSoundOn, setAlertSound, subscribeAlertSound } from "@/lib/sfx";

// Header button to turn alert sounds on or off on this device.
export function AlertSoundToggle() {
  const on = useSyncExternalStore(subscribeAlertSound, alertSoundOn, () => true);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Alert sounds on. Turn off" : "Alert sounds off. Turn on"}
      onClick={() => setAlertSound(!on)}
      className="flex size-11 items-center justify-center rounded-full text-ink-2"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" />
        <path d="M10.3 20a2 2 0 0 0 3.4 0" />
        {!on && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
}
