import type { AppData, FoodEntry, Meal, Settings, WeightEntry } from "./types";

const KEY = "wait-weight:v1";

const defaultData: AppData = {
  settings: { calorieGoal: 2000, weightUnit: "lb" },
  goalHistory: [],
  foods: [],
  weights: [],
};

function normalize(parsed: Partial<AppData>): AppData {
  return {
    settings: { ...defaultData.settings, ...parsed.settings },
    goalHistory: parsed.goalHistory ?? [],
    foods: parsed.foods ?? [],
    weights: parsed.weights ?? [],
  };
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaultData);
    return normalize(JSON.parse(raw) as Partial<AppData>);
  } catch {
    return structuredClone(defaultData);
  }
}

function save(data: AppData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getData(): AppData {
  return load();
}

export function updateSettings(patch: Partial<Settings>): AppData {
  const data = load();
  const prevGoal = data.settings.calorieGoal;
  data.settings = { ...data.settings, ...patch };

  const nextGoal = data.settings.calorieGoal;
  if (nextGoal !== prevGoal) {
    const today = todayKey();
    if (data.goalHistory.length === 0) {
      data.goalHistory.push({ from: "0000-01-01", calories: prevGoal });
    }
    const existing = data.goalHistory.find((g) => g.from === today);
    if (existing) existing.calories = nextGoal;
    else data.goalHistory.push({ from: today, calories: nextGoal });
    data.goalHistory.sort((a, b) => a.from.localeCompare(b.from));
  }

  save(data);
  return data;
}

export function goalFor(data: AppData, date: string): number {
  let goal = data.settings.calorieGoal;
  for (const change of data.goalHistory) {
    if (change.from <= date) goal = change.calories;
  }
  return goal;
}

export function addFood(entry: Omit<FoodEntry, "id" | "createdAt">): AppData {
  const data = load();
  data.foods.unshift({
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  save(data);
  return data;
}

export function updateFood(id: string, patch: Partial<Omit<FoodEntry, "id">>): AppData {
  const data = load();
  data.foods = data.foods.map((f) => (f.id === id ? { ...f, ...patch } : f));
  save(data);
  return data;
}

export function removeFood(id: string): AppData {
  const data = load();
  data.foods = data.foods.filter((f) => f.id !== id);
  save(data);
  return data;
}

export function addWeight(entry: Omit<WeightEntry, "id" | "createdAt">): AppData {
  const data = load();
  const existing = data.weights.findIndex((w) => w.date === entry.date);
  const next: WeightEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  if (existing >= 0) data.weights[existing] = next;
  else data.weights.push(next);
  data.weights.sort((a, b) => a.date.localeCompare(b.date));
  save(data);
  return data;
}

export function removeWeight(id: string): AppData {
  const data = load();
  data.weights = data.weights.filter((w) => w.id !== id);
  save(data);
  return data;
}

export function exportData(): string {
  return JSON.stringify(load(), null, 2);
}

export function importData(json: string): AppData {
  const parsed = JSON.parse(json) as Partial<AppData>;
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.foods)) {
    throw new Error("That file doesn't look like a Wait Weight backup.");
  }
  const data = normalize(parsed);
  save(data);
  return data;
}

export type RecentFood = {
  name: string;
  caloriesPerServing: number;
  barcode?: string;
  source: FoodEntry["source"];
};

export function perServing(f: FoodEntry): number {
  return Math.round(f.calories / (f.servings && f.servings > 0 ? f.servings : 1));
}

export function recentFoods(data: AppData, limit = 12): RecentFood[] {
  const seen = new Set<string>();
  const out: RecentFood[] = [];
  for (const f of data.foods) {
    const caloriesPerServing = perServing(f);
    const key = `${f.name.toLowerCase()}|${caloriesPerServing}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: f.name, caloriesPerServing, barcode: f.barcode, source: f.source });
    if (out.length >= limit) break;
  }
  return out;
}

export function findByBarcode(data: AppData, barcode: string): FoodEntry | undefined {
  return data.foods.find((f) => f.barcode === barcode);
}

export function dayTotal(data: AppData, date: string): number {
  return data.foods.reduce((sum, f) => (f.date === date ? sum + f.calories : sum), 0);
}

export const MEALS: { id: Meal; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snack" },
];

export function defaultMeal(d = new Date()): Meal {
  const h = d.getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

export function todayKey(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseKey(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: string, n: number): string {
  const d = parseKey(date);
  d.setDate(d.getDate() + n);
  return todayKey(d);
}

export function lastNDates(n: number, end = todayKey()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i));
  return out;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86_400_000);
}

export function formatDateLabel(date: string): string {
  return parseKey(date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatShortDate(date: string): string {
  return parseKey(date).toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
}
