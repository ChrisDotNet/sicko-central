import type { ReactNode } from "react";
import type { LiveGame } from "@/lib/game";
import { contextFor } from "@/lib/context";
import { Section } from "../ui";
import { GameFlow } from "./GameFlow";
import { GoalReplays } from "./GoalReplays";
import { RightNow } from "./RightNow";
import { ShotMap } from "./ShotMap";
import { SkatersTable } from "./SkatersTable";

// One set of sections, three arrangements:
// - Phone: one column in the order below (`order-*`).
// - Tablet: two columns, "Right now" and goals on the left, shot map, shot attempts and
//   skaters on the right, then the side content full width below.
// - Desktop: three columns. Left: "Right now" and goals. Middle: shot map, shot attempts,
//   skaters. Right: whatever the page passes as `aside` (scoreboard, latest media).
// On phones the column wrappers use `display: contents`, so their sections join one flow
// and `order` decides where each lands.
const column = "contents md:flex md:min-w-0 md:flex-col";

export function GameSections({ game, aside }: { game: LiveGame; aside?: ReactNode }) {
  const started = !game.isPre;
  return (
    <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-[340px_minmax(0,1fr)_320px] lg:items-start">
      <div className={column}>
        <section className="order-1 px-4 pt-4">
          <RightNow ctx={contextFor(game)} />
        </section>
        {started && (
          <Section
            className="order-4"
            title={game.isFinal ? "Goals" : "Tonight's goals"}
            aside={game.goals.length ? `${game.goals.filter((g) => g.clipId).length} of ${game.goals.length} replays posted` : undefined}
          >
            <GoalReplays goals={game.goals} />
          </Section>
        )}
      </div>

      <div className={column}>
        {started && (
          <>
            <Section className="order-2 md:pt-4" title="Shot Map" aside="Ottawa attacks right">
              <ShotMap shots={game.shots} oppAbbrev={game.opp.abbrev} periods={Math.max(3, game.period)} />
            </Section>
            <Section className="order-3" title="Shot Attempts" aside="Shots, misses and blocks">
              <GameFlow game={game} />
            </Section>
            <Section className="order-5" title={game.isFinal ? "Sens skaters" : "Sens tonight"}>
              <SkatersTable skaters={game.skaters} note={game.replay ? "Replay mode: ice time isn't shown." : undefined} />
            </Section>
          </>
        )}
      </div>

      {aside && (
        <div className={`${column} [&>*]:order-6 md:col-span-2 lg:col-span-1 lg:[&>*:first-child]:pt-4`}>{aside}</div>
      )}
    </div>
  );
}
