/**
 * Deterministic synthetic scenario. Every name, farm, reading and score here
 * is invented for the hackathon demo. Re-running the seed always produces the
 * exact same state, so the judging story is repeatable.
 */
import type {
  CropSeasonRecord,
  Field,
  ForecastBlock,
  Report,
  Resource,
  RupeeScoreRecord,
  SensorReading,
  Task,
  TaskLogEntry,
  UrvaraState,
  User,
  WeatherSnapshot,
  Farm,
  AuditEvent,
} from "@/types";
import { atLocal } from "@/lib/time";
import { assessReport } from "@/services/risk";
import { buildScoreRecord } from "@/services/rupeeScore";

export const SCHEMA_VERSION = 3;
export const DEMO_NOW = "2026-10-28T08:00:00+05:30";
const NOW = DEMO_NOW;
const at = (day: number, hour: number, minute = 0) => atLocal(NOW, day, hour, minute);

export const OWNER_ID = "usr-o-001";

const farms: Farm[] = [
  { id: "farm-01", name: "Sahyadri Farm", village: "Dindori", district: "Nashik", lat: 20.203, lng: 73.833, areaAcres: 15, weatherZone: "dindori" },
  { id: "farm-02", name: "Godavari Farm", village: "Niphad", district: "Nashik", lat: 20.08, lng: 74.11, areaAcres: 18, weatherZone: "niphad" },
  { id: "farm-03", name: "Kadwa Farm", village: "Mohadi", district: "Nashik", lat: 20.181, lng: 73.856, areaAcres: 9, weatherZone: "dindori" },
  { id: "farm-04", name: "Pimpalgaon Farm", village: "Pimpalgaon Baswant", district: "Nashik", lat: 20.166, lng: 73.988, areaAcres: 14, weatherZone: "niphad" },
  { id: "farm-05", name: "Sinnar Farm", village: "Sinnar", district: "Nashik", lat: 19.845, lng: 73.998, areaAcres: 18, weatherZone: "sinnar" },
  { id: "farm-06", name: "Igatpuri Farm", village: "Igatpuri", district: "Nashik", lat: 19.696, lng: 73.563, areaAcres: 9, weatherZone: "igatpuri" },
];

const fields: Field[] = [
  { id: "fld-01", farmId: "farm-01", name: "Field 1 – North block", crop: "tomato", stage: "fruiting", areaAcres: 6, plantedOn: "2026-08-04", soilType: "Medium black" },
  { id: "fld-02", farmId: "farm-01", name: "Field 2 – Canal side", crop: "tomato", stage: "flowering", areaAcres: 5, plantedOn: "2026-08-30", soilType: "Medium black" },
  { id: "fld-03", farmId: "farm-01", name: "Field 3 – Upper terrace", crop: "onion", stage: "vegetative", areaAcres: 4, plantedOn: "2026-10-02", soilType: "Red loam" },
  { id: "fld-04", farmId: "farm-02", name: "Vineyard A", crop: "grapes", stage: "pruning", areaAcres: 10, plantedOn: "2019-01-15", soilType: "Calcareous black" },
  { id: "fld-05", farmId: "farm-02", name: "Field 2 – River plot", crop: "onion", stage: "bulbing", areaAcres: 8, plantedOn: "2026-08-20", soilType: "Deep black" },
  { id: "fld-06", farmId: "farm-03", name: "Field 1 – Canal rows", crop: "tomato", stage: "fruiting", areaAcres: 5, plantedOn: "2026-08-02", soilType: "Medium black" },
  { id: "fld-07", farmId: "farm-03", name: "Field 2 – Chilli plot", crop: "chilli", stage: "fruiting", areaAcres: 4, plantedOn: "2026-07-22", soilType: "Medium black" },
  { id: "fld-08", farmId: "farm-04", name: "Field 1 – Onion east", crop: "onion", stage: "bulbing", areaAcres: 8, plantedOn: "2026-08-25", soilType: "Deep black" },
  { id: "fld-09", farmId: "farm-04", name: "Field 2 – Soybean", crop: "soybean", stage: "harvest", areaAcres: 6, plantedOn: "2026-06-28", soilType: "Medium black" },
  { id: "fld-10", farmId: "farm-05", name: "Field 1 – Wheat", crop: "wheat", stage: "sowing", areaAcres: 10, plantedOn: "2026-10-30", soilType: "Light black" },
  { id: "fld-11", farmId: "farm-05", name: "Field 2 – Sugarcane", crop: "sugarcane", stage: "vegetative", areaAcres: 8, plantedOn: "2026-02-10", soilType: "Deep black" },
  { id: "fld-12", farmId: "farm-06", name: "Field 1 – Paddy", crop: "paddy", stage: "harvest", areaAcres: 9, plantedOn: "2026-07-05", soilType: "Lateritic" },
];

const created = "2026-06-01T09:00:00+05:30";
const farmer = (n: number, name: string, fieldIds: string[], language: User["language"], village: string): User => ({
  id: `usr-f-${String(n).padStart(3, "0")}`,
  name,
  role: "farmer",
  loginId: `URV-F-${String(n).padStart(4, "0")}`,
  status: "active",
  fieldIds,
  farmIds: [...new Set(fieldIds.map((id) => fields.find((f) => f.id === id)!.farmId))],
  language,
  village,
  createdAt: created,
});

