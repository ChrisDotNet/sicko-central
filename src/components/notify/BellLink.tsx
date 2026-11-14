import Link from "next/link";

// Header bell: opens notification settings (push alerts and alert sounds).
export function BellLink() {
  return (
    <Link href="/notifications" aria-label="Notifications" className="flex size-11 items-center justify-center rounded-full text-ink-2 hover:text-ink">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" />
        <path d="M10.3 20a2 2 0 0 0 3.4 0" />
      </svg>
    </Link>
  );
}
