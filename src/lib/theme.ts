"use client";

// Appearance: System (follow the device), Dark or Light. Kept on this device. The theme
// itself is a data-theme attribute on <html>; THEME_SCRIPT (in the root layout's <head>) sets
// it before first paint so there's no flash, and follows the device when it changes.
import { useSyncExternalStore } from "react";

export type ThemeChoice = "system" | "dark" | "light";
import { THEME_KEY as KEY } from "./theme-script";


const subs = new Set<() => void>();

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "light" ? v : "system";
  } catch {
    return "system";
  }
}

export function setTheme(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {}
  (window as unknown as { __sickoTheme?: () => void }).__sickoTheme?.();
  subs.forEach((f) => f());
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    read,
    () => "system",
  );
}