const users: User[] = [
  { id: OWNER_ID, name: "Anjali Deshpande", role: "owner", loginId: "URV-O-0001", status: "active", farmIds: farms.map((f) => f.id), fieldIds: fields.map((f) => f.id), language: "en", village: "Nashik", createdAt: created },
  farmer(1, "Ramesh Pawar", ["fld-01", "fld-02"], "hi", "Dindori"),
  farmer(2, "Sunita Jadhav", ["fld-03", "fld-06"], "hi", "Mohadi"),
  farmer(3, "Vikas Shinde", ["fld-04"], "en", "Niphad"),
  farmer(4, "Lakshmi Gaikwad", ["fld-05", "fld-08"], "hi", "Pimpalgaon"),
  farmer(5, "Arjun More", ["fld-07"], "en", "Mohadi"),
  farmer(6, "Kavita Deshmukh", ["fld-09", "fld-10"], "hi", "Sinnar"),
  farmer(7, "Sanjay Bhosale", ["fld-11"], "en", "Sinnar"),
  farmer(8, "Pooja Kale", ["fld-12"], "hi", "Igatpuri"),
];

const resources: Resource[] = [
  { id: "res-m01", kind: "machine", name: "Boom sprayer S-1", category: "sprayer", unit: "machine", quantity: 1, status: "available", homeFarmId: "farm-01" },
  { id: "res-m02", kind: "machine", name: "Power sprayer S-2", category: "sprayer", unit: "machine", quantity: 1, status: "available", homeFarmId: "farm-02" },
  { id: "res-m03", kind: "machine", name: "Tractor T-1", category: "tractor", unit: "machine", quantity: 1, status: "available", homeFarmId: "farm-04" },
  { id: "res-m04", kind: "machine", name: "Combine harvester H-1", category: "harvester", unit: "machine", quantity: 1, status: "available", homeFarmId: "farm-06" },
  { id: "res-i01", kind: "input", name: "Mancozeb 75% WP (fungicide)", category: "fungicide", unit: "kg", quantity: 24, reorderAt: 8, status: "available", costPerUnitINR: 520 },
  { id: "res-i02", kind: "input", name: "Urea (45 kg bag)", category: "fertiliser", unit: "bags", quantity: 22, reorderAt: 10, status: "available", costPerUnitINR: 267 },
  { id: "res-i03", kind: "input", name: "DAP (50 kg bag)", category: "fertiliser", unit: "bags", quantity: 7, reorderAt: 2, status: "available", costPerUnitINR: 1350 },
  { id: "res-i04", kind: "input", name: "Wheat seed HD-2967", category: "seed", unit: "kg", quantity: 420, reorderAt: 50, status: "available", costPerUnitINR: 48 },
  { id: "res-i05", kind: "input", name: "Thiamethoxam 25% WG (insecticide)", category: "insecticide", unit: "kg", quantity: 2, reorderAt: 0.5, status: "available", costPerUnitINR: 2400 },
  { id: "res-i06", kind: "input", name: "Wettable sulphur 80% WDG", category: "fungicide", unit: "kg", quantity: 30, reorderAt: 10, status: "available", costPerUnitINR: 130 },
  { id: "res-w01", kind: "water", name: "Kadwa canal allocation", category: "canal", unit: "kL/day", quantity: 180, reorderAt: 30, status: "available" },
  { id: "res-w02", kind: "water", name: "Niphad borewell", category: "borewell", unit: "kL/day", quantity: 120, reorderAt: 20, status: "available" },
  { id: "res-l01", kind: "labour", name: "Daily labour pool", category: "labour", unit: "workers", quantity: 14, status: "available" },
];

const hist = (text: string, when = "2026-10-25T18:00:00+05:30") => [{ at: when, actor: OWNER_ID, text }];

const task = (t: Omit<Task, "history" | "inputs" | "machineIds"> & Partial<Pick<Task, "history" | "inputs" | "machineIds">>): Task => ({
  machineIds: [],
  inputs: [],
  history: hist(`Created and assigned`),
  ...t,
});

const F = (n: number) => `usr-f-${String(n).padStart(3, "0")}`;

