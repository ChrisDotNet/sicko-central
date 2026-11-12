// Picks what the "Right now" card says, based on the game situation.
// The aim is context the TV broadcast doesn't give, not a repeat of the score bug.
import type { LiveGame } from "./game";
import { formatTime, periodLabel, toiFromSeconds } from "./format";

export type Context = {
  tone: "gold" | "neutral" | "red";
  kicker: string;
  title: string;
  sub?: string;
  stats: Array<{ value: string; label: string }>;
  foot?: string;
};

const RECENT_GOAL_SECS = 180;

function ppLine(goals: number, opps: number) {
  return `${goals} for ${opps}`;
}

function shotType(s?: string) {
  return s ? s.replace(/-/g, " ") : "shot";
}

export function contextFor(game: LiveGame): Context {
  const opp = game.opp.abbrev;
  const ottHd = game.shots.filter((s) => s.team === "OTT" && s.hd).length;
  const oppHd = game.shots.filter((s) => s.team === "OPP" && s.hd).length;
  const fo = game.faceoffs.total ? `${Math.round((game.faceoffs.ottWon / game.faceoffs.total) * 100)}%` : "–";

  if (game.isPre) {
    return {
      tone: "neutral",
      kicker: "Pre-game",
      title: `Puck drop ${formatTime(game.startTimeUTC)}`,
      sub: [game.opp.isHome ? `at ${game.opp.name}` : `vs ${game.opp.name}`, game.broadcasts.join(", ")].filter(Boolean).join(" · "),
      stats: [],
      foot: "This page fills in once the game starts. Keep it open beside the TV.",
    };
  }

  if (game.isFinal) {
    const won = game.ott.score > game.opp.score;
    return {
      tone: won ? "gold" : "neutral",
      kicker: game.periodType === "SO" ? "Final · shootout" : game.periodType === "OT" ? "Final · overtime" : "Final",
      title: `${won ? "Sens win" : "Sens lose"} ${game.ott.score}–${game.opp.score}`,
      sub: `Shots ${game.ott.sog}–${game.opp.sog}`,
      stats: [
        { value: `${ottHd}–${oppHd}`, label: "High-danger shots" },
        { value: ppLine(game.powerPlay.ottGoals, game.powerPlay.ottOpps), label: "Power play" },
        { value: fo, label: "Faceoffs won" },
      ],
      foot: "Every goal is in the replays below.",
    };
  }

  if (game.intermission) {
    const p = game.periods.find((x) => x.period === game.period);
    const lead =
      game.ott.score === game.opp.score
        ? `Tied ${game.ott.score}–${game.opp.score}`
        : game.ott.score > game.opp.score
          ? `Sens lead ${game.ott.score}–${game.opp.score}`
          : `Sens trail ${game.ott.score}–${game.opp.score}`;
    return {
      tone: "neutral",
      kicker: `End of ${periodLabel(game.period)}`,
      title: `${lead} after ${game.period === 1 ? "one" : game.period === 2 ? "two" : periodLabel(game.period)}`,
      sub: p ? `Shots in the period: OTT ${p.ottSog}, ${opp} ${p.oppSog}` : undefined,
      stats: [
        { value: p ? `${p.ottHd}–${p.oppHd}` : `${ottHd}–${oppHd}`, label: `High-danger, ${periodLabel(game.period)}` },
        { value: ppLine(game.powerPlay.ottGoals, game.powerPlay.ottOpps), label: "Power play so far" },
        { value: fo, label: "Faceoffs won" },
      ],
      foot: "Good time to catch up on the goal replays below.",
    };
  }

  const lastGoal = game.goals[game.goals.length - 1];
  if (lastGoal && game.elapsed - lastGoal.elapsed <= RECENT_GOAL_SECS) {
    const ours = lastGoal.team === "OTT";
    const skater = ours ? game.skaters.find((s) => s.id === lastGoal.scorerId) : undefined;
    const tagged = lastGoal.strength === "PP" ? "Power-play goal" : lastGoal.strength === "SH" ? "Shorthanded goal" : lastGoal.strength === "EN" ? "Empty-net goal" : "Goal";
    return {
      tone: ours ? "gold" : "neutral",
      kicker: `Just scored · ${periodLabel(lastGoal.period, lastGoal.periodType)} ${lastGoal.time}`,
      title: ours
        ? `${lastGoal.scorer}${lastGoal.scorerTotal ? `'s ${ordinal(lastGoal.scorerTotal)} of the season` : " scores"}`
        : `${opp} goal: ${lastGoal.scorer}`,
      sub: [
        `${tagged}, ${shotType(lastGoal.shotType)}${lastGoal.distance != null ? ` from ${lastGoal.distance} ft` : ""}`,
        lastGoal.assists.length ? lastGoal.assists.join(", ") : "Unassisted",
      ].join(" · "),
      stats: [
        ...(skater ? [{ value: String(skater.g + skater.a), label: "Points tonight" }] : []),
        { value: `${game.ott.score}–${game.opp.score}`, label: "Score now" },
        { value: `${ottHd}–${oppHd}`, label: "High-danger shots" },
      ].slice(0, 3),
      foot: "It's the gold dot on the shot map. The replay appears below once the NHL posts it.",
    };
  }

  if (game.strength) {
    const ours = game.strength.team === "OTT";
    const lastPen = [...game.penalties].reverse().find((p) => p.team === (ours ? "OPP" : "OTT"));
    const since = lastPen?.elapsed ?? game.elapsed;
    const shotsOnPP = countShotsSince(game, game.strength.team, since);
    const lastPPG = [...game.goals].reverse().find((g) => g.team === (ours ? "OTT" : "OPP") && g.strength === "PP");
    return {
      tone: ours ? "gold" : "red",
      kicker: ours ? "Right now · Ottawa power play" : "Right now · Sens shorthanded",
      title:
        game.strength.secondsLeft != null
          ? `${toiFromSeconds(game.strength.secondsLeft)} left ${ours ? "on the man advantage" : "to kill"}`
          : game.strength.label,
      sub: lastPen ? `${lastPen.team === "OTT" ? "OTT" : opp} · ${lastPen.player}, ${lastPen.desc}` : undefined,
      stats: ours
        ? [
            { value: ppLine(game.powerPlay.ottGoals, game.powerPlay.ottOpps), label: "Power play tonight" },
            { value: String(shotsOnPP), label: "Shot attempts this PP" },
            { value: `${ottHd}–${oppHd}`, label: "High-danger shots" },
          ]
        : [
            { value: `${game.powerPlay.oppOpps - game.powerPlay.oppGoals} of ${game.powerPlay.oppOpps}`, label: "Kills tonight" },
            { value: String(shotsOnPP), label: `${opp} attempts this PP` },
            { value: `${ottHd}–${oppHd}`, label: "High-danger shots" },
          ],
      foot: lastPPG ? `Last power-play goal: ${lastPPG.scorer}, ${periodLabel(lastPPG.period)} period.` : undefined,
    };
  }

  return {
    tone: "neutral",
    kicker: `Game so far · ${periodLabel(game.period, game.periodType)}`,
    title:
      ottHd === oppHd
        ? "Even on quality chances"
        : ottHd > oppHd
          ? "Sens winning the slot"
          : `${opp} getting the better chances`,
    sub: `Shot attempts: OTT ${game.flow.ott[game.flow.ott.length - 1][1]}, ${opp} ${game.flow.opp[game.flow.opp.length - 1][1]}`,
    stats: [
      { value: `${ottHd}–${oppHd}`, label: "High-danger shots" },
      { value: ppLine(game.powerPlay.ottGoals, game.powerPlay.ottOpps), label: "Power play" },
      { value: fo, label: "Faceoffs won" },
    ],
  };
}

function countShotsSince(game: LiveGame, team: "OTT" | "OPP", since: number) {
  // Shots carry no timestamp; count shot attempts from the flow series instead.
  const series = team === "OTT" ? game.flow.ott : game.flow.opp;
  let before = 0;
  let now = 0;
  for (const [t, n] of series) {
    if (t <= since) before = n;
    now = n;
  }
  return now - before;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
