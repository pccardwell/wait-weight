import { daysBetween, formatShortDate } from "../storage";

type Point = { date: string; y: number };

type Props = {
  points: Point[];
  color?: string;
  unit?: string;
  goal?: number;
  trend?: boolean;
};

function smoothTrend(values: number[], alpha = 0.25): number[] {
  const out: number[] = [];
  values.forEach((v, i) => out.push(i === 0 ? v : out[i - 1] + alpha * (v - out[i - 1])));
  return out;
}

export function LineChart({ points, color = "#c4d6a0", unit = "", goal, trend }: Props) {
  const w = 360;
  const h = 180;
  const padL = 36;
  const padR = 12;
  const padY = 16;

  if (points.length === 0) {
    return <p className="empty">Not enough data yet.</p>;
  }

  const ys = points.map((p) => p.y);
  const range = goal != null ? [...ys, goal] : ys;
  let min = Math.min(...range);
  let max = Math.max(...range);
  if (max - min < 4) {
    const mid = (max + min) / 2;
    min = mid - 2;
    max = mid + 2;
  }
  const span = max - min;
  const totalDays = Math.max(daysBetween(points[0].date, points[points.length - 1].date), 1);

  const sx = (date: string) =>
    points.length === 1
      ? padL + (w - padL - padR) / 2
      : padL + (daysBetween(points[0].date, date) / totalDays) * (w - padL - padR);
  const sy = (v: number) => padY + (1 - (v - min) / span) * (h - padY * 2);

  const path = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(points[i].date).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");

  const trendVals = trend && points.length > 2 ? smoothTrend(ys) : null;
  const ticks = [max, (max + min) / 2, min];

  return (
    <>
      <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={sy(t)} y2={sy(t)} stroke="#fff1" />
            <text x={padL - 6} y={sy(t) + 4} textAnchor="end" className="axis">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {goal != null && (
          <>
            <line
              x1={padL}
              x2={w - padR}
              y1={sy(goal)}
              y2={sy(goal)}
              stroke="#e8c37a"
              strokeDasharray="5 5"
            />
            <text x={w - padR} y={sy(goal) - 5} textAnchor="end" className="axis goal-label">
              Goal {goal}
            </text>
          </>
        )}
        <path
          d={path(ys)}
          fill="none"
          stroke={color}
          strokeOpacity={trendVals ? 0.45 : 1}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {trendVals && (
          <path d={path(trendVals)} fill="none" stroke={color} strokeWidth="3.5" strokeLinejoin="round" />
        )}
        {points.map((p) => (
          <circle key={p.date} cx={sx(p.date)} cy={sy(p.y)} r={trendVals ? 2.5 : 4} fill={color} />
        ))}
      </svg>
      <div className="legend">
        <span>
          {formatShortDate(points[0].date)} · {points[0].y}
          {unit}
        </span>
        {trendVals && <span>Bold line = trend</span>}
        <span>
          {formatShortDate(points[points.length - 1].date)} · {points[points.length - 1].y}
          {unit}
        </span>
      </div>
    </>
  );
}
