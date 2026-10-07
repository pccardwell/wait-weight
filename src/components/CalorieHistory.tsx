import { parseKey, todayKey } from "../storage";

export type Day = { date: string; calories: number; goal: number };

type Props = {
  days: Day[];
  onSelect?: (date: string) => void;
};

export function CalorieHistory({ days, onSelect }: Props) {
  const w = 360;
  const h = 190;
  const pad = 12;
  const labelH = 18;
  const plotH = h - pad - labelH;
  const maxVal = Math.max(...days.map((d) => Math.max(d.goal, d.calories)), 1) * 1.05;
  const slot = (w - pad * 2) / Math.max(days.length, 1);
  const gap = days.length > 20 ? 2 : 5;
  const barW = Math.max(slot - gap, 3);
  const labelEvery = days.length <= 7 ? 1 : days.length <= 14 ? 2 : 5;
  const today = todayKey();
  const sy = (v: number) => pad + plotH - (v / maxVal) * plotH;

  const goalPath = days
    .map((d, i) => `${i === 0 ? "M" : "L"} ${pad + i * slot} ${sy(d.goal)} L ${pad + (i + 1) * slot} ${sy(d.goal)}`)
    .join(" ");

  return (
    <svg className="chart tall" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Daily calories">
      {days.map((d, i) => {
        const x = pad + i * slot + gap / 2;
        const under = Math.min(d.calories, d.goal);
        const over = Math.max(d.calories - d.goal, 0);
        const daysFromEnd = days.length - 1 - i;
        const label = days.length <= 7
          ? parseKey(d.date).toLocaleDateString(undefined, { weekday: "narrow" })
          : String(parseKey(d.date).getDate());
        const clipId = `bar-${d.date}`;
        return (
          <g key={d.date} onClick={() => onSelect?.(d.date)} className={onSelect ? "tappable" : undefined}>
            <rect x={pad + i * slot} y={pad} width={slot} height={plotH} fill="transparent" />
            {d.calories > 0 && (
              <>
                <clipPath id={clipId}>
                  <rect x={x} y={sy(d.calories)} width={barW} height={sy(0) - sy(d.calories)} rx={Math.min(4, barW / 2)} />
                </clipPath>
                <g clipPath={`url(#${clipId})`}>
                  <rect x={x} y={sy(under)} width={barW} height={sy(0) - sy(under)} fill="#c4d6a0" />
                  {over > 0 && (
                    <rect x={x} y={sy(d.calories)} width={barW} height={sy(d.goal) - sy(d.calories)} fill="#e8a07a" />
                  )}
                </g>
              </>
            )}
            {daysFromEnd % labelEvery === 0 && (
              <text
                x={x + barW / 2}
                y={h - 4}
                textAnchor="middle"
                className={`axis${d.date === today ? " today" : ""}`}
              >
                {label}
              </text>
            )}
          </g>
        );
      })}
      <path d={goalPath} fill="none" stroke="#fff8" strokeDasharray="4 4" pointerEvents="none" />
    </svg>
  );
}
