/**
 * Sensing module: latest soil readings per field and the threshold crossings
 * that turn readings into contextual recommendations.
 */
import type { SensorKind, SensorReading, UrvaraState } from "@/types";
import { addHours, ms } from "@/lib/time";
import { blocksOverlapping, weatherFor } from "./scheduler";

export const MOISTURE_LOW = 22;
export const MOISTURE_HIGH = 40;
export const EC_HIGH = 2;
export const PH_RANGE = [6, 7.8] as const;

export const SENSOR_META: Record<SensorKind, { label: string; unit: string; hint: string }> = {
  moisture: { label: "Soil moisture", unit: "% VWC", hint: `Below ${MOISTURE_LOW}% most crops start to stress` },
  ph: { label: "Soil pH", unit: "pH", hint: `${PH_RANGE[0]}–${PH_RANGE[1]} suits these crops` },
  nitrogen: { label: "Nitrogen (N)", unit: "kg/ha", hint: "Available N from the last soil test" },
  phosphorus: { label: "Phosphorus (P)", unit: "kg/ha", hint: "Available P from the last soil test" },
  potassium: { label: "Potassium (K)", unit: "kg/ha", hint: "Available K from the last soil test" },
  ec: { label: "Salinity (EC)", unit: "dS/m", hint: `Above ${EC_HIGH} dS/m can limit yield` },
};

export function readingsFor(state: UrvaraState, fieldId: string, kind: SensorKind): SensorReading[] {
  return state.sensorReadings.filter((r) => r.fieldId === fieldId && r.kind === kind).sort((a, b) => ms(a.at) - ms(b.at));
}

export function latestReading(state: UrvaraState, fieldId: string, kind: SensorKind): SensorReading | undefined {
  const list = readingsFor(state, fieldId, kind);
  return list[list.length - 1];
}

export interface FieldInsight {
  level: "action" | "watch" | "ok";
  title: string;
  detail: string;
}

export function fieldInsights(state: UrvaraState, fieldId: string): FieldInsight[] {
  const field = state.fields.find((f) => f.id === fieldId);
  if (!field) return [];
  const out: FieldInsight[] = [];
  const moisture = latestReading(state, fieldId, "moisture");
  const snapshot = weatherFor(state, field.farmId);
  const rain24 = blocksOverlapping(snapshot, state.now, addHours(state.now, 24)).reduce((s, b) => s + b.rainMm, 0);
  const hasIrrigation = state.tasks.some(
    (t) => t.fieldId === fieldId && t.type === "irrigation" && ["scheduled", "in_progress"].includes(t.status),
  );

  if (moisture && moisture.value < MOISTURE_LOW) {
    if (rain24 >= 8) {
      out.push({ level: "watch", title: "Dry, but rain is coming", detail: `Moisture ${moisture.value}% is below ${MOISTURE_LOW}%, and ${rain24} mm of rain is forecast within 24 h. Hold irrigation and re-check after the rain.` });
    } else {
      out.push({
        level: "action",
        title: "Irrigation recommended",
        detail: `Moisture ${moisture.value}% is below the ${MOISTURE_LOW}% threshold and no meaningful rain is forecast. ${hasIrrigation ? "An irrigation task is already scheduled." : "No irrigation task is scheduled yet."}`,
      });
    }
  } else if (moisture && moisture.value > MOISTURE_HIGH) {
    out.push({ level: "watch", title: "Soil is wet", detail: `Moisture ${moisture.value}% is above ${MOISTURE_HIGH}%. Avoid irrigation and heavy machinery until it drains.` });
  }

  const ec = latestReading(state, fieldId, "ec");
  if (ec && ec.value > EC_HIGH) {
    out.push({ level: "watch", title: "Salinity is high", detail: `EC ${ec.value} dS/m is above ${EC_HIGH} dS/m. Consider a leaching irrigation and confirm with a lab soil test.` });
  }
  const ph = latestReading(state, fieldId, "ph");
  if (ph && (ph.value < PH_RANGE[0] || ph.value > PH_RANGE[1])) {
    out.push({ level: "watch", title: "pH out of range", detail: `pH ${ph.value} is outside ${PH_RANGE[0]}–${PH_RANGE[1]}. Nutrient uptake may suffer; discuss amendments with an agronomist.` });
  }
  const n = latestReading(state, fieldId, "nitrogen");
  if (n && n.value < 200) {
    out.push({ level: "watch", title: "Nitrogen is low", detail: `Available N ${n.value} kg/ha from the last soil test. A top-dress may be needed at the next suitable window.` });
  }
  if (out.length === 0) out.push({ level: "ok", title: "No threshold crossed", detail: "Latest readings are within normal ranges for this crop." });
  return out;
}
