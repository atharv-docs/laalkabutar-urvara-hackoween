/**
 * Answers practical farmer questions from current known data only, and always
 * says where the answer came from and how old that data is.
 */
import type { DataProvenance, Language, UrvaraState, User } from "@/types";
import type { ParsedUtterance } from "./intent";
import { addHours, ageLabel, fmtDayLocalised, fmtTimeLocalised, ms } from "@/lib/time";
import { blocksOverlapping, weatherFor } from "./scheduler";
import { latestReading, MOISTURE_LOW } from "./soil";

export interface AssistantAnswer {
  text: string;
  sources: { label: string; at: string; provenance: DataProvenance }[];
  /** True when the system could not answer and routed the question to the owner. */
  forwarded: boolean;
}

const t = (lang: Language, en: string, hi: string) => (lang === "hi" ? hi : en);

export function answerQuestion(state: UrvaraState, user: User, parsed: ParsedUtterance, lang: Language): AssistantAnswer {
  const fields = state.fields.filter((f) => user.fieldIds.includes(f.id));
  const field = fields.find((f) => f.id === parsed.fieldId) ?? fields[0];

  // "When will the sprayer/tractor reach my farm?"
  if (parsed.requestedResource && ["Sprayer", "Tractor", "Harvester"].includes(parsed.requestedResource)) {
    const category = parsed.requestedResource.toLowerCase();
    const machineIds = state.resources.filter((r) => r.kind === "machine" && r.category === category).map((r) => r.id);
    const next = state.tasks
      .filter(
        (task) =>
          user.farmIds.includes(task.farmId) &&
          ["scheduled", "in_progress"].includes(task.status) &&
          task.machineIds.some((m) => machineIds.includes(m)) &&
          ms(task.end) > ms(state.now),
      )
      .sort((a, b) => ms(a.start) - ms(b.start))[0];
    if (!next) {
      return {
        text: t(
          lang,
          `No ${category} is booked for your fields right now. I have sent your question to the owner.`,
          `अभी आपके खेतों के लिए कोई ${parsed.requestedResource === "Sprayer" ? "स्प्रेयर" : parsed.requestedResource === "Tractor" ? "ट्रैक्टर" : "हार्वेस्टर"} बुक नहीं है। आपका सवाल मालिक को भेज दिया गया है।`,
        ),
        sources: [{ label: "Task schedule", at: state.now, provenance: "seeded" }],
        forwarded: true,
      };
    }
    const machine = state.resources.find((r) => next.machineIds.includes(r.id) && machineIds.includes(r.id))!;
    const fieldName = state.fields.find((f) => f.id === next.fieldId)?.name ?? "";
    return {
      text: t(
        lang,
        `${machine.name} is booked for ${fieldName} on ${fmtDayLocalised(next.start, "en")} at ${fmtTimeLocalised(next.start, "en")} for "${next.title}".`,
        `${machine.name} ${fmtDayLocalised(next.start, "hi")} को ${fmtTimeLocalised(next.start, "hi")} बजे ${fieldName} पर "${next.title}" के लिए आएगा।`,
      ),
      sources: [{ label: `Schedule for ${machine.name}`, at: state.now, provenance: "seeded" }],
      forwarded: false,
    };
  }

  // "Should we irrigate today?"
  if (parsed.taskType === "irrigation" && field) {
    const moisture = latestReading(state, field.id, "moisture");
    const snapshot = weatherFor(state, field.farmId);
    const rain24 = blocksOverlapping(snapshot, state.now, addHours(state.now, 24)).reduce((s, b) => s + b.rainMm, 0);
    const sources: AssistantAnswer["sources"] = [];
    if (moisture) sources.push({ label: `Soil moisture probe, ${field.name}`, at: moisture.at, provenance: moisture.source });
    if (snapshot) sources.push({ label: `${snapshot.provider} forecast`, at: snapshot.issuedAt, provenance: snapshot.source });
    if (!moisture) {
      return { text: t(lang, "There is no soil moisture reading for this field yet. I have asked the owner.", "इस खेत की मिट्टी की नमी का कोई रीडिंग नहीं है। मालिक से पूछा गया है।"), sources, forwarded: true };
    }
    const age = ageLabel(moisture.at, state.now);
    if (rain24 >= 8) {
      return {
        text: t(
          lang,
          `No need to irrigate ${field.name} today. About ${rain24} mm of rain is expected in the next 24 hours. Soil moisture is ${moisture.value}% (${age}).`,
          `${field.name} में आज सिंचाई की जरूरत नहीं है। अगले 24 घंटे में लगभग ${rain24} मिमी बारिश की संभावना है। मिट्टी की नमी ${moisture.value}% है।`,
        ),
        sources,
        forwarded: false,
      };
    }
    if (moisture.value < MOISTURE_LOW) {
      return {
        text: t(
          lang,
          `Yes, ${field.name} is dry: soil moisture is ${moisture.value}% (below ${MOISTURE_LOW}%), measured ${age}. No rain is expected in the next 24 hours.`,
          `हाँ, ${field.name} सूखा है: मिट्टी की नमी ${moisture.value}% है (${MOISTURE_LOW}% से कम)। अगले 24 घंटे में बारिश की संभावना नहीं है।`,
        ),
        sources,
        forwarded: false,
      };
    }
    return {
      text: t(
        lang,
        `Not yet. Soil moisture in ${field.name} is ${moisture.value}% (${age}), which is enough for today. Check again tomorrow morning.`,
        `अभी नहीं। ${field.name} में मिट्टी की नमी ${moisture.value}% है, जो आज के लिए काफी है। कल सुबह फिर देखें।`,
      ),
      sources,
      forwarded: false,
    };
  }

  // Anything else: forward to the owner, with the rain outlook as useful context.
  if (field) {
    const snapshot = weatherFor(state, field.farmId);
    const next = blocksOverlapping(snapshot, state.now, addHours(state.now, 48));
    const wettest = next.reduce<(typeof next)[number] | undefined>((w, b) => (!w || b.rainProb > w.rainProb ? b : w), undefined);
    if (snapshot && wettest) {
      return {
        text: t(
          lang,
          `I couldn't find a direct answer to that, so I have sent it to the owner. For reference: the highest rain chance in the next 48 hours is ${wettest.rainProb}% on ${fmtDayLocalised(wettest.start, "en")}.`,
          `इसका सीधा जवाब नहीं मिला, इसलिए सवाल मालिक को भेज दिया गया है। अगले 48 घंटे में बारिश की सबसे ज्यादा संभावना ${wettest.rainProb}% है (${fmtDayLocalised(wettest.start, "hi")})।`,
        ),
        sources: [{ label: `${snapshot.provider} forecast`, at: snapshot.issuedAt, provenance: snapshot.source }],
        forwarded: true,
      };
    }
  }

  return {
    text: t(lang, "I couldn't answer that from the farm data, so I have sent your question to the owner.", "इसका जवाब खेत के डेटा से नहीं मिला, इसलिए सवाल मालिक को भेज दिया गया है।"),
    sources: [],
    forwarded: true,
  };
}
