// Game-day facts, gathered on the server from NHL data only (no AI, nothing made up):
// - birthdays on game day (roster)
// - career milestones within reach: goals, assists, points, goalie wins and shutouts,
//   and round-number games played (each player's career totals)
// - individual point streaks (each player's last five games)
// - the team's current streak and the season series against tonight's opponent (schedule)
// The page picks the best three and adjusts them for what happens during the game
// (src/lib/facts-shared.ts). Built from data as of the last completed game, refreshed daily.
import { cacheLife } from "next/cache";
import type { Fact, MilestoneStat } from "./facts-shared";
import { getPlayer, getRoster, getSchedule, name } from "./nhl";
import { scoreLine, splitSchedule } from "./schedule";

const ROUND: Record<MilestoneStat, { step: number; min: number; within: number }> = {
  goals: { step: 50, min: 50, within: 3 },
  assists: { step: 100, min: 100, within: 3 },
  points: { step: 100, min: 100, within: 3 },
  wins: { step: 50, min: 50, within: 2 },
  shutouts: { step: 10, min: 10, within: 1 },
};

function nextRound(value: number, step: number) {
  return (Math.floor(value / step) + 1) * step;
}

function age(birth: string, on: string) {
  const [by, bm, bd] = birth.split("-").map(Number);
  const [y, m, d] = on.split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

export async function getGameFacts(gameDate: string, opp: string): Promise<Fact[]> {
  "use cache";
  cacheLife("daily");

  const [roster, schedule] = await Promise.all([getRoster(), getSchedule()]);
  const facts: Fact[] = [];
  const everyone = [...(roster?.forwards ?? []), ...(roster?.defensemen ?? []), ...(roster?.goalies ?? [])];

  // Birthdays.
  for (const p of everyone) {
    if (p.birthDate && p.birthDate.slice(5) === gameDate.slice(5)) {
      facts.push({ kind: "birthday", playerId: p.id, name: `${name(p.firstName)} ${name(p.lastName)}`, age: age(p.birthDate, gameDate), score: 90 });
    }
  }

  // Milestones and streaks, from each player's page (cached daily).
  const landings = await Promise.all(everyone.map((p) => getPlayer(String(p.id))));
  everyone.forEach((p, i) => {
    const l = landings[i];
    if (!l) return;
    const full = `${name(p.firstName)} ${name(p.lastName)}`;
    const career = l.careerTotals?.regularSeason ?? {};
    const goalie = p.positionCode === "G";
    const stats: MilestoneStat[] = goalie ? ["wins", "shutouts"] : ["goals", "assists", "points"];
    for (const stat of stats) {
      const v = Number(career[stat] ?? 0);
      const r = ROUND[stat];
      const target = nextRound(v, r.step);
      const need = target - v;
      if (target < r.min || need > r.within) continue;
      // Closer and bigger milestones rank higher.
      const score = 92 - need * 10 + (target >= 500 || (stat === "goals" && target >= 200) || (stat === "wins" && target >= 200) ? 6 : 0);
      facts.push({ kind: "milestone", playerId: p.id, name: full, stat, before: v, target, score });
    }
    const gp = Number(career.gamesPlayed ?? 0);
    if (gp > 0 && (gp + 1) % 100 === 0) facts.push({ kind: "games", playerId: p.id, name: full, target: gp + 1, score: 84 });

    if (!goalie) {
      // last5Games is newest first.
      let run = 0;
      for (const g of l.last5Games ?? []) {
        if ((g.points ?? 0) > 0) run++;
        else break;
      }
      if (run >= 3) facts.push({ kind: "streak", playerId: p.id, name: full, games: run, capped: run === 5, score: 48 + run * 5 });
    }
  });

  // Team streak and the season series.
  const { all } = splitSchedule(schedule?.games ?? []);
  const finals = all.filter((g) => g.state === "final" && g.gameDate < gameDate);
  let streak = 0;
  const kind = finals.length ? finals[finals.length - 1].result : undefined;
  for (let i = finals.length - 1; i >= 0 && finals[i].result === kind; i--) streak++;
  if (kind === "W" && streak >= 3) facts.push({ kind: "team", key: "streak", text: `The Sens have won ${streak} straight.`, score: 62 + streak });
  if (kind === "L" && streak >= 3) facts.push({ kind: "team", key: "streak", text: `The Sens have lost ${streak} straight in regulation.`, score: 50 });
  let pointRun = 0;
  for (let i = finals.length - 1; i >= 0 && (finals[i].result === "W" || finals[i].result === "OTL"); i--) pointRun++;
  if (pointRun >= 4 && !(kind === "W" && streak === pointRun)) {
    facts.push({ kind: "team", key: "points", text: `The Sens have earned points in ${pointRun} straight games.`, score: 55 });
  }

  const vs = finals.filter((g) => g.opp === opp);
  if (vs.length === 0) {
    facts.push({ kind: "team", key: "series", text: `First meeting with ${opp} this season.`, score: 30 });
  } else {
    const w = vs.filter((g) => g.result === "W").length;
    const l = vs.filter((g) => g.result === "L").length;
    const o = vs.filter((g) => g.result === "OTL").length;
    const lastMeet = vs[vs.length - 1];
    const res = lastMeet.result === "W" ? "won" : "lost";
    facts.push({
      kind: "team",
      key: "series",
      text: `The Sens are ${w}-${l}-${o} against ${opp} this season. Last meeting: ${res} ${scoreLine(lastMeet)}.`,
      score: 40,
    });
  }

  return facts;
}
