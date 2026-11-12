import type { LiveGame } from "@/lib/game";

// Cumulative shot attempts (shots, misses and blocked shots) over game time.
export function GameFlow({ game }: { game: LiveGame }) {
  const W = 320;
  const H = 150;
  const left = 22;
  const right = 300;
  const top = 12;
  const bottom = 130;
  const length = game.flow.length;
  const maxCount = Math.max(10, ...game.flow.ott.map((p) => p[1]), ...game.flow.opp.map((p) => p[1]));
  const yMax = Math.ceil(maxCount / 10) * 10;
  const px = (t: number) => left + (t / length) * (right - left);
  const py = (n: number) => bottom - (n / yMax) * (bottom - top);
  const steps = (pts: Array<[number, number]>) => {
    let d = "";
    pts.forEach(([t, n], i) => {
      d += i === 0 ? `M${px(t)},${py(n)}` : `H${px(t)}V${py(n)}`;
    });
    return d;
  };
  const countAt = (pts: Array<[number, number]>, t: number) => {
    let n = 0;
    for (const p of pts) if (p[0] <= t) n = p[1];
    return n;
  };
  const ottEnd = game.flow.ott[game.flow.ott.length - 1][1];
  const oppEnd = game.flow.opp[game.flow.opp.length - 1][1];
  const periodMarks = [1200, 2400, ...(length > 3600 ? [3600] : [])];
  const labels = [
    { t: 600, l: "1st" },
    { t: 1800, l: "2nd" },
    { t: 3000, l: "3rd" },
    ...(length > 3600 ? [{ t: (3600 + length) / 2, l: "OT" }] : []),
  ];
  const endY = (n: number, other: number) => py(n) + (n >= other ? -4 : 11);

  return (
    <div className="rounded-2xl border border-line bg-surface px-3 pt-3.5 pb-2.5">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Shot attempts: Ottawa ${ottEnd}, ${game.opp.abbrev} ${oppEnd}`} className="block">
        <line x1={left} y1={bottom} x2={W} y2={bottom} stroke="#3F3F46" />
        <line x1={left} y1={py(yMax / 2)} x2={W} y2={py(yMax / 2)} stroke="#26262B" />
        {periodMarks.map((t) => (
          <line key={t} x1={px(t)} y1={top} x2={px(t)} y2={bottom} stroke="#2C2C31" strokeDasharray="3 3" />
        ))}
        <text x={left - 5} y={bottom + 3} fontSize="9" fill="#A1A1AA" textAnchor="end">0</text>
        <text x={left - 5} y={py(yMax / 2) + 3} fontSize="9" fill="#A1A1AA" textAnchor="end">{yMax / 2}</text>
        {labels.map((l) => (
          <text key={l.l} x={px(l.t)} y={H - 4} fontSize="9" fill="#A1A1AA" textAnchor="middle">{l.l}</text>
        ))}
        <path d={steps(game.flow.opp)} fill="none" stroke="#A1A1AA" strokeWidth="2" strokeDasharray="5 3" />
        <path d={steps(game.flow.ott)} fill="none" stroke="#E23A4C" strokeWidth="2.5" />
        {game.goals.map((g) => {
          const pts = g.team === "OTT" ? game.flow.ott : game.flow.opp;
          return (
            <circle key={g.id} cx={px(g.elapsed)} cy={py(countAt(pts, g.elapsed))} r="4" fill={g.team === "OTT" ? "#D9AE45" : "#E4E4E7"} stroke="#17171A" strokeWidth="1.5" />
          );
        })}
        <text x={Math.min(px(game.elapsed) + 4, W - 16)} y={endY(ottEnd, oppEnd)} fontSize="10" fontWeight="700" fill="#F05A69">{ottEnd}</text>
        <text x={Math.min(px(game.elapsed) + 4, W - 16)} y={endY(oppEnd, ottEnd + 0.5)} fontSize="10" fontWeight="700" fill="#D4D4D8">{oppEnd}</text>
      </svg>
      <div className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-[3px] w-4 bg-sens-bright" />OTT</span>
        <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-muted" />{game.opp.abbrev}</span>
        <span className="flex items-center gap-1.5"><span className="size-[9px] rounded-full bg-gold-bright" />Goal</span>
      </div>
    </div>
  );
}
