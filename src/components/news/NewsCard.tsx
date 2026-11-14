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

// One story: the outlet's headline, summary and thumbnail, opening on the outlet's site.
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
    <div className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-line px-3.5 py-3 last:border-0 hover:bg-surface-2 md:gap-4">
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
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
          className="text-[15px] font-semibold leading-snug text-ink after:absolute after:inset-0 after:content-['']"
        >
          {n.title}
        </a>
        {n.summary && <span className={`${compact ? "line-clamp-2" : "line-clamp-3"} text-sm leading-snug text-ink-2`}>{n.summary}</span>}
        {!compact && <span className="text-xs font-semibold text-sens-text">{n.outlet === "Sens TV" ? "Watch on YouTube" : `Read on ${n.outlet}`} ↗</span>}
      </span>
      {n.image && <Thumb src={n.image} play={n.outlet === "Sens TV"} className="mt-0.5 aspect-video w-28 md:w-40" />}
    </div>
  );
}
