import type { CropType, CropStage, TaskType } from "@/types";

export interface CropInfo {
  label: string;
  hi: string;
  /** Botanical family; disease pressure travels most easily within a family. */
  family: "solanaceae" | "vitaceae" | "alliaceae" | "fabaceae" | "poaceae";
  /** Indicative mandi price used only for demo value estimates. */
  pricePerQINR: number;
  /** Demo benchmark: input cost per quintal produced, used by the efficiency component. */
  benchmarkCostPerQINR: number;
}

export const CROPS: Record<CropType, CropInfo> = {
  tomato: { label: "Tomato", hi: "टमाटर", family: "solanaceae", pricePerQINR: 1800, benchmarkCostPerQINR: 520 },
  chilli: { label: "Chilli", hi: "मिर्च", family: "solanaceae", pricePerQINR: 6200, benchmarkCostPerQINR: 1900 },
  grapes: { label: "Grapes", hi: "अंगूर", family: "vitaceae", pricePerQINR: 5200, benchmarkCostPerQINR: 1600 },
  onion: { label: "Onion", hi: "प्याज", family: "alliaceae", pricePerQINR: 2400, benchmarkCostPerQINR: 640 },
  soybean: { label: "Soybean", hi: "सोयाबीन", family: "fabaceae", pricePerQINR: 4900, benchmarkCostPerQINR: 1700 },
  wheat: { label: "Wheat", hi: "गेहूं", family: "poaceae", pricePerQINR: 2425, benchmarkCostPerQINR: 980 },
  sugarcane: { label: "Sugarcane", hi: "गन्ना", family: "poaceae", pricePerQINR: 340, benchmarkCostPerQINR: 120 },
  paddy: { label: "Paddy", hi: "धान", family: "poaceae", pricePerQINR: 2300, benchmarkCostPerQINR: 900 },
};

export const CROP_ORDER: CropType[] = ["tomato", "chilli", "grapes", "onion", "soybean", "wheat", "sugarcane", "paddy"];

export const STAGE_LABEL: Record<CropStage, { en: string; hi: string }> = {
  nursery: { en: "Nursery", hi: "नर्सरी" },
  vegetative: { en: "Vegetative", hi: "बढ़वार" },
  flowering: { en: "Flowering", hi: "फूल" },
  fruiting: { en: "Fruiting", hi: "फल" },
  bulbing: { en: "Bulbing", hi: "गांठ बनना" },
  pruning: { en: "Pruning", hi: "छंटाई" },
  maturity: { en: "Maturity", hi: "पकाव" },
  harvest: { en: "Harvest", hi: "कटाई" },
  sowing: { en: "Sowing", hi: "बुवाई" },
};

export const TASK_TYPE_LABEL: Record<TaskType, { en: string; hi: string }> = {
  irrigation: { en: "Irrigation", hi: "सिंचाई" },
  spraying: { en: "Spraying", hi: "छिड़काव" },
  fertiliser: { en: "Fertiliser", hi: "खाद" },
  harvest: { en: "Harvest", hi: "कटाई" },
  scouting: { en: "Scouting", hi: "खेत जांच" },
  sowing: { en: "Sowing", hi: "बुवाई" },
  pruning: { en: "Pruning", hi: "छंटाई" },
};

export function cropLabel(crop: CropType, lang: "en" | "hi" = "en"): string {
  return lang === "hi" ? CROPS[crop].hi : CROPS[crop].label;
}

/** Demo planning yield per acre (quintals) used for standing-crop value estimates. */
export const PLAN_YIELD_Q_PER_ACRE: Record<CropType, number> = {
  tomato: 110,
  chilli: 20,
  grapes: 100,
  onion: 120,
  soybean: 10,
  wheat: 18,
  sugarcane: 400,
  paddy: 20,
};
