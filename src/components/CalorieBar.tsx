type MeterProps = {
  eaten: number;
  goal: number;
  compact?: boolean;
};

export function CalorieMeter({ eaten, goal, compact }: MeterProps) {
  const over = goal > 0 && eaten > goal;
  const scale = Math.max(goal, eaten, 1);
  const basePct = ((over ? goal : eaten) / scale) * 100;
  const overPct = over ? ((eaten - goal) / scale) * 100 : 0;

  return (
    <div
      className={`bar-track${compact ? " compact" : ""}${over ? " is-over" : ""}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={goal}
      aria-valuenow={eaten}
      aria-label="Calories against goal"
    >
      <div className="bar-fill" style={{ width: `${basePct}%` }} />
      {over && <div className="bar-overflow" style={{ left: `${basePct}%`, width: `${overPct}%` }} />}
      {over && <div className="bar-goal" style={{ left: `${basePct}%` }} />}
    </div>
  );
}

type Props = {
  eaten: number;
  goal: number;
  label: string;
};

export function CalorieBar({ eaten, goal, label }: Props) {
  const remaining = goal - eaten;
  const over = eaten > goal;
  const pct = goal > 0 ? Math.round((eaten / goal) * 100) : 0;

  return (
    <section className="card">
      <div className="cal-head">
        <div>
          <div className={`cal-goal${over ? " over-text" : ""}`}>{over ? "Over goal" : label}</div>
          <div className="cal-num display">
            {Math.round(eaten)}
            <span className="cal-unit"> kcal</span>
          </div>
        </div>
        <div className="cal-side">
          <div className={`cal-remaining${over ? " over-text" : ""}`}>
            {over ? `+${Math.round(-remaining)}` : Math.round(remaining)}
          </div>
          <div className="muted small">{over ? `over ${goal} goal` : `left of ${goal}`}</div>
        </div>
      </div>
      <CalorieMeter eaten={eaten} goal={goal} />
      <div className="legend">
        <span>0</span>
        <span>{pct}% of goal</span>
      </div>
    </section>
  );
}