const tasks: Task[] = [
  task({ id: "tsk-001", title: "Fungicide spray – early blight protection", titleHi: "फफूंदनाशक छिड़काव – झुलसा रोग से बचाव", titlePa: "ਉੱਲੀਨਾਸ਼ਕ ਛਿੜਕਾਅ – ਝੁਲਸ ਰੋਗ ਤੋਂ ਬਚਾਅ", type: "spraying", farmId: "farm-01", fieldId: "fld-01", crop: "tomato", assigneeId: F(1), start: at(1, 14), end: at(1, 17), due: at(2, 18), priority: "high", status: "scheduled", machineIds: ["res-m01"], inputs: [{ resourceId: "res-i01", quantity: 6 }], rationale: "Protective mancozeb round; fruiting stage and humid nights raise early-blight pressure." }),
  task({ id: "tsk-002", title: "Chilli spray – fruit rot prevention", titleHi: "मिर्च पर छिड़काव – फल सड़न से बचाव", titlePa: "ਮਿਰਚ ਤੇ ਛਿੜਕਾਅ – ਫਲ ਸੜਨ ਤੋਂ ਬਚਾਅ", type: "spraying", farmId: "farm-03", fieldId: "fld-07", crop: "chilli", assigneeId: F(5), start: at(3, 10), end: at(3, 13), due: at(4, 18), priority: "high", status: "scheduled", machineIds: ["res-m01"], inputs: [{ resourceId: "res-i01", quantity: 4 }], rationale: "Second protective round, 12 days after the last spray." }),
  task({ id: "tsk-003", title: "Thrips control spray", titleHi: "थ्रिप्स नियंत्रण छिड़काव", titlePa: "ਥ੍ਰਿਪਸ ਰੋਕਥਾਮ ਛਿੜਕਾਅ", type: "spraying", farmId: "farm-04", fieldId: "fld-08", crop: "onion", assigneeId: F(4), start: at(3, 14), end: at(3, 17), due: at(3, 18), priority: "medium", status: "scheduled", machineIds: ["res-m01"], inputs: [{ resourceId: "res-i05", quantity: 0.5 }], rationale: "Thrips counts above threshold at last scouting (12 per plant)." }),
  task({ id: "tsk-004", title: "Sulphur spray – powdery mildew", titleHi: "गंधक छिड़काव – पाउडरी मिल्ड्यू", titlePa: "ਗੰਧਕ ਛਿੜਕਾਅ – ਪਾਊਡਰੀ ਮਿਲਡਿਊ", type: "spraying", farmId: "farm-02", fieldId: "fld-04", crop: "grapes", assigneeId: F(3), start: at(1, 10), end: at(1, 13), due: at(2, 18), priority: "high", status: "scheduled", machineIds: ["res-m02"], inputs: [{ resourceId: "res-i06", quantity: 12 }], rationale: "Post-pruning protection window; new shoots are most susceptible." }),
  task({ id: "tsk-005", title: "Sulphur spray – second round", titleHi: "गंधक छिड़काव – दूसरा दौर", titlePa: "ਗੰਧਕ ਛਿੜਕਾਅ – ਦੂਜਾ ਦੌਰ", type: "spraying", farmId: "farm-02", fieldId: "fld-04", crop: "grapes", assigneeId: F(3), start: at(3, 10), end: at(3, 13), due: at(4, 12), priority: "medium", status: "scheduled", machineIds: ["res-m02"], inputs: [{ resourceId: "res-i06", quantity: 12 }], rationale: "Follow-up round 7 days after the first." }),
  task({ id: "tsk-006", title: "Urea top-dress", titleHi: "यूरिया टॉप-ड्रेस", titlePa: "ਯੂਰੀਆ ਟੌਪ-ਡ੍ਰੈਸ", type: "fertiliser", farmId: "farm-02", fieldId: "fld-05", crop: "onion", assigneeId: F(4), start: at(2, 7), end: at(2, 10), due: at(3, 18), priority: "medium", status: "scheduled", machineIds: ["res-m03"], inputs: [{ resourceId: "res-i02", quantity: 4 }], rationale: "Bulbing stage; soil test shows nitrogen below 200 kg/ha." }),
  task({ id: "tsk-007", title: "Wheat sowing with basal DAP", titleHi: "गेहूं बुवाई, साथ में DAP", titlePa: "ਕਣਕ ਬਿਜਾਈ, ਨਾਲ DAP", type: "sowing", farmId: "farm-05", fieldId: "fld-10", crop: "wheat", assigneeId: F(6), start: at(2, 14), end: at(2, 18), due: at(4, 18), priority: "high", status: "scheduled", machineIds: ["res-m03"], inputs: [{ resourceId: "res-i04", quantity: 400 }, { resourceId: "res-i03", quantity: 4 }], rationale: "Optimal sowing window for timely-sown wheat in Nashik closes mid-November." }),
  task({ id: "tsk-009", title: "Paddy harvest", titleHi: "धान की कटाई", titlePa: "ਝੋਨੇ ਦੀ ਵਾਢੀ", type: "harvest", farmId: "farm-06", fieldId: "fld-12", crop: "paddy", assigneeId: F(8), start: at(1, 7), end: at(1, 12), due: at(2, 18), priority: "high", status: "scheduled", machineIds: ["res-m04"], rationale: "Grain moisture ~20%; delay risks shattering and lodging." }),
  task({ id: "tsk-010", title: "Drip irrigation", titleHi: "ड्रिप सिंचाई", titlePa: "ਡ੍ਰਿਪ ਸਿੰਚਾਈ", type: "irrigation", farmId: "farm-03", fieldId: "fld-06", crop: "tomato", assigneeId: F(2), start: at(2, 7), end: at(2, 9), due: at(3, 12), priority: "medium", status: "scheduled", inputs: [{ resourceId: "res-w01", quantity: 40 }], rationale: "Scheduled 3-day irrigation cycle during fruiting." }),
  task({ id: "tsk-011", title: "Drip irrigation", titleHi: "ड्रिप सिंचाई", titlePa: "ਡ੍ਰਿਪ ਸਿੰਚਾਈ", type: "irrigation", farmId: "farm-01", fieldId: "fld-02", crop: "tomato", assigneeId: F(1), start: at(0, 17), end: at(0, 19), due: at(0, 20), priority: "high", status: "scheduled", inputs: [{ resourceId: "res-w01", quantity: 35 }], rationale: "Soil moisture 19% is below the 22% threshold during flowering." }),
  task({ id: "tsk-012", title: "Scout Field 1 for leaf spots", titleHi: "खेत 1 में पत्तियों के धब्बों की जांच", titlePa: "ਖੇਤ 1 ਵਿੱਚ ਪੱਤਿਆਂ ਦੇ ਧੱਬਿਆਂ ਦੀ ਜਾਂਚ", type: "scouting", farmId: "farm-01", fieldId: "fld-01", crop: "tomato", assigneeId: F(1), start: at(0, 10), end: at(0, 11), due: at(0, 18), priority: "high", status: "scheduled", rationale: "Suggested by risk check on report rpt-001 (3.4 km away, same crop). Unverified report: inspect lower leaves and record what you find.", history: hist("Created from scouting suggestion", "2026-10-27T18:10:00+05:30") }),
  task({ id: "tsk-013", title: "Furrow irrigation", titleHi: "नाली से सिंचाई", titlePa: "ਨਾਲੀਆਂ ਰਾਹੀਂ ਸਿੰਚਾਈ", type: "irrigation", farmId: "farm-05", fieldId: "fld-11", crop: "sugarcane", assigneeId: F(7), start: at(0, 6), end: at(0, 8), due: at(0, 10), priority: "medium", status: "done", completedAt: at(0, 7, 55), completionNote: "Finished irrigation in sugarcane field", inputs: [{ resourceId: "res-w02", quantity: 0 }], rationale: "Weekly cycle.", history: [...hist("Created and assigned"), { at: at(0, 7, 55), actor: F(7), text: "Completed via report rpt-003" }] }),
  task({ id: "tsk-014", title: "Pruning – block 3 cane removal", titleHi: "छंटाई – ब्लॉक 3", titlePa: "ਕਟਾਈ-ਛੰਟਾਈ – ਬਲਾਕ 3", type: "pruning", farmId: "farm-02", fieldId: "fld-04", crop: "grapes", assigneeId: F(3), start: at(-1, 8), end: at(-1, 17), due: at(-1, 18), priority: "medium", status: "scheduled", rationale: "October fruit pruning must finish this week to keep bud break uniform." }),
  task({ id: "tsk-015", title: "Drip irrigation", titleHi: "ड्रिप सिंचाई", titlePa: "ਡ੍ਰਿਪ ਸਿੰਚਾਈ", type: "irrigation", farmId: "farm-04", fieldId: "fld-08", crop: "onion", assigneeId: F(4), start: at(0, 7), end: at(0, 9, 30), due: at(0, 12), priority: "medium", status: "in_progress", inputs: [{ resourceId: "res-w02", quantity: 30 }], rationale: "Moisture 21% at bulbing.", history: [...hist("Created and assigned"), { at: at(0, 7, 5), actor: F(4), text: "Started" }] }),
  task({ id: "tsk-016", title: "Soybean harvest (manual) and drying", titleHi: "सोयाबीन कटाई और सुखाई", titlePa: "ਸੋਇਆਬੀਨ ਵਾਢੀ ਅਤੇ ਸੁਕਾਈ", type: "harvest", farmId: "farm-04", fieldId: "fld-09", crop: "soybean", assigneeId: F(6), start: at(0, 7), end: at(0, 12), due: at(0, 18), priority: "high", status: "in_progress", rationale: "Pods dry and rattling; harvest before rain.", history: [...hist("Created and assigned"), { at: at(0, 7, 10), actor: F(6), text: "Started" }] }),
  task({ id: "tsk-017", title: "DAP side-dress", titleHi: "DAP साइड-ड्रेस", titlePa: "DAP ਸਾਈਡ-ਡ੍ਰੈਸ", type: "fertiliser", farmId: "farm-03", fieldId: "fld-07", crop: "chilli", assigneeId: F(5), start: at(1, 7), end: at(1, 9), due: at(1, 12), priority: "medium", status: "scheduled", inputs: [{ resourceId: "res-i03", quantity: 2 }], rationale: "Second split of phosphorus during fruiting." }),
  task({ id: "tsk-018", title: "Zinc sulphate application", titleHi: "जिंक सल्फेट डालना", titlePa: "ਜ਼ਿੰਕ ਸਲਫ਼ੇਟ ਪਾਉਣਾ", type: "fertiliser", farmId: "farm-01", fieldId: "fld-03", crop: "onion", assigneeId: F(2), start: at(0, 9), end: at(0, 11), due: at(1, 18), priority: "low", status: "blocked", blockerReason: "Seed, fertiliser or spray not available", needsAttention: "Blocked by farmer: Seed, fertiliser or spray not available", rationale: "Leaf tips showing zinc deficiency banding.", history: [...hist("Created and assigned"), { at: at(0, 7, 40), actor: F(2), text: "Blocked, reason: Seed, fertiliser or spray not available" }] }),
];

