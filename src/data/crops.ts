import type { CropType, CropStage, Language, TaskType } from "@/types";

export interface CropInfo {
  label: string;
  hi: string;
  pa: string;
  /** Botanical family; disease pressure travels most easily within a family. */
  family: "solanaceae" | "vitaceae" | "alliaceae" | "fabaceae" | "poaceae";
  /** Indicative mandi price used only for demo value estimates. */
  pricePerQINR: number;
  /** Demo benchmark: input cost per quintal produced, used by the efficiency component. */
  benchmarkCostPerQINR: number;
}

export const CROPS: Record<CropType, CropInfo> = {
  tomato: { label: "Tomato", hi: "टमाटर", pa: "ਟਮਾਟਰ", family: "solanaceae", pricePerQINR: 1800, benchmarkCostPerQINR: 520 },
  chilli: { label: "Chilli", hi: "मिर्च", pa: "ਮਿਰਚ", family: "solanaceae", pricePerQINR: 6200, benchmarkCostPerQINR: 1900 },
  grapes: { label: "Grapes", hi: "अंगूर", pa: "ਅੰਗੂਰ", family: "vitaceae", pricePerQINR: 5200, benchmarkCostPerQINR: 1600 },
  onion: { label: "Onion", hi: "प्याज", pa: "ਪਿਆਜ਼", family: "alliaceae", pricePerQINR: 2400, benchmarkCostPerQINR: 640 },
  soybean: { label: "Soybean", hi: "सोयाबीन", pa: "ਸੋਇਆਬੀਨ", family: "fabaceae", pricePerQINR: 4900, benchmarkCostPerQINR: 1700 },
  wheat: { label: "Wheat", hi: "गेहूं", pa: "ਕਣਕ", family: "poaceae", pricePerQINR: 2425, benchmarkCostPerQINR: 980 },
  sugarcane: { label: "Sugarcane", hi: "गन्ना", pa: "ਗੰਨਾ", family: "poaceae", pricePerQINR: 340, benchmarkCostPerQINR: 120 },
  paddy: { label: "Paddy", hi: "धान", pa: "ਝੋਨਾ", family: "poaceae", pricePerQINR: 2300, benchmarkCostPerQINR: 900 },
};

export const CROP_ORDER: CropType[] = ["tomato", "chilli", "grapes", "onion", "soybean", "wheat", "sugarcane", "paddy"];

export const STAGE_LABEL: Record<CropStage, Record<Language, string>> = {
  nursery: { en: "Nursery", hi: "नर्सरी", pa: "ਨਰਸਰੀ" },
  vegetative: { en: "Vegetative", hi: "बढ़वार", pa: "ਵਾਧਾ" },
  flowering: { en: "Flowering", hi: "फूल", pa: "ਫੁੱਲ" },
  fruiting: { en: "Fruiting", hi: "फल", pa: "ਫਲ" },
  bulbing: { en: "Bulbing", hi: "गांठ बनना", pa: "ਗੰਢ ਬਣਨਾ" },
  pruning: { en: "Pruning", hi: "छंटाई", pa: "ਕਟਾਈ-ਛੰਟਾਈ" },
  maturity: { en: "Maturity", hi: "पकाव", pa: "ਪਕਾਈ" },
  harvest: { en: "Harvest", hi: "कटाई", pa: "ਵਾਢੀ" },
  sowing: { en: "Sowing", hi: "बुवाई", pa: "ਬਿਜਾਈ" },
};

export const TASK_TYPE_LABEL: Record<TaskType, Record<Language, string>> = {
  irrigation: { en: "Irrigation", hi: "सिंचाई", pa: "ਸਿੰਚਾਈ" },
  spraying: { en: "Spraying", hi: "छिड़काव", pa: "ਛਿੜਕਾਅ" },
  fertiliser: { en: "Fertiliser", hi: "खाद", pa: "ਖਾਦ" },
  harvest: { en: "Harvest", hi: "कटाई", pa: "ਵਾਢੀ" },
  scouting: { en: "Scouting", hi: "खेत जांच", pa: "ਖੇਤ ਜਾਂਚ" },
  sowing: { en: "Sowing", hi: "बुवाई", pa: "ਬਿਜਾਈ" },
  pruning: { en: "Pruning", hi: "छंटाई", pa: "ਕਟਾਈ-ਛੰਟਾਈ" },
};

export function cropLabel(crop: CropType, lang: Language = "en"): string {
  return lang === "en" ? CROPS[crop].label : CROPS[crop][lang];
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
