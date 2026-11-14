import type { NewsItem } from "@/lib/news";
import type { GameSummary } from "@/lib/schedule";
import { LeadNewsCard, MidNewsCard, NewsCard } from "./NewsCard";

type Chip = { label: string; href: string } | null;

// Stories in a bordered list, each tied to its game with a chip where there is one.
// `wide`: on desktop, two columns of cards instead of one long list (the News page).
// `feature`: the newest story with a photo leads, big; on tablets and desktops the next two
// with photos follow as medium cards (on phones they stay in the list).
export function SensNewsList({
  items,
  games,
  compact = false,
  wide = false,
  feature = false,
}: {
  items: NewsItem[];
  games: GameSummary[];
  compact?: boolean;
  wide?: boolean;
  feature?: boolean;
}) {
  const byId = new Map(games.map((g) => [g.id, g]));
  const chipFor = (n: NewsItem): Chip => {
    const g = n.gameId ? byId.get(n.gameId) : undefined;
    return g
      ? {
          label: `${g.home ? "vs" : "at"} ${g.opp}`,
          // Sens TV videos live in the game's Video tab; stories in its News tab.
          href: `${g.state === "live" ? "/live" : `/game/${g.id}`}?tab=media&show=${n.outlet === "Sens TV" ? "video" : "news"}`,
        }
      : null;
  };

  const lead = feature ? items.find((n) => n.image) : undefined;
  const mids = lead ? items.filter((n) => n !== lead && n.image).slice(0, 2) : [];
  const rest = items.filter((n) => n !== lead);

  const listCls = wide
    ? "overflow-hidden rounded-2xl border border-line bg-surface lg:grid lg:grid-cols-2 lg:gap-3 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:[&>*]:rounded-2xl lg:[&>*]:border lg:[&>*]:border-line lg:[&>*]:bg-surface"
    : "overflow-hidden rounded-2xl border border-line bg-surface";

  return (
    <div className="flex flex-col gap-3">
      {lead && (
        <div className={`overflow-hidden rounded-2xl border border-line bg-surface ${wide ? "lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]" : ""}`}>
          <LeadNewsCard n={lead} game={chipFor(lead)} />
          {mids.length > 0 && (
            <div
              className={`hidden gap-3 border-t border-line p-2.5 md:grid md:grid-cols-2 ${
                wide ? "lg:grid-cols-1 lg:content-start lg:border-t-0 lg:border-l lg:p-3" : ""
              }`}
            >
              {mids.map((n) => (
                <MidNewsCard key={n.url} n={n} game={chipFor(n)} />
              ))}
            </div>
          )}
        </div>
      )}
      {rest.length > 0 && (
        <div className={listCls}>
          {rest.map((n) => (
            // Phones list the medium-card stories too; tablets and desktops already show them.
            <NewsCard key={n.url} n={n} game={chipFor(n)} compact={compact} className={mids.includes(n) ? "md:hidden" : ""} />
          ))}
        </div>
      )}
    </div>
  );
}