/** Baseline post-monsoon forecast: mostly dry, humid mornings in Dindori. */
const ZONES: Record<string, { label: string; temp: number; hum: number; wind: number }> = {
  dindori: { label: "Dindori cluster", temp: 29, hum: 74, wind: 9 },
  niphad: { label: "Niphad cluster", temp: 31, hum: 66, wind: 10 },
  sinnar: { label: "Sinnar", temp: 31, hum: 58, wind: 11 },
  igatpuri: { label: "Igatpuri", temp: 26, hum: 70, wind: 12 },
};

const DIRS = ["NE", "E", "E", "SE", "NE"];

export function baselineBlocks(zone: string): ForecastBlock[] {
  const z = ZONES[zone];
  const blocks: ForecastBlock[] = [];
  for (let day = 0; day < 5; day += 1) {
    const wiggle = (day * 7 + zone.length) % 5;
    blocks.push({ start: at(day, 6), end: at(day, 12), tempC: z.temp - 4 + (wiggle % 2), humidity: z.hum + 8 - wiggle, rainProb: 5 + wiggle * 3, rainMm: 0, windKmh: z.wind - 2 + (wiggle % 3), windDir: DIRS[day] });
    blocks.push({ start: at(day, 12), end: at(day, 18), tempC: z.temp + (wiggle % 3), humidity: z.hum - 6 - wiggle, rainProb: 10 + wiggle * 2, rainMm: 0, windKmh: z.wind + (wiggle % 3), windDir: DIRS[day] });
  }
  return blocks;
}

