import Link from "next/link";
import type { ReactNode } from "react";
import { teamColor } from "@/lib/teams";

// Page widths. Phones get one column everywhere; wider screens get more room where a page
// has a layout that uses it.
const WIDTHS = {
  narrow: "max-w-xl md:max-w-2xl",
  medium: "max-w-xl md:max-w-4xl md:px-2",
  wide: "max-w-xl md:max-w-4xl md:px-2 lg:max-w-[1360px] lg:px-6",
} as const;

export function Page({ width = "narrow", children }: { width?: keyof typeof WIDTHS; children: ReactNode }) {
  return <div className={`mx-auto w-full ${WIDTHS[width]}`}>{children}</div>;
}

export function Section({
  title,
  aside,
  children,
  className = "",
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`px-4 pt-6 ${className}`}>
      {title && (
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-bold uppercase tracking-wider">{title}</h2>
          {aside && <div className="text-xs text-muted">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface ${className}`}>{children}</div>;
}

export function TeamBar({ abbrev, className = "h-7 w-2.5" }: { abbrev: string; className?: string }) {
  return <span aria-hidden="true" className={`inline-block rounded-sm ${className}`} style={{ background: teamColor(abbrev) }} />;
}

export function Kicker({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "muted" | "red" }) {
  const color = tone === "gold" ? "text-gold-text" : tone === "red" ? "text-sens-text" : "text-muted";
  return <div className={`text-xs font-bold uppercase tracking-widest ${color}`}>{children}</div>;
}

export function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-1 text-sm font-semibold text-ink">
      {children}
    </Link>
  );
}

export function ResultBadge({ result }: { result: "W" | "L" | "OTL" | "LIVE" }) {
  const styles = {
    W: "bg-[#1E3A2A] text-[#6EE7A1]",
    L: "bg-[#3A1E22] text-[#FCA5AE]",
    OTL: "bg-[#2E2A1A] text-[#E2C46E]",
    LIVE: "bg-sens text-white",
  } as const;
  return <span className={`rounded px-1.5 py-0.5 text-xs font-extrabold ${styles[result]}`}>{result}</span>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="mx-4 mt-6 rounded-2xl border border-line bg-surface p-4 text-sm text-ink-2">{children}</div>
  );
}
