import { useMemo, useState } from "react";
import type { AppData } from "../types";
import { addDays, dayTotal, daysBetween, formatDateLabel, goalFor, lastNDates, todayKey } from "../storage";
import { CalorieHistory, type Day } from "./CalorieHistory";
import { CalorieMeter } from "./CalorieBar";
import { LineChart } from "./LineChart";

type Props = {
  data: AppData;
  onOpenDay: (date: string) => void;
};

const RANGES = [7, 14, 30, 90] as const;

function slopePerDay(points: { date: string; y: number }[]): number | null {
  if (points.length < 2) return null;
  const xs = points.map((p) => daysBetween(points[0].date, p.date));
  if (xs[xs.length - 1] < 3) return null;
  const n = points.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  let num = 0;
  let den = 0;
  points.forEach((p, i) => {
    num += (xs[i] - mx) * (p.y - my);
    den += (xs[i] - mx) ** 2;
  });
  return den === 0 ? null : num / den;
}

export function Progress({ data, onOpenDay }: Props) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(14);
  const today = todayKey();

  const days: Day[] = useMemo(
    () =>
      lastNDates(range).map((date) => ({
        date,
        calories: dayTotal(data, date),
        goal: goalFor(data, date),
      })),
    [data, range],
  );

  const logged = days.filter((d) => d.calories > 0);
  const avg = logged.length ? logged.reduce((s, d) => s + d.calories, 0) / logged.length : 0;
  const onTarget = logged.filter((d) => d.calories <= d.goal).length;
  const netVsGoal = logged.reduce((s, d) => s + (d.calories - d.goal), 0);

  const streak = useMemo(() => {
    let n = 0;
    let date = dayTotal(data, today) > 0 ? today : addDays(today, -1);
    for (;;) {
      const kcal = dayTotal(data, date);
      if (kcal <= 0 || kcal > goalFor(data, date)) break;
      n++;
      date = addDays(date, -1);
    }
    return n;
  }, [data, today]);

  const start = addDays(today, -(range - 1));
  const weightPoints = useMemo(() => {
    const inRange = data.weights.filter((w) => w.date >= start);
    const source = inRange.length >= 2 ? inRange : data.weights;
    return source.map((w) => ({ date: w.date, y: w.pounds }));
  }, [data.weights, start]);

  const slope = slopePerDay(weightPoints);
  const weekly = slope != null ? slope * 7 : null;
  const latest = data.weights[data.weights.length - 1];
  const goalWeight = data.settings.goalWeight;
  const change = weightPoints.length >= 2 ? weightPoints[weightPoints.length - 1].y - weightPoints[0].y : null;

  let eta: string | null = null;
  if (latest && goalWeight != null && slope && Math.sign(goalWeight - latest.pounds) === Math.sign(slope)) {
    const daysOut = Math.round((goalWeight - latest.pounds) / slope);
    if (daysOut > 0 && daysOut < 3650) eta = formatDateLabel(addDays(today, daysOut));
  }

  const recentDays = [...days].reverse();

  return (
    <>
      <header className="top">
        <h1 className="brand">Progress</h1>
      </header>

      <div className="segmented" role="radiogroup" aria-label="Range">
        {RANGES.map((r) => (
          <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>
            {r} days
          </button>
        ))}
      </div>

      <section className="stats">
        <div className="stat">
          <div className="stat-num display">{Math.round(avg) || "—"}</div>
          <div className="stat-label">avg kcal / logged day</div>
        </div>
        <div className="stat">
          <div className="stat-num display">
            {onTarget}
            <span className="muted small">/{logged.length}</span>
          </div>
          <div className="stat-label">days on target</div>
        </div>
        <div className="stat">
          <div className="stat-num display">{streak}</div>
          <div className="stat-label">day streak under goal</div>
        </div>
        <div className="stat">
          <div className={`stat-num display${netVsGoal > 0 ? " over-text" : ""}`}>
            {logged.length ? `${netVsGoal > 0 ? "+" : ""}${Math.round(netVsGoal).toLocaleString()}` : "—"}
          </div>
          <div className="stat-label">kcal vs goal, total</div>
        </div>
      </section>

      <section className="card">
        <h2>Calories vs goal</h2>
        <CalorieHistory days={days} onSelect={onOpenDay} />
        <div className="legend">
          <span>
            <i className="swatch sage" /> under goal <i className="swatch over" /> over
          </span>
          <span>Tap a bar to open that day</span>
        </div>
      </section>

      <section className="card">
        <h2>Weight</h2>
        {(change != null || weekly != null || eta) && (
          <div className="weight-stats">
            {change != null && (
              <span>
                <b>{change > 0 ? "+" : ""}{change.toFixed(1)} lb</b> change
              </span>
            )}
            {weekly != null && (
              <span>
                <b>{weekly > 0 ? "+" : ""}{weekly.toFixed(1)} lb</b>/week
              </span>
            )}
            {eta && (
              <span>
                Goal by <b>{eta}</b>
              </span>
            )}
          </div>
        )}
        <LineChart points={weightPoints} unit=" lb" goal={goalWeight} trend />
      </section>

      <section className="card">
        <h2>Daily log</h2>
        <ul className="day-list">
          {recentDays.map((d) => (
            <li key={d.date}>
              <button onClick={() => onOpenDay(d.date)}>
                <div className="day-row-head">
                  <span>{d.date === today ? "Today" : formatDateLabel(d.date)}</span>
                  <span className={`kcal${d.calories > d.goal ? " over-text" : ""}`}>
                    {d.calories > 0 ? `${d.calories} / ${d.goal}` : <span className="muted">—</span>}
                  </span>
                </div>
                <CalorieMeter eaten={d.calories} goal={d.goal} compact />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