/** The "forecast flip" scenario: a thunderstorm system over Dindori and Niphad, Thu PM – Fri AM. */
export const STORM_ZONES = ["dindori", "niphad"];
export function stormBlocks(zone: string): ForecastBlock[] {
  return baselineBlocks(zone).map((b) => {
    if (b.start === at(1, 6)) return { ...b, rainProb: 30, humidity: b.humidity + 6, windKmh: 11 };
    if (b.start === at(1, 12)) return { ...b, rainProb: 85, rainMm: 16, humidity: 88, windKmh: 26, windDir: "SW", tempC: b.tempC - 4 };
    if (b.start === at(2, 6)) return { ...b, rainProb: 75, rainMm: 12, humidity: 92, windKmh: 18, windDir: "SW", tempC: b.tempC - 3 };
    if (b.start === at(2, 12)) return { ...b, rainProb: 40, rainMm: 2, humidity: 82, windKmh: 14, windDir: "W" };
    return b;
  });
}

function weatherSnapshot(zone: string): WeatherSnapshot {
  const z = ZONES[zone];
  return {
    id: `wx-${zone}`,
    zone,
    zoneLabel: z.label,
    issuedAt: at(0, 5, 30),
    provider: "Seeded demo forecast",
    source: "seeded",
    blocks: baselineBlocks(zone),
    local: { at: at(0, 7, 45), tempC: z.temp - 5, humidity: z.hum + 9, windKmh: z.wind - 3, source: "simulated" },
  };
}

/** Soil readings: moisture from a simulated probe (hourly), soil-test values entered manually. */
const SOIL: Record<string, { moisture: number[]; ph: number; n: number; p: number; k: number; ec: number }> = {
  "fld-01": { moisture: [30, 28, 27, 25, 24, 26, 25], ph: 7.2, n: 240, p: 22, k: 310, ec: 0.6 },
  "fld-02": { moisture: [27, 25, 24, 22, 21, 20, 19], ph: 7.4, n: 228, p: 19, k: 295, ec: 0.7 },
  "fld-03": { moisture: [33, 31, 30, 29, 28, 27, 27], ph: 6.6, n: 210, p: 17, k: 260, ec: 0.4 },
  "fld-04": { moisture: [29, 28, 27, 27, 26, 26, 25], ph: 8.1, n: 260, p: 28, k: 380, ec: 1.1 },
  "fld-05": { moisture: [31, 30, 29, 28, 28, 27, 26], ph: 7.6, n: 182, p: 21, k: 330, ec: 2.4 },
  "fld-06": { moisture: [35, 34, 33, 32, 32, 31, 31], ph: 7.1, n: 236, p: 24, k: 300, ec: 0.6 },
  "fld-07": { moisture: [30, 29, 29, 28, 27, 27, 26], ph: 7, n: 250, p: 26, k: 290, ec: 0.5 },
  "fld-08": { moisture: [28, 26, 25, 24, 23, 22, 21], ph: 7.5, n: 205, p: 18, k: 320, ec: 1.3 },
  "fld-09": { moisture: [20, 19, 18, 18, 17, 17, 16], ph: 7.3, n: 215, p: 20, k: 280, ec: 0.8 },
  "fld-10": { moisture: [24, 24, 23, 23, 22, 23, 24], ph: 7.6, n: 198, p: 16, k: 270, ec: 0.9 },
  "fld-11": { moisture: [34, 30, 29, 28, 27, 26, 38], ph: 7.8, n: 230, p: 21, k: 340, ec: 1.6 },
  "fld-12": { moisture: [44, 42, 41, 40, 39, 38, 37], ph: 6.1, n: 190, p: 14, k: 210, ec: 0.3 },
};

function sensorReadings(): SensorReading[] {
  const out: SensorReading[] = [];
  let n = 0;
  const id = () => `snr-${String(++n).padStart(4, "0")}`;
  for (const [fieldId, s] of Object.entries(SOIL)) {
    s.moisture.forEach((value, i) => {
      out.push({ id: id(), fieldId, kind: "moisture", value, unit: "% VWC", at: i === 6 ? at(0, 7, 25) : at(i - 6, 7, 30), source: "simulated" });
    });
    const tested = "2026-10-12T11:00:00+05:30";
    out.push({ id: id(), fieldId, kind: "ph", value: s.ph, unit: "pH", at: tested, source: "manual" });
    out.push({ id: id(), fieldId, kind: "nitrogen", value: s.n, unit: "kg/ha", at: tested, source: "manual" });
    out.push({ id: id(), fieldId, kind: "phosphorus", value: s.p, unit: "kg/ha", at: tested, source: "manual" });
    out.push({ id: id(), fieldId, kind: "potassium", value: s.k, unit: "kg/ha", at: tested, source: "manual" });
    out.push({ id: id(), fieldId, kind: "ec", value: s.ec, unit: "dS/m", at: tested, source: "manual" });
  }
  return out;
}

const reports: Report[] = [
  {
    id: "rpt-001",
    kind: "problem",
    inputMode: "demo_sample",
    reporterId: F(2),
    farmId: "farm-03",
    fieldId: "fld-06",
    crop: "tomato",
    transcript: "टमाटर की नीचे की पत्तियों पर पीले धब्बे और भूरे गोल निशान हैं, नहर के पास दो लाइनों में फैल रहे हैं।",
    symptom: "Yellow spots with brown concentric rings on lower leaves",
    severity: "medium",
    createdAt: "2026-10-27T17:40:00+05:30",
    observedAt: "2026-10-27T17:15:00+05:30",
    status: "unverified",
    language: "hi",
    riskAssessedAt: "2026-10-27T17:41:00+05:30",
  },
  {
    id: "rpt-002",
    kind: "resource_request",
    inputMode: "demo_sample",
    reporterId: F(4),
    farmId: "farm-04",
    fieldId: "fld-08",
    crop: "onion",
    transcript: "Need more thiamethoxam for the thrips spray on Saturday, only a little is left in the store.",
    severity: "low",
    requestedResource: "Crop protection product",
    createdAt: "2026-10-27T19:05:00+05:30",
    observedAt: "2026-10-27T19:05:00+05:30",
    status: "reviewed",
    language: "en",
  },
  {
    id: "rpt-003",
    kind: "completion",
    inputMode: "demo_sample",
    reporterId: F(7),
    farmId: "farm-05",
    fieldId: "fld-11",
    crop: "sugarcane",
    transcript: "Finished irrigation in sugarcane field",
    severity: "low",
    createdAt: at(0, 7, 55),
    observedAt: at(0, 7, 55),
    status: "reviewed",
    language: "en",
  },
];

