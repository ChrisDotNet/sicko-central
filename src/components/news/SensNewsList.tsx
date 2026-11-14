import type { NewsItem } from "@/lib/news";
import type { GameSummary } from "@/lib/schedule";
import { NewsCard } from "./NewsCard";

// Stories in a bordered list, each tied to its game with a chip where there is one.
export function SensNewsList({ items, games, compact = false }: { items: NewsItem[]; games: GameSummary[]; compact?: boolean }) {
  const byId = new Map(games.map((g) => [g.id, g]));
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
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
