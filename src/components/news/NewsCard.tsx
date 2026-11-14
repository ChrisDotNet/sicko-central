import Link from "next/link";
import type { NewsItem, Outlet } from "@/lib/news";
import { formatDay, formatTime } from "@/lib/format";
import { Thumb } from "../media/Thumb";

const OUTLET_STYLE: Record<Outlet, string> = {
  "NHL.com": "bg-ink text-ground",
  TSN: "bg-sens text-white",
  Sportsnet: "bg-[#1f4e99] text-white",
  "Sens TV": "bg-gold text-ground",
};

export function OutletBadge({ outlet }: { outlet: Outlet }) {
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold tracking-wide ${OUTLET_STYLE[outlet]}`}>{outlet}</span>;
}

// Summaries are cut by length rather than CSS line-clamp: a clamped box won't wrap around
// the floated thumbnail, plain text does.
function clip(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).replace(/[\s,;:.–-]+$/, "")}…`;
}

// One story: the outlet's headline, summary and thumbnail, opening on the outlet's site.
// The thumbnail floats top right and the text wraps around and under it.
// `game` adds a chip linking to that game's coverage here ("vs COL"). The whole card is the
// article link (a stretched link), with the chip on top of it.
export function NewsCard({
  n,
  game,
  compact = false,
}: {
  n: NewsItem;
  game?: { label: string; href: string } | null;
  compact?: boolean;
}) {
  return (
    <div className="relative flow-root border-b border-line px-3.5 py-3 last:border-0 hover:bg-surface-2">
      {n.image && <Thumb src={n.image} play={n.outlet === "Sens TV"} className="float-right mb-1.5 ml-3 mt-0.5 aspect-video w-28 md:ml-4 md:w-40" />}
      <span className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <OutletBadge outlet={n.outlet} />
        <span>
          {n.kind} · {formatDay(n.published).long}, {formatTime(n.published)}
        </span>
        {game && (
          <Link
            href={game.href}
            className="relative z-10 rounded-full border border-gold-line bg-gold-ground px-2 py-0.5 text-[11px] font-bold text-gold-text hover:border-gold"
          >
            {game.label}
          </Link>
        )}
      </span>
      <a
        href={n.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-[15px] font-semibold leading-snug text-ink after:absolute after:inset-0 after:content-['']"
      >
        {n.title}
      </a>
      {n.summary && <p className="mt-1.5 text-sm leading-snug text-ink-2">{clip(n.summary, compact ? 110 : 170)}</p>}
      {!compact && <span className="mt-1.5 block text-xs font-semibold text-sens-text">{n.outlet === "Sens TV" ? "Watch on YouTube" : `Read on ${n.outlet}`} ↗</span>}
    </div>
  );
}