/** Build a task log with given late / excused / unverified positions. */
function log(prefix: string, labels: string[], late: number[] = [], excused: Record<number, string> = {}, unverified: number[] = []): TaskLogEntry[] {
  return labels.map((label, i) => ({
    id: `${prefix}-t${i + 1}`,
    label,
    onTime: !late.includes(i),
    verified: !unverified.includes(i),
    excusedReason: excused[i],
  }));
}

const TOMATO_TASKS = ["Transplanting", "Basal fertiliser", "Staking", "Irrigation cycle 1", "Fungicide spray 1", "Top-dress urea", "Fungicide spray 2", "Irrigation cycle 2", "Pest scouting", "Harvest picking 1"];
const ONION_TASKS = ["Transplanting", "Weeding", "Irrigation cycle 1", "Urea split 1", "Thrips spray", "Irrigation cycle 2", "Urea split 2", "Curing"];
const GENERIC_TASKS = ["Land preparation", "Sowing", "Basal fertiliser", "Irrigation", "Weeding", "Plant protection", "Harvest"];

type SeasonSeed = Omit<CropSeasonRecord, "annotations" | "incidents"> & Partial<Pick<CropSeasonRecord, "annotations" | "incidents">>;
const cs = (r: SeasonSeed): CropSeasonRecord => ({ annotations: [], incidents: [], ...r });

