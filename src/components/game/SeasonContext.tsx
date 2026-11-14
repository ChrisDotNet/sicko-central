import type { LiveGame } from "@/lib/game";
import { contextLines } from "@/lib/team-stats-shared";
import type { SeasonLens } from "@/lib/team-stats-shared";

// During the game: one line of season context per situation, beside what's happening
// (leading after two, the power play, the goalie tonight against his season, shots at the
// intermission). Each line shows only when it applies; no lines, no card.
export function SeasonContext({ game, lens, className = "" }: { game: LiveGame; lens: SeasonLens; className?: string }) {
  const lines = contextLines(game, lens);
  if (lines.length === 0) return null;
  return (
    <section className={`px-4 pt-3 ${className}`} aria-label="Season context">
      <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
        {lines.map((l) => (
          <li key={l.tag} className="flex items-start gap-2.5 border-b border-line px-3.5 py-2.5 text-[13px] leading-snug text-ink-2 last:border-b-0">
            <span
              className={`mt-px shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                l.tone === "blue" ? "bg-[#12324A] text-[#7CC4F5]" : "bg-line text-ink-2"
              }`}
            >
              {l.tag}
            </span>
            <span>
              {l.text}
              {l.strong && <b className="text-ink">{l.strong}</b>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
