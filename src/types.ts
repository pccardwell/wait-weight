export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export type FoodEntry = {
  id: string;
  date: string;
  name: string;
  calories: number;
  source: "scan" | "manual";
  barcode?: string;
  meal?: Meal;
  servings?: number;
  grams?: number;
  createdAt: string;
};

export type WeightEntry = {
  id: string;
  date: string;
  pounds: number;
  createdAt: string;
};

export type GoalChange = {
  from: string;
  calories: number;
};

export type Profile = {
  sex: "male" | "female";
  age: number;
  heightIn: number;
  activity: "sedentary" | "light" | "moderate" | "active" | "very";
  weeklyLossLb: number;
};

export type Settings = {
  calorieGoal: number;
  weightUnit: "lb";
  goalWeight?: number;
  profile?: Profile;
};

export type AppData = {
  settings: Settings;
  goalHistory: GoalChange[];
  foods: FoodEntry[];
  weights: WeightEntry[];
};

export type TabId = "today" | "weight" | "progress" | "settings";
