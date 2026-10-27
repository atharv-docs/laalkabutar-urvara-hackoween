/**
 * Voice & intent module: rule-based extraction of what a farmer said into a
 * structured draft. Works for English and Hindi (Devanagari) phrasing. The
 * farmer always reviews and can correct the result before anything is saved.
 */
import type { CropType, Field, ReportKind, Severity, TaskType } from "@/types";
import { CROPS } from "@/data/crops";

export interface ParsedUtterance {
  kind: ReportKind;
  crop?: CropType;
  fieldId?: string;
  symptom?: string;
  severity: Severity;
  requestedResource?: string;
  taskType?: TaskType;
  when?: "today" | "tomorrow";
  /** Which parts were inferred from words vs. defaulted, for the review screen. */
  inferred: string[];
}

const has = (text: string, words: string[]) => words.some((w) => text.includes(w));

const CROP_WORDS: Record<CropType, string[]> = {
  tomato: ["tomato", "टमाटर"],
  chilli: ["chilli", "chili", "mirchi", "मिर्च"],
  grapes: ["grape", "vineyard", "अंगूर"],
  onion: ["onion", "pyaz", "प्याज"],
  soybean: ["soybean", "soya", "सोयाबीन"],
  wheat: ["wheat", "गेहूं", "गेहूँ"],
  sugarcane: ["sugarcane", "cane", "गन्ना"],
  paddy: ["paddy", "rice", "धान", "चावल"],
};

const SYMPTOMS: { words: string[]; label: string }[] = [
  { words: ["yellow spot", "पीले धब्बे", "पीला धब्बा"], label: "Yellow spots on leaves" },
  { words: ["brown ring", "भूरे गोल", "rings"], label: "Brown concentric rings on leaves" },
  { words: ["yellow", "पीली", "पीले"], label: "Yellowing leaves" },
  { words: ["spot", "धब्बे"], label: "Spots on leaves" },
  { words: ["wilt", "droop", "मुरझा"], label: "Wilting plants" },
  { words: ["curl", "मुड़"], label: "Leaf curl" },
  { words: ["insect", "pest", "thrips", "worm", "कीड़े", "कीट", "इल्ली"], label: "Insects / pest damage" },
  { words: ["rot", "सड़"], label: "Rotting" },
  { words: ["white powder", "mildew", "सफेद"], label: "White powdery growth" },
];

const RESOURCES: { words: string[]; label: string }[] = [
  { words: ["sprayer", "स्प्रेयर", "spray machine", "pump"], label: "Sprayer" },
  { words: ["tractor", "ट्रैक्टर"], label: "Tractor" },
  { words: ["harvester", "हार्वेस्टर"], label: "Harvester" },
  { words: ["labour", "labor", "workers", "मजदूर"], label: "Labour" },
  { words: ["urea", "यूरिया"], label: "Urea" },
  { words: ["dap", "डीएपी"], label: "DAP" },
  { words: ["water", "पानी"], label: "Irrigation water" },
  { words: ["fungicide", "pesticide", "medicine", "दवा", "दवाई"], label: "Crop protection product" },
];

const TASK_WORDS: { words: string[]; type: TaskType }[] = [
  { words: ["irrigat", "watering", "सिंचाई", "पानी दिया", "पानी देना", "पानी दें", "पानी दूं", "पानी दूँ"], type: "irrigation" },
  { words: ["spray", "छिड़काव", "स्प्रे"], type: "spraying" },
  { words: ["fertili", "urea", "dap", "खाद", "यूरिया"], type: "fertiliser" },
  { words: ["harvest", "कटाई"], type: "harvest" },
  { words: ["sow", "बुवाई"], type: "sowing" },
  { words: ["scout", "inspect", "जांच"], type: "scouting" },
  { words: ["prun", "छंटाई"], type: "pruning" },
];

const NUMBER_WORDS: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", एक: "1", दो: "2", तीन: "3", चार: "4" };

function matchField(text: string, fields: Field[], crop?: CropType): Field | undefined {
  const m = text.match(/(?:field|khet|खेत|plot)\s*(?:no\.?|number|नंबर)?\s*(\d+|one|two|three|four|एक|दो|तीन|चार)/i);
  if (m) {
    const n = NUMBER_WORDS[m[1].toLowerCase()] ?? m[1];
    const byNumber = fields.filter((f) => new RegExp(`\\b${n}\\b`).test(f.name));
    if (byNumber.length === 1) return byNumber[0];
    if (crop) {
      const narrowed = byNumber.find((f) => f.crop === crop);
      if (narrowed) return narrowed;
    }
    if (byNumber.length) return byNumber[0];
  }
  if (crop) {
    const byCrop = fields.filter((f) => f.crop === crop);
    if (byCrop.length >= 1) return byCrop[0];
  }
  return fields.length === 1 ? fields[0] : undefined;
}

export function parseUtterance(raw: string, fields: Field[]): ParsedUtterance {
  const text = raw.toLowerCase();
  const inferred: string[] = [];

  let crop = (Object.keys(CROP_WORDS) as CropType[]).find((c) => has(text, CROP_WORDS[c]));
  if (crop) inferred.push("crop");

  const taskType = TASK_WORDS.find((t) => has(text, t.words))?.type;
  const resource = RESOURCES.find((r) => has(text, r.words))?.label;
  const symptom = SYMPTOMS.find((s) => has(text, s.words))?.label;

  const isQuestion =
    text.trim().endsWith("?") ||
    has(text, ["when ", "should ", "what ", "how ", "will ", "can i", "कब", "क्या", "कितना", "कैसे", "चाहिए क्या"]);
  const isDone = has(text, ["finished", "completed", "done", "हो गया", "पूरा", "खत्म", "कर दिया", "कर ली", "कर दी"]);
  const isRequest = has(text, ["need", "require", "send", "another", "चाहिए", "ज़रूरत", "जरूरत", "भेज"]);

  let kind: ReportKind;
  if (isQuestion && !symptom) kind = "question";
  else if (symptom) kind = "problem";
  else if (isDone) kind = "completion";
  else if (isRequest && resource) kind = "resource_request";
  else kind = "condition";
  inferred.push("kind");

  const field = matchField(text, fields, crop);
  if (field) {
    inferred.push("field");
    if (!crop) crop = field.crop;
  }

  let severity: Severity = kind === "problem" ? "medium" : "low";
  if (has(text, ["badly", "whole field", "all plants", "spreading", "many", "बहुत", "पूरे खेत", "फैल", "सारे"])) severity = "high";
  else if (has(text, ["few", "little", "some", "थोड़े", "कुछ"])) severity = "low";
  if (kind === "problem") inferred.push("severity");

  const when = has(text, ["tomorrow", "कल"]) ? "tomorrow" : has(text, ["today", "आज"]) ? "today" : undefined;

  return {
    kind,
    crop,
    fieldId: field?.id,
    symptom,
    severity,
    requestedResource: kind === "resource_request" || kind === "question" ? resource : undefined,
    taskType,
    when,
    inferred,
  };
}

export function cropFromWords(text: string): CropType | undefined {
  const lower = text.toLowerCase();
  return (Object.keys(CROPS) as CropType[]).find((c) => has(lower, CROP_WORDS[c]));
}
