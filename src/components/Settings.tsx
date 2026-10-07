import { useRef, useState } from "react";
import type { AppData, Profile } from "../types";
import { exportData, importData, todayKey, updateSettings } from "../storage";

type Props = {
  data: AppData;
  onChange: (data: AppData) => void;
};

const ACTIVITY: { id: Profile["activity"]; label: string; factor: number }[] = [
  { id: "sedentary", label: "Desk job, little exercise", factor: 1.2 },
  { id: "light", label: "Light exercise 1–3 days/wk", factor: 1.375 },
  { id: "moderate", label: "Moderate exercise 3–5 days/wk", factor: 1.55 },
  { id: "active", label: "Hard exercise 6–7 days/wk", factor: 1.725 },
  { id: "very", label: "Physical job + training", factor: 1.9 },
];

const DEFAULT_PROFILE: Profile = {
  sex: "male",
  age: 35,
  heightIn: 70,
  activity: "light",
  weeklyLossLb: 1,
};

function suggestGoal(p: Profile, pounds: number) {
  const kg = pounds * 0.4536;
  const cm = p.heightIn * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * p.age + (p.sex === "male" ? 5 : -161);
  const factor = ACTIVITY.find((a) => a.id === p.activity)?.factor ?? 1.2;
  const maintenance = bmr * factor;
  const floor = p.sex === "male" ? 1500 : 1200;
  const raw = maintenance - (p.weeklyLossLb * 3500) / 7;
  const goal = Math.round(Math.max(raw, floor) / 10) * 10;
  return { maintenance: Math.round(maintenance), goal, clamped: raw < floor };
}

