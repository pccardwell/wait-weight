import { useMemo, useState } from "react";
import type { AppData } from "../types";
import { addWeight, formatDateLabel, removeWeight, todayKey } from "../storage";
import { LineChart } from "./LineChart";

type Props = {
  data: AppData;
  onChange: (data: AppData) => void;
};

export function Weight({ data, onChange }: Props) {
  const [pounds, setPounds] = useState("");
  const [date, setDate] = useState(todayKey());
  const [error, setError] = useState<string | null>(null);

  const chartPoints = useMemo(
    () => data.weights.map((w) => ({ date: w.date, y: w.pounds })),
    [data.weights],
  );

  const latest = data.weights[data.weights.length - 1];
  const goalWeight = data.settings.goalWeight;
  const toGo = latest && goalWeight != null ? latest.pounds - goalWeight : null;

  const save = () => {
    const n = Number(pounds.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a weight greater than 0.");
      return;
    }
    onChange(addWeight({ date, pounds: Math.round(n * 10) / 10 }));
    setPounds("");
    setError(null);
  };

  return (
    <>
      <header className="top">
        <h1 className="brand">Weight</h1>
        {latest && <span className="date-chip">Latest {latest.pounds} lb</span>}
      </header>

      <section className="card">
        <div className="row">
          <div className="field">
            <label htmlFor="weight">Weight (lb)</label>
            <input
              id="weight"
              inputMode="decimal"
              value={pounds}
              onChange={(e) => setPounds(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder={latest ? String(latest.pounds) : "182.4"}
            />
          </div>
          <div className="field">
            <label htmlFor="weight-date">Date</label>
            <input
              id="weight-date"
              type="date"
              value={date}
              max={todayKey()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn full" onClick={save}>
          Save weigh-in
        </button>
        {toGo != null && (
          <p className="hint">
            {Math.abs(toGo) < 0.1
              ? "You're at your goal weight."
              : `${Math.abs(toGo).toFixed(1)} lb ${toGo > 0 ? "to lose" : "to gain"} to reach ${goalWeight} lb.`}
          </p>
        )}
      </section>

      <section className="card">
        <h2>Trend</h2>
        <LineChart points={chartPoints} unit=" lb" goal={goalWeight} trend />
      </section>

      <section className="card">
        <h2>History</h2>
        {data.weights.length === 0 ? (
          <p className="empty">Log a weigh-in to start the chart.</p>
        ) : (
          <ul className="food-list">
            {[...data.weights].reverse().map((w, i, arr) => {
              const prev = arr[i + 1];
              const delta = prev ? w.pounds - prev.pounds : null;
              return (
                <li key={w.id}>
                  <div>
                    <div className="food-name">{formatDateLabel(w.date)}</div>
                    {delta != null && (
                      <div className={`small ${delta > 0 ? "over-text" : "muted"}`}>
                        {delta > 0 ? "+" : ""}
                        {delta.toFixed(1)} lb
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="kcal">{w.pounds} lb</span>
                    <button className="btn ghost danger" onClick={() => onChange(removeWeight(w.id))}>
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
