import { useMemo, useState } from "react";
import type { AppData } from "../types";
import { MEALS, addDays, formatDateLabel, goalFor, todayKey } from "../storage";
import { CalorieBar } from "./CalorieBar";
import { FoodSheet, type SheetRequest } from "./FoodSheet";

type Props = {
  data: AppData;
  date: string;
  onDateChange: (date: string) => void;
  onChange: (data: AppData) => void;
};

export function Today({ data, date, onDateChange, onChange }: Props) {
  const [sheet, setSheet] = useState<SheetRequest | null>(null);
  const today = todayKey();
  const isToday = date === today;
  const goal = goalFor(data, date);

  const entries = useMemo(() => data.foods.filter((f) => f.date === date), [data.foods, date]);
  const eaten = entries.reduce((sum, f) => sum + f.calories, 0);

  const groups = useMemo(
    () =>
      MEALS.map((m) => {
        const items = entries.filter((f) => (f.meal ?? "snack") === m.id);
        return { ...m, items, total: items.reduce((s, f) => s + f.calories, 0) };
      }).filter((g) => g.items.length > 0),
    [entries],
  );

  return (
    <>
      <header className="top">
        <h1 className="brand">Wait Weight</h1>
        <div className="day-nav">
          <button aria-label="Previous day" onClick={() => onDateChange(addDays(date, -1))}>
            ‹
          </button>
          <button className="day-label" onClick={() => onDateChange(today)} disabled={isToday}>
            {isToday ? "Today" : formatDateLabel(date)}
          </button>
          <button
            aria-label="Next day"
            disabled={isToday}
            onClick={() => onDateChange(addDays(date, 1))}
          >
            ›
          </button>
        </div>
      </header>

      <CalorieBar eaten={eaten} goal={goal} label={isToday ? "Today" : formatDateLabel(date)} />

      <section className="card">
        <div className="row">
          <button className="btn big" onClick={() => setSheet({ kind: "scan" })}>
            <span aria-hidden>▥</span> Scan food
          </button>
          <button className="btn secondary big" onClick={() => setSheet({ kind: "manual" })}>
            <span aria-hidden>＋</span> Add manually
          </button>
        </div>
      </section>

      <section className="card">
        <h2>{isToday ? "Logged today" : "Logged"}</h2>
        {groups.length === 0 ? (
          <p className="empty">Nothing yet. Scan a barcode or add calories by hand.</p>
        ) : (
          groups.map((g) => (
            <div key={g.id} className="meal-group">
              <div className="meal-head">
                <span>{g.label}</span>
                <span className="kcal">{g.total}</span>
              </div>
              <ul className="food-list">
                {g.items.map((f) => (
                  <li key={f.id}>
                    <button className="food-row" onClick={() => setSheet({ kind: "edit", entry: f })}>
                      <div>
                        <div className="food-name">{f.name}</div>
                        <div className="muted small">
                          {f.grams
                            ? `${f.grams} g`
                            : f.servings && f.servings !== 1
                              ? `${f.servings} servings`
                              : "1 serving"}
                          {" · "}
                          {f.source === "scan" ? "Scanned" : "Manual"}
                        </div>
                      </div>
                      <span className="kcal">{f.calories}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {sheet && (
        <FoodSheet
          key={sheet.kind === "edit" ? sheet.entry.id : sheet.kind}
          data={data}
          date={date}
          request={sheet}
          onChange={onChange}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}
