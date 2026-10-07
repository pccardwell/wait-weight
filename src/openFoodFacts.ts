export type ScannedProduct = {
  barcode: string;
  found: boolean;
  name: string;
  brand: string | null;
  kcalPerServing: number | null;
  kcalPer100g: number | null;
  servingSize: string | null;
  servingGrams: number | null;
};

type OffProduct = {
  product_name?: string;
  generic_name?: string;
  brands?: string;
  nutriments?: {
    "energy-kcal_serving"?: number;
    "energy-kcal_100g"?: number;
    "energy-kcal"?: number;
    "energy-kj_100g"?: number;
    "energy-kj_serving"?: number;
  };
  serving_size?: string;
  serving_quantity?: number | string;
};

const KJ_PER_KCAL = 4.184;

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

export async function lookupBarcode(barcode: string): Promise<ScannedProduct> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,generic_name,brands,nutriments,serving_size,serving_quantity`,
  );
  if (res.status === 404) return notFound(barcode);
  if (!res.ok) throw new Error("Could not look up that barcode.");
  const json = (await res.json()) as { status: number; product?: OffProduct };
  if (json.status !== 1 || !json.product) return notFound(barcode);

  const p = json.product;
  const n = p.nutriments ?? {};
  const kj100 = num(n["energy-kj_100g"]);
  const kjServing = num(n["energy-kj_serving"]);
  const per100 = num(n["energy-kcal_100g"]) ?? (kj100 ? kj100 / KJ_PER_KCAL : null);
  const servingGrams = num(p.serving_quantity);
  const perServing =
    num(n["energy-kcal_serving"]) ??
    (kjServing ? kjServing / KJ_PER_KCAL : null) ??
    (per100 && servingGrams ? (per100 * servingGrams) / 100 : null);

  return {
    barcode,
    found: true,
    name: p.product_name || p.generic_name || "Unnamed product",
    brand: p.brands?.split(",")[0]?.trim() || null,
    kcalPerServing: perServing != null ? Math.round(perServing) : null,
    kcalPer100g: per100 != null ? Math.round(per100) : null,
    servingSize: p.serving_size ?? null,
    servingGrams,
  };
}

function notFound(barcode: string): ScannedProduct {
  return {
    barcode,
    found: false,
    name: "",
    brand: null,
    kcalPerServing: null,
    kcalPer100g: null,
    servingSize: null,
    servingGrams: null,
  };
}
