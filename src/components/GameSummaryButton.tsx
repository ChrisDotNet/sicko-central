import Link from "next/link";

// The one way into a game from lists (schedule, home page): opens its Summary tab.
export function GameSummaryButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-lg border border-line-strong bg-surface-2 px-2.5 text-xs font-bold text-ink"
    >
      Game Summary
    </Link>
  );
}
