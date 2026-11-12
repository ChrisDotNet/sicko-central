import type { LiveGame } from "@/lib/game";
import { contextFor } from "@/lib/context";
import { Section } from "../ui";
import { GameFlow } from "./GameFlow";
import { GoalReplays } from "./GoalReplays";
import { RightNow } from "./RightNow";
import { ShotMap } from "./ShotMap";
import { SkatersTable } from "./SkatersTable";

export function GameSections({ game }: { game: LiveGame }) {
  const started = !game.isPre;
  return (
    <>
      <section className="px-4 pt-4">
        <RightNow ctx={contextFor(game)} />
      </section>
      {started && (
        <>
          <Section title="Where the shots came from" aside="Ottawa attacks right">
            <ShotMap shots={game.shots} oppAbbrev={game.opp.abbrev} periods={Math.max(3, game.period)} />
          </Section>
          <Section title="Who's had the puck" aside="Shot attempts">
            <GameFlow game={game} />
          </Section>
          <Section title={game.isFinal ? "Goals" : "Tonight's goals"} aside={game.goals.length ? `${game.goals.filter((g) => g.clipId).length} of ${game.goals.length} replays posted` : undefined}>
            <GoalReplays goals={game.goals} />
          </Section>
          <Section title={game.isFinal ? "Sens skaters" : "Sens tonight"}>
            <SkatersTable
              skaters={game.skaters}
              note={game.replay ? "Replay mode: ice time isn't shown." : undefined}
            />
          </Section>
        </>
      )}
    </>
  );
}
