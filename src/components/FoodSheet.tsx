import { useCallback, useMemo, useState } from "react";
import type { AppData, FoodEntry, Meal } from "../types";
import {
  MEALS,
  addFood,
  defaultMeal,
  findByBarcode,
  perServing,
  recentFoods,
  removeFood,
  updateFood,
} from "../storage";
import { lookupBarcode } from "../openFoodFacts";
import { Scanner } from "./Scanner";

export type SheetRequest =
  | { kind: "scan" }
  | { kind: "manual" }
  | { kind: "edit"; entry: FoodEntry };

type Props = {
  data: AppData;
  date: string;
  request: SheetRequest;
  onChange: (data: AppData) => void;
  onClose: () => void;
};

type Mode = "servings" | "grams";

function toNum(s: string): number {
  return Number(s.replace(",", "."));
}

export function FoodSheet({ data, date, request, onChange, onClose }: Props) {
  const editing = request.kind === "edit" ? request.entry : null;
  const [step, setStep] = useState<"scan" | "form">(request.kind === "scan" ? "scan" : "form");
  const [name, setName] = useState(editing?.name ?? "");
  const [meal, setMeal] = useState<Meal>(editing?.meal ?? defaultMeal());
  const [mode, setMode] = useState<Mode>(editing?.grams ? "grams" : "servings");
  const [perUnit, setPerUnit] = useState(() => {
    if (!editing) return "";
    if (editing.grams) return String(Math.round((editing.calories / editing.grams) * 100));
    return String(perServing(editing));
  });
  const [amount, setAmount] = useState(() =>
    editing ? String(editing.grams ?? editing.servings ?? 1) : "1",
  );
  const [per100g, setPer100g] = useState<number | null>(null);
  const [perServingKcal, setPerServingKcal] = useState<number | null>(null);
  const [servingGrams, setServingGrams] = useState<number | null>(null);
  const [barcode, setBarcode] = useState<string | undefined>(editing?.barcode);
  const [source, setSource] = useState<FoodEntry["source"]>(editing?.source ?? "manual");
  const [hint, setHint] = useState<string | null>(null);
  const [typedCode, setTypedCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recents = useMemo(() => (editing ? [] : recentFoods(data, 10)), [data, editing]);

  const total = useMemo(() => {
    const k = toNum(perUnit);
    const a = toNum(amount);
    if (!Number.isFinite(k) || !Number.isFinite(a)) return 0;
    return Math.round(mode === "grams" ? (k * a) / 100 : k * a);
  }, [perUnit, amount, mode]);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    if (next === "grams") {
      if (per100g != null) setPerUnit(String(per100g));
      setAmount(servingGrams ? String(servingGrams) : "100");
    } else {
      if (perServingKcal != null) setPerUnit(String(perServingKcal));
      setAmount("1");
    }
  };

  const handleCode = useCallback(
    async (raw: string) => {
      const code = raw.replace(/\D/g, "");
      if (code.length < 6) {
        setError("That barcode looks too short.");
        return;
      }
      setBusy(true);
      setError(null);
      setBarcode(code);
      setSource("scan");

      const known = findByBarcode(data, code);
      if (known) {
        setName(known.name);
        setPerUnit(String(perServing(known)));
        setMode("servings");
        setAmount("1");
        setHint("Remembered from a previous scan.");
        setBusy(false);
        setStep("form");
        return;
      }

      try {
        const p = await lookupBarcode(code);
        if (!p.found) {
          setHint("Not in the Open Food Facts database. Enter it once and it will be remembered.");
        } else {
          setName(p.brand && !p.name.includes(p.brand) ? `${p.brand} ${p.name}` : p.name);
          setPer100g(p.kcalPer100g);
          setPerServingKcal(p.kcalPerServing);
          setServingGrams(p.servingGrams);
          if (p.kcalPerServing != null) {
            setMode("servings");
            setPerUnit(String(p.kcalPerServing));
            setAmount("1");
            setHint(p.servingSize ? `Label serving: ${p.servingSize}.` : null);
          } else if (p.kcalPer100g != null) {
            setMode("grams");
            setPerUnit(String(p.kcalPer100g));
            setAmount("100");
            setHint("Only per-100g calories are listed. Enter how many grams you ate.");
          } else {
            setHint("Product found, but no calories listed. Check the label.");
          }
        }
      } catch {
        setError("Lookup failed (are you offline?). Enter this food manually.");
      } finally {
        setBusy(false);
        setStep("form");
      }
    },
    [data],
  );

  const save = () => {
    const a = toNum(amount);
    if (!name.trim()) return setError("Give the food a name.");
    if (!Number.isFinite(a) || a <= 0) return setError("Amount must be greater than 0.");
    if (total <= 0) return setError("Calories must be greater than 0.");

    const fields = {
      name: name.trim(),
      calories: total,
      meal,
      servings: mode === "servings" ? a : undefined,
      grams: mode === "grams" ? a : undefined,
      source,
      barcode,
    };
    onChange(editing ? updateFood(editing.id, fields) : addFood({ date, ...fields }));
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sheet-grip" />
        {step === "scan" && (
          <>
            <h2>Scan barcode</h2>
            {busy ? <p className="hint center">Looking up product…</p> : <Scanner onScan={handleCode} />}
            <div className="inline-form">
              <input
                inputMode="numeric"
                placeholder="Or type the barcode number"
                value={typedCode}
                onChange={(e) => setTypedCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCode(typedCode)}
              />
              <button className="btn" disabled={busy} onClick={() => handleCode(typedCode)}>
                Look up
              </button>
            </div>
            {error && <p className="error">{error}</p>}
            <button className="btn ghost full" onClick={() => setStep("form")}>
              Enter manually instead
            </button>
          </>
        )}

        {step === "form" && (
          <>
            <h2>{editing ? "Edit food" : source === "scan" ? "Confirm food" : "Add food"}</h2>
            {hint && <p className="hint">{hint}</p>}

            {recents.length > 0 && source === "manual" && !name && (
              <div className="chips" aria-label="Recent foods">
                {recents.map((r) => (
                  <button
                    key={`${r.name}|${r.caloriesPerServing}`}
                    className="chip"
                    onClick={() => {
                      setName(r.name);
                      setPerUnit(String(r.caloriesPerServing));
                      setMode("servings");
                      setAmount("1");
                      setBarcode(r.barcode);
                    }}
                  >
                    {r.name} <span className="muted">{r.caloriesPerServing}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="field">
              <label htmlFor="food-name">Food</label>
              <input
                id="food-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Oatmeal, coffee, leftover pizza…"
                autoComplete="off"
              />
            </div>

            <div className="segmented" role="radiogroup" aria-label="Meal">
              {MEALS.map((m) => (
                <button
                  key={m.id}
                  role="radio"
                  aria-checked={meal === m.id}
                  className={meal === m.id ? "on" : ""}
                  onClick={() => setMeal(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="segmented small" role="radiogroup" aria-label="Measure by">
              <button className={mode === "servings" ? "on" : ""} onClick={() => switchMode("servings")}>
                Servings
              </button>
              <button className={mode === "grams" ? "on" : ""} onClick={() => switchMode("grams")}>
                Grams
              </button>
            </div>

            <div className="row">
              <div className="field">
                <label htmlFor="food-cal">{mode === "grams" ? "kcal per 100 g" : "kcal per serving"}</label>
                <input
                  id="food-cal"
                  inputMode="decimal"
                  value={perUnit}
                  onChange={(e) => setPerUnit(e.target.value)}
                  placeholder="250"
                />
              </div>
              <div className="field">
                <label htmlFor="food-amt">{mode === "grams" ? "Grams eaten" : "Servings"}</label>
                <div className="stepper">
                  {mode === "servings" && (
                    <button
                      aria-label="Fewer servings"
                      onClick={() => setAmount(String(Math.max(0.5, toNum(amount || "1") - 0.5)))}
                    >
                      −
                    </button>
                  )}
                  <input
                    id="food-amt"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  {mode === "servings" && (
                    <button
                      aria-label="More servings"
                      onClick={() => setAmount(String(toNum(amount || "0") + 0.5))}
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="total-line">
              <span className="muted">Total</span>
              <span className="display total-num">{total} kcal</span>
            </div>

            {error && <p className="error">{error}</p>}
            <div className="row">
              <button className="btn" onClick={save}>
                {editing ? "Save changes" : "Add calories"}
              </button>
              <button className="btn secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
            {editing && (
              <button
                className="btn ghost danger full"
                onClick={() => {
                  onChange(removeFood(editing.id));
                  onClose();
                }}
              >
                Delete entry
              </button>
            )}
            {!editing && source === "manual" && (
              <button className="btn ghost full" onClick={() => setStep("scan")}>
                Scan a barcode instead
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