const cropSeasons: CropSeasonRecord[] = [
  cs({ id: "cs-01", farmerId: F(1), fieldId: "fld-01", farmId: "farm-01", crop: "tomato", season: "Rabi 2025-26", areaAcres: 6, expectedYieldQ: 660, actualYieldQ: 612, qualityGrade: "B", inputCostINR: 312000, pricePerQINR: 1600, taskLog: log("cs01", TOMATO_TASKS, [5, 8]), incidents: [{ id: "cs01-i1", label: "Leaf curl, Feb", reportedWithinHours: 12, resolved: true }] }),
  cs({ id: "cs-02", farmerId: F(1), fieldId: "fld-01", farmId: "farm-01", crop: "tomato", season: "Kharif 2026", areaAcres: 6, expectedYieldQ: 660, actualYieldQ: 701, qualityGrade: "A", inputCostINR: 335000, pricePerQINR: 1800, taskLog: log("cs02", TOMATO_TASKS, [4, 6]), incidents: [{ id: "cs02-i1", label: "Fruit borer, Sep", reportedWithinHours: 6, resolved: true }] }),
  cs({ id: "cs-03", farmerId: F(2), fieldId: "fld-06", farmId: "farm-03", crop: "tomato", season: "Kharif 2026", areaAcres: 5, expectedYieldQ: 550, actualYieldQ: 468, qualityGrade: "B", inputCostINR: 298000, pricePerQINR: 1800, taskLog: log("cs03", TOMATO_TASKS, [2, 4, 7], { 7: "Canal closure, 9–11 Sep" }), incidents: [{ id: "cs03-i1", label: "Early blight, Sep", reportedWithinHours: 30, resolved: true }] }),
  cs({ id: "cs-04", farmerId: F(2), fieldId: "fld-06", farmId: "farm-03", crop: "tomato", season: "Rabi 2025-26", areaAcres: 5, expectedYieldQ: 550, actualYieldQ: 540, qualityGrade: "A", inputCostINR: 270000, pricePerQINR: 1600, taskLog: log("cs04", TOMATO_TASKS, [3]) }),
  cs({ id: "cs-05", farmerId: F(5), fieldId: "fld-07", farmId: "farm-03", crop: "tomato", season: "Rabi 2025-26", areaAcres: 4, expectedYieldQ: 440, actualYieldQ: 395, qualityGrade: "B", inputCostINR: 236000, pricePerQINR: 1600, taskLog: log("cs05", TOMATO_TASKS, [1, 5, 6], {}, [9]) }),
  cs({ id: "cs-06", farmerId: F(4), fieldId: "fld-05", farmId: "farm-02", crop: "onion", season: "Rabi 2025-26", areaAcres: 8, expectedYieldQ: 960, actualYieldQ: 1010, qualityGrade: "A", inputCostINR: 590000, pricePerQINR: 2100, taskLog: log("cs06", ONION_TASKS, [6]) }),
  cs({ id: "cs-07", farmerId: F(4), fieldId: "fld-08", farmId: "farm-04", crop: "onion", season: "Kharif 2026", areaAcres: 8, expectedYieldQ: 880, actualYieldQ: 790, qualityGrade: "B", inputCostINR: 560000, pricePerQINR: 2400, taskLog: log("cs07", ONION_TASKS, [2, 4], { 4: "Sprayer under repair, 2–4 Sep" }), incidents: [{ id: "cs07-i1", label: "Purple blotch, Aug", reportedWithinHours: 10, resolved: true }] }),
  cs({ id: "cs-08", farmerId: F(2), fieldId: "fld-03", farmId: "farm-01", crop: "onion", season: "Rabi 2025-26", areaAcres: 4, expectedYieldQ: 480, actualYieldQ: 410, qualityGrade: "C", inputCostINR: 330000, pricePerQINR: 2100, taskLog: log("cs08", ONION_TASKS, [1, 3, 5]), incidents: [{ id: "cs08-i1", label: "Thrips outbreak, Jan", reportedWithinHours: 48, resolved: false }] }),
  cs({ id: "cs-09", farmerId: F(6), fieldId: "fld-09", farmId: "farm-04", crop: "onion", season: "Rabi 2025-26", areaAcres: 6, expectedYieldQ: 720, actualYieldQ: 700, qualityGrade: "B", inputCostINR: 420000, pricePerQINR: 2100, taskLog: log("cs09", ONION_TASKS, [4]) }),
  cs({ id: "cs-10", farmerId: F(3), fieldId: "fld-04", farmId: "farm-02", crop: "grapes", season: "Rabi 2025-26", areaAcres: 10, expectedYieldQ: 1000, actualYieldQ: 1080, qualityGrade: "A", inputCostINR: 1500000, pricePerQINR: 5200, taskLog: log("cs10", ["Pruning", "Paste application", "Sulphur round 1", "Sulphur round 2", "Irrigation schedule", "Bunch thinning", "Harvest"], [1]) }),
  cs({ id: "cs-11", farmerId: F(6), fieldId: "fld-09", farmId: "farm-04", crop: "soybean", season: "Kharif 2026", areaAcres: 6, expectedYieldQ: 60, actualYieldQ: 55, qualityGrade: "B", inputCostINR: 95000, pricePerQINR: 4900, taskLog: log("cs11", GENERIC_TASKS, [3]) }),
  cs({ id: "cs-12", farmerId: F(8), fieldId: "fld-12", farmId: "farm-06", crop: "paddy", season: "Kharif 2026", areaAcres: 9, expectedYieldQ: 180, actualYieldQ: null, qualityGrade: null, inputCostINR: 110000, pricePerQINR: 2300, taskLog: log("cs12", GENERIC_TASKS.slice(0, 6), [2]) }),
  cs({ id: "cs-13", farmerId: F(6), fieldId: "fld-10", farmId: "farm-05", crop: "wheat", season: "Rabi 2025-26", areaAcres: 10, expectedYieldQ: 180, actualYieldQ: 171, qualityGrade: "B", inputCostINR: 160000, pricePerQINR: 2425, taskLog: log("cs13", GENERIC_TASKS, [5]) }),
  cs({ id: "cs-14", farmerId: F(5), fieldId: "fld-07", farmId: "farm-03", crop: "chilli", season: "Kharif 2025", areaAcres: 4, expectedYieldQ: 80, actualYieldQ: 86, qualityGrade: "A", inputCostINR: 150000, pricePerQINR: 6200, taskLog: log("cs14", GENERIC_TASKS, []) }),
  cs({ id: "cs-15", farmerId: F(7), fieldId: "fld-11", farmId: "farm-05", crop: "sugarcane", season: "Kharif 2026", areaAcres: 8, expectedYieldQ: null, actualYieldQ: null, qualityGrade: null, inputCostINR: 140000, pricePerQINR: 340, taskLog: log("cs15", GENERIC_TASKS.slice(0, 3)) }),
  cs({ id: "cs-16", farmerId: F(3), fieldId: "fld-04", farmId: "farm-02", crop: "onion", season: "Kharif 2026", areaAcres: 3, expectedYieldQ: 330, actualYieldQ: 318, qualityGrade: "A", inputCostINR: 190000, pricePerQINR: 2400, taskLog: log("cs16", ONION_TASKS, [7]) }),
  cs({ id: "cs-17", farmerId: F(2), fieldId: "fld-03", farmId: "farm-01", crop: "onion", season: "Kharif 2026", areaAcres: 4, expectedYieldQ: 440, actualYieldQ: 402, qualityGrade: "B", inputCostINR: 268000, pricePerQINR: 2400, taskLog: log("cs17", ONION_TASKS, [3, 5], { 3: "Urea delivery delayed by supplier" }) }),
];

/** Season-close dates used to stamp the first score version of each record. */
const SEASON_CLOSE: Record<string, string> = {
  "Kharif 2025": "2025-11-20T18:00:00+05:30",
  "Rabi 2025-26": "2026-04-15T18:00:00+05:30",
  "Kharif 2026": "2026-10-20T18:00:00+05:30",
  "Rabi 2026-27": "2026-10-27T18:00:00+05:30",
};

const REASON_PA: Record<string, string> = {
  "Season closed: harvest and grade recorded": "ਮੌਸਮ ਬੰਦ: ਵਾਢੀ ਅਤੇ ਗ੍ਰੇਡ ਦਰਜ",
  "Season record opened; harvest not recorded yet": "ਮੌਸਮ ਦਾ ਰਿਕਾਰਡ ਖੁੱਲ੍ਹਿਆ; ਵਾਢੀ ਹਾਲੇ ਦਰਜ ਨਹੀਂ",
  "Provisional: first three pickings weighed (640 q)": "ਆਰਜ਼ੀ: ਪਹਿਲੀਆਂ ਤਿੰਨ ਤੁੜਾਈਆਂ ਤੋਲੀਆਂ ਗਈਆਂ (640 ਕੁਇੰਟਲ)",
  "Season closed: final pickings weighed (701 q) and grade A recorded": "ਮੌਸਮ ਬੰਦ: ਆਖ਼ਰੀ ਤੁੜਾਈ ਤੋਲੀ ਗਈ (701 ਕੁਇੰਟਲ) ਅਤੇ ਗ੍ਰੇਡ A ਦਰਜ",
};