export function Settings({ data, onChange }: Props) {
  const [goal, setGoal] = useState(String(data.settings.calorieGoal));
  const [goalWeight, setGoalWeight] = useState(
    data.settings.goalWeight != null ? String(data.settings.goalWeight) : "",
  );
  const [profile, setProfile] = useState<Profile>(data.settings.profile ?? DEFAULT_PROFILE);
  const latest = data.weights[data.weights.length - 1];
  const [calcWeight, setCalcWeight] = useState(latest ? String(latest.pounds) : "");
  const [message, setMessage] = useState<string | null>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const patchProfile = (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch }));
  const feet = Math.floor(profile.heightIn / 12);
  const inches = profile.heightIn % 12;
  const w = Number(calcWeight);
  const suggestion = Number.isFinite(w) && w > 0 && profile.age > 0 && profile.heightIn > 0
    ? suggestGoal(profile, w)
    : null;

  const saveGoals = (calories = Number(goal)) => {
    if (!Number.isFinite(calories) || calories <= 0) {
      setMessage("Calorie goal must be greater than 0.");
      return;
    }
    const gw = goalWeight.trim() === "" ? undefined : Number(goalWeight);
    if (gw != null && (!Number.isFinite(gw) || gw <= 0)) {
      setMessage("Goal weight must be greater than 0.");
      return;
    }
    onChange(
      updateSettings({
        calorieGoal: Math.round(calories),
        goalWeight: gw != null ? Math.round(gw * 10) / 10 : undefined,
        profile,
      }),
    );
    setGoal(String(Math.round(calories)));
    setMessage("Saved. Days from today on use this goal; past days keep their old one.");
  };

  const download = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wait-weight-${todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupMsg("Backup downloaded.");
  };

  const restore = async (file: File) => {
    if (!confirm("Replace everything on this phone with this backup?")) return;
    try {
      const next = importData(await file.text());
      onChange(next);
      setGoal(String(next.settings.calorieGoal));
      setGoalWeight(next.settings.goalWeight != null ? String(next.settings.goalWeight) : "");
      setBackupMsg(`Restored ${next.foods.length} foods and ${next.weights.length} weigh-ins.`);
    } catch (e) {
      setBackupMsg(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

  return (
    <>
      <header className="top">
        <h1 className="brand">Settings</h1>
      </header>

      <section className="card">
        <h2>Goals</h2>
        <div className="row">
          <div className="field">
            <label htmlFor="goal">Daily calories</label>
            <input
              id="goal"
              inputMode="numeric"
              value={goal}
              onChange={(e) => {
                setGoal(e.target.value);
                setMessage(null);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="goal-weight">Goal weight (lb)</label>
            <input
              id="goal-weight"
              inputMode="decimal"
              value={goalWeight}
              placeholder="Optional"
              onChange={(e) => {
                setGoalWeight(e.target.value);
                setMessage(null);
              }}
            />
          </div>
        </div>
        <button className="btn full" onClick={() => saveGoals()}>
          Save goals
        </button>
        {message && <p className="hint">{message}</p>}
      </section>

      <section className="card">
        <h2>Calorie goal calculator</h2>
        <p className="hint top-hint">Estimates your daily burn and subtracts your target deficit.</p>
        <div className="segmented small" role="radiogroup" aria-label="Sex">
          {(["male", "female"] as const).map((s) => (
            <button key={s} className={profile.sex === s ? "on" : ""} onClick={() => patchProfile({ sex: s })}>
              {s === "male" ? "Male" : "Female"}
            </button>
          ))}
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="age">Age</label>
            <input
              id="age"
              inputMode="numeric"
              value={profile.age || ""}
              onChange={(e) => patchProfile({ age: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="field">
            <label htmlFor="calc-weight">Weight (lb)</label>
            <input
              id="calc-weight"
              inputMode="decimal"
              value={calcWeight}
              onChange={(e) => setCalcWeight(e.target.value)}
            />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="ft">Height (ft)</label>
            <input
              id="ft"
              inputMode="numeric"
              value={feet || ""}
              onChange={(e) => patchProfile({ heightIn: (Number(e.target.value) || 0) * 12 + inches })}
            />
          </div>
          <div className="field">
            <label htmlFor="in">Height (in)</label>
            <input
              id="in"
              inputMode="numeric"
              value={inches}
              onChange={(e) => patchProfile({ heightIn: feet * 12 + Math.min(Number(e.target.value) || 0, 11) })}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="activity">Activity</label>
          <select
            id="activity"
            value={profile.activity}
            onChange={(e) => patchProfile({ activity: e.target.value as Profile["activity"] })}
          >
            {ACTIVITY.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Target loss per week</label>
          <div className="segmented small">
            {[0, 0.5, 1, 1.5, 2].map((n) => (
              <button
                key={n}
                className={profile.weeklyLossLb === n ? "on" : ""}
                onClick={() => patchProfile({ weeklyLossLb: n })}
              >
                {n === 0 ? "Maintain" : `${n} lb`}
              </button>
            ))}
          </div>
        </div>
        {suggestion ? (
          <div className="suggestion">
            <div>
              <div className="muted small">Maintenance ≈ {suggestion.maintenance} kcal</div>
              <div className="display total-num">{suggestion.goal} kcal/day</div>
              {suggestion.clamped && (
                <div className="error small">Raised to a safe minimum. Consider a slower rate.</div>
              )}
            </div>
            <button className="btn" onClick={() => saveGoals(suggestion.goal)}>
              Use this
            </button>
          </div>
        ) : (
          <p className="hint">Fill in age, weight and height to get a suggestion.</p>
        )}
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="hint top-hint">
          Everything stays on this phone in local storage. There is no account and no server. Export
          now and then so a cleared browser doesn't erase your history.
        </p>
        <div className="row">
          <button className="btn secondary" onClick={download}>
            Export
          </button>
          <button className="btn secondary" onClick={() => fileRef.current?.click()}>
            Import
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) restore(f);
            e.target.value = "";
          }}
        />
        {backupMsg && <p className="hint">{backupMsg}</p>}
      </section>
    </>
  );
}
