import type { NewsItem } from "@/lib/news";
import type { GameSummary } from "@/lib/schedule";
import { NewsCard } from "./NewsCard";

// Stories in a bordered list, each tied to its game with a chip where there is one.
// `wide`: on desktop, two columns of cards instead of one long list (the News page).
export function SensNewsList({ items, games, compact = false, wide = false }: { items: NewsItem[]; games: GameSummary[]; compact?: boolean; wide?: boolean }) {
  const byId = new Map(games.map((g) => [g.id, g]));
  return (
    <div
      className={
        wide
          ? "overflow-hidden rounded-2xl border border-line bg-surface lg:grid lg:grid-cols-2 lg:gap-3 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:[&>*]:rounded-2xl lg:[&>*]:border lg:[&>*]:border-line lg:[&>*]:bg-surface"
          : "overflow-hidden rounded-2xl border border-line bg-surface"
      }
    >
      {items.map((n) => {
        const g = n.gameId ? byId.get(n.gameId) : undefined;
        const game = g
          ? {
              label: `${g.home ? "vs" : "at"} ${g.opp}`,
              // Sens TV videos live in the game's Video tab; stories in its News tab.
              href: `${g.state === "live" ? "/live" : `/game/${g.id}`}?tab=media&show=${n.outlet === "Sens TV" ? "video" : "news"}`,
            }
          : null;
        return <NewsCard key={n.url} n={n} game={game} compact={compact} />;
      })}
    </div>
  );
}