const REASON_HI: Record<string, string> = {
  "Season closed: harvest and grade recorded": "मौसम बंद: कटाई और ग्रेड दर्ज",
  "Season record opened; harvest not recorded yet": "मौसम का रिकॉर्ड खुला; कटाई अभी दर्ज नहीं",
  "Provisional: first three pickings weighed (640 q)": "अस्थायी: पहली तीन तुड़ाई तौली गई (640 क्विंटल)",
  "Season closed: final pickings weighed (701 q) and grade A recorded": "मौसम बंद: अंतिम तुड़ाई तौली गई (701 क्विंटल) और ग्रेड A दर्ज",
};

function scoreHistory(): RupeeScoreRecord[] {
  const out: RupeeScoreRecord[] = [];
  const holder = { rupeeScoreRecords: out };
  for (const record of cropSeasons) {
    if (record.id === "cs-03") {
      // Story: the canal-closure delay was first counted against Sunita, then excused on review.
      const before = { ...record, taskLog: record.taskLog.map((t) => ({ ...t, excusedReason: undefined })) };
      out.push(buildScoreRecord(holder, before, SEASON_CLOSE[record.season], "Season closed: harvest and grade recorded"));
      out.push({
        ...buildScoreRecord(holder, record, "2026-10-24T11:20:00+05:30", 'Owner marked "Irrigation cycle 2" late as excused: canal closure 9–11 Sep was outside the farmer\'s control'),
        reasonHi: 'मालिक ने "सिंचाई चक्र 2" की देरी माफ़ की: 9–11 सितंबर नहर बंद थी, जो किसान के बस में नहीं था',
        reasonPa: 'ਮਾਲਕ ਨੇ "ਸਿੰਚਾਈ ਚੱਕਰ 2" ਦੀ ਦੇਰੀ ਮਾਫ਼ ਕੀਤੀ: 9–11 ਸਤੰਬਰ ਨਹਿਰ ਬੰਦ ਸੀ, ਜੋ ਕਿਸਾਨ ਦੇ ਵੱਸ ਵਿੱਚ ਨਹੀਂ ਸੀ',
      });
      continue;
    }
    if (record.id === "cs-02") {
      const provisional = { ...record, actualYieldQ: 640 };
      out.push(buildScoreRecord(holder, provisional, "2026-10-12T18:00:00+05:30", "Provisional: first three pickings weighed (640 q)"));
      out.push(buildScoreRecord(holder, record, SEASON_CLOSE[record.season], "Season closed: final pickings weighed (701 q) and grade A recorded"));
      continue;
    }
    out.push(buildScoreRecord(holder, record, SEASON_CLOSE[record.season], record.actualYieldQ == null ? "Season record opened; harvest not recorded yet" : "Season closed: harvest and grade recorded"));
  }
  return out.map((r) => ({ ...r, reasonHi: r.reasonHi ?? REASON_HI[r.reason], reasonPa: r.reasonPa ?? REASON_PA[r.reason] }));
}

const auditEvents: AuditEvent[] = [
  { id: "aud-001", at: "2026-10-27T17:40:00+05:30", actorId: F(2), action: "report.problem", entity: "rpt-001", summary: "New crop problem report on Field 1 – Canal rows (demo sample)" },
  { id: "aud-002", at: "2026-10-27T17:41:00+05:30", actorId: "system", action: "risk.assessed", entity: "rpt-001", summary: "Risk check flagged nearby tomato and chilli fields for scouting" },
  { id: "aud-003", at: "2026-10-27T18:10:00+05:30", actorId: OWNER_ID, action: "task.created", entity: "tsk-012", summary: 'Created "Scout Field 1 for leaf spots" from a scouting suggestion' },
  { id: "aud-004", at: at(0, 7, 40), actorId: F(2), action: "task.blocked", entity: "tsk-018", summary: "Zinc sulphate application: Blocked, reason: input not available" },
  { id: "aud-005", at: at(0, 7, 55), actorId: F(7), action: "task.done", entity: "tsk-013", summary: "Furrow irrigation: Completed via report rpt-003" },
].reverse();

export function createSeedState(): UrvaraState {
  const base: UrvaraState = {
    schemaVersion: SCHEMA_VERSION,
    now: NOW,
    users: structuredClone(users),
    farms: structuredClone(farms),
    fields: structuredClone(fields),
    tasks: structuredClone(tasks),
    resources: structuredClone(resources),
    reports: structuredClone(reports),
    sensorReadings: sensorReadings(),
    weather: Object.keys(ZONES).map(weatherSnapshot),
    cropSeasons: structuredClone(cropSeasons),
    rupeeScoreRecords: scoreHistory(),
    proposals: [],
    scoutingSuggestions: [],
    auditEvents: structuredClone(auditEvents),
    scenario: { weatherChanged: false, brokenMachineIds: [] },
  };
  // Risk suggestions for the seeded report are computed by the real risk module, as of when it was filed.
  const filedState = { ...base, now: reports[0].createdAt };
  base.scoutingSuggestions = assessReport(filedState, base.reports[0]).map((s, i) => ({
    ...s,
    id: `sct-${String(i + 1).padStart(3, "0")}`,
    ...(s.fieldId === "fld-01" ? { status: "task_created" as const, taskId: "tsk-012" } : {}),
  }));
  return base;
}

export const DEMO_STORY_POINTS = [
  "6 farms, 12 fields, 8 farmers across Nashik district",
  "4 shared machines and 9 input or water stocks",
  "1 unverified tomato leaf-spot report with nearby fields flagged",
  "Repeatable forecast-flip and sprayer-breakdown incidents",
];

