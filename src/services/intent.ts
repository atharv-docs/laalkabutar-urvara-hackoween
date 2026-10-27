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
  tomato: ["tomato", "टमाटर", "ਟਮਾਟਰ"],
  chilli: ["chilli", "chili", "mirchi", "मिर्च", "ਮਿਰਚ"],
  grapes: ["grape", "vineyard", "अंगूर", "ਅੰਗੂਰ"],
  onion: ["onion", "pyaz", "प्याज", "ਪਿਆਜ਼", "ਪਿਆਜ"],
  soybean: ["soybean", "soya", "सोयाबीन", "ਸੋਇਆਬੀਨ"],
  wheat: ["wheat", "गेहूं", "गेहूँ", "ਕਣਕ"],
  sugarcane: ["sugarcane", "cane", "गन्ना", "ਗੰਨਾ"],
  paddy: ["paddy", "rice", "धान", "चावल", "ਝੋਨਾ", "ਚੌਲ"],
};

const SYMPTOMS: { words: string[]; label: string }[] = [
  { words: ["yellow spot", "पीले धब्बे", "पीला धब्बा", "ਪੀਲੇ ਧੱਬੇ", "ਪੀਲਾ ਧੱਬਾ"], label: "Yellow spots on leaves" },
  { words: ["brown ring", "भूरे गोल", "rings", "ਭੂਰੇ ਗੋਲ"], label: "Brown concentric rings on leaves" },
  { words: ["yellow", "पीली", "पीले", "ਪੀਲੀ", "ਪੀਲੇ"], label: "Yellowing leaves" },
  { words: ["spot", "धब्बे", "ਧੱਬੇ"], label: "Spots on leaves" },
  { words: ["wilt", "droop", "मुरझा", "ਮੁਰਝਾ"], label: "Wilting plants" },
  { words: ["curl", "मुड़", "ਮੁੜ"], label: "Leaf curl" },
  { words: ["insect", "pest", "thrips", "worm", "कीड़े", "कीट", "इल्ली", "ਕੀੜੇ", "ਸੁੰਡੀ"], label: "Insects / pest damage" },
  { words: ["rot", "सड़", "ਸੜ"], label: "Rotting" },
  { words: ["white powder", "mildew", "सफेद", "ਚਿੱਟ"], label: "White powdery growth" },
];

const RESOURCES: { words: string[]; label: string }[] = [
  { words: ["sprayer", "स्प्रेयर", "spray machine", "pump", "ਸਪਰੇਅਰ", "ਸਪਰੇ ਮਸ਼ੀਨ"], label: "Sprayer" },
  { words: ["tractor", "ट्रैक्टर", "ਟਰੈਕਟਰ", "ਟ੍ਰੈਕਟਰ"], label: "Tractor" },
  { words: ["harvester", "हार्वेस्टर", "ਹਾਰਵੈਸਟਰ", "ਕੰਬਾਈਨ"], label: "Harvester" },
  { words: ["labour", "labor", "workers", "मजदूर", "ਮਜ਼ਦੂਰ", "ਮਜਦੂਰ"], label: "Labour" },
  { words: ["urea", "यूरिया", "ਯੂਰੀਆ"], label: "Urea" },
  { words: ["dap", "डीएपी", "ਡੀਏਪੀ"], label: "DAP" },
  { words: ["water", "पानी", "ਪਾਣੀ"], label: "Irrigation water" },
  { words: ["fungicide", "pesticide", "medicine", "दवा", "दवाई", "ਦਵਾਈ"], label: "Crop protection product" },
];

const TASK_WORDS: { words: string[]; type: TaskType }[] = [
  { words: ["irrigat", "watering", "सिंचाई", "पानी दिया", "पानी देना", "पानी दें", "पानी दूं", "पानी दूँ", "ਸਿੰਚਾਈ", "ਪਾਣੀ ਲਾ", "ਪਾਣੀ ਦਿੱਤਾ"], type: "irrigation" },
  { words: ["spray", "छिड़काव", "स्प्रे", "ਛਿੜਕ", "ਸਪਰੇ"], type: "spraying" },
  { words: ["fertili", "urea", "dap", "खाद", "यूरिया", "ਖਾਦ", "ਯੂਰੀਆ"], type: "fertiliser" },
  { words: ["harvest", "कटाई", "ਵਾਢੀ"], type: "harvest" },
  { words: ["sow", "बुवाई", "ਬਿਜਾਈ"], type: "sowing" },
  { words: ["scout", "inspect", "जांच", "ਜਾਂਚ"], type: "scouting" },
  { words: ["prun", "छंटाई", "ਛੰਟਾਈ"], type: "pruning" },
];

const NUMBER_WORDS: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", एक: "1", दो: "2", तीन: "3", चार: "4", ਇੱਕ: "1", ਦੋ: "2", ਤਿੰਨ: "3", ਚਾਰ: "4" };

function matchField(text: string, fields: Field[], crop?: CropType): Field | undefined {
  const m = text.match(/(?:field|khet|खेत|ਖੇਤ|plot)\s*(?:no\.?|number|नंबर|ਨੰਬਰ)?\s*(\d+|one|two|three|four|एक|दो|तीन|चार|ਇੱਕ|ਦੋ|ਤਿੰਨ|ਚਾਰ)/i);
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
    has(text, ["when ", "should ", "what ", "how ", "will ", "can i", "कब", "क्या", "कितना", "कैसे", "चाहिए क्या", "ਕਦੋਂ", "ਕੀ ", "ਕਿੰਨਾ", "ਕਿਵੇਂ", "ਕਿਉਂ"]);
  const isDone = has(text, ["finished", "completed", "done", "हो गया", "पूरा", "खत्म", "कर दिया", "कर ली", "कर दी", "ਹੋ ਗਈ", "ਹੋ ਗਿਆ", "ਪੂਰੀ", "ਪੂਰਾ", "ਮੁਕ ਗਿਆ", "ਕਰ ਦਿੱਤਾ"]);
  const isRequest = has(text, ["need", "require", "send", "another", "चाहिए", "ज़रूरत", "जरूरत", "भेज", "ਚਾਹੀਦਾ", "ਚਾਹੀਦੀ", "ਲੋੜ", "ਭੇਜ"]);

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
  if (has(text, ["badly", "whole field", "all plants", "spreading", "many", "बहुत", "पूरे खेत", "फैल", "सारे", "ਬਹੁਤ", "ਸਾਰੇ ਖੇਤ", "ਫੈਲ", "ਸਾਰੇ"])) severity = "high";
  else if (has(text, ["few", "little", "some", "थोड़े", "कुछ", "ਥੋੜ੍ਹੇ", "ਕੁਝ"])) severity = "low";
  if (kind === "problem") inferred.push("severity");

  const when = has(text, ["tomorrow", "कल", "ਕੱਲ੍ਹ", "ਕੱਲ"]) ? "tomorrow" : has(text, ["today", "आज", "ਅੱਜ"]) ? "today" : undefined;

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
