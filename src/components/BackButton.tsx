"use client";

import { useRouter } from "next/navigation";

// Installed to the Home Screen, the app has no browser back button, so pages you reach
// from a list get one. Falls back to `fallback` when there's no page to go back to.
export function BackButton({ fallback, label = "Back" }: { fallback: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-ink-2"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
      {label}
    </button>
  );
}
