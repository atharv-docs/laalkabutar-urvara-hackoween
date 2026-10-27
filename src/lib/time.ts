/**
 * Time helpers. Urvara runs on an explicit demo clock (state.now) in IST so the
 * judging story is identical every time; nothing reads Date.now() for domain logic.
 */

const IST_OFFSET_MIN = 330;
export const TIME_ZONE = "Asia/Kolkata";

/** Serialise a Date as an ISO string pinned to +05:30. */
export function toIST(date: Date): string {
  const shifted = new Date(date.getTime() + IST_OFFSET_MIN * 60_000);
  return shifted.toISOString().replace(/\.\d{3}Z$/, "+05:30");
}

export function ms(iso: string): number {
  return new Date(iso).getTime();
}

export function addHours(iso: string, hours: number): string {
  return toIST(new Date(ms(iso) + hours * 3_600_000));
}

export function addDays(iso: string, days: number): string {
  return addHours(iso, days * 24);
}

/** IST date `YYYY-MM-DD` for an instant. */
export function istDate(iso: string): string {
  return toIST(new Date(iso)).slice(0, 10);
}

/** Build an IST instant from a base day offset and a local hour. */
export function atLocal(baseIso: string, dayOffset: number, hour: number, minute = 0): string {
  const day = istDate(addDays(baseIso, dayOffset));
  return `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`;
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string, bufferHours = 0): boolean {
  const buf = bufferHours * 3_600_000;
  return ms(aStart) < ms(bEnd) + buf && ms(bStart) < ms(aEnd) + buf;
}

export function hoursBetween(a: string, b: string): number {
  return (ms(b) - ms(a)) / 3_600_000;
}

const dayFmt = new Intl.DateTimeFormat("en-IN", { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true });
const weekdayFmt = new Intl.DateTimeFormat("en-IN", { timeZone: TIME_ZONE, weekday: "short" });
const hiDayFmt = new Intl.DateTimeFormat("hi-IN", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "short" });
const hiTimeFmt = new Intl.DateTimeFormat("hi-IN", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true });

export function fmtDay(iso: string): string {
  return dayFmt.format(new Date(iso));
}

export function fmtTime(iso: string): string {
  return timeFmt.format(new Date(iso)).replace(" ", " ");
}

export function fmtWeekday(iso: string): string {
  return weekdayFmt.format(new Date(iso));
}

export function fmtDayTime(iso: string): string {
  return `${fmtDay(iso)}, ${fmtTime(iso)}`;
}

export function fmtRange(start: string, end: string): string {
  const sameDay = istDate(start) === istDate(end);
  return sameDay ? `${fmtDay(start)}, ${fmtTime(start)}–${fmtTime(end)}` : `${fmtDayTime(start)} – ${fmtDayTime(end)}`;
}

const longDateFmt = { en: new Intl.DateTimeFormat("en-IN", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" }), hi: new Intl.DateTimeFormat("hi-IN", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" }) };

/** "Wednesday, 28 October" / "बुधवार, 28 अक्टूबर". */
export function fmtLongDateLocalised(iso: string, lang: "en" | "hi"): string {
  return longDateFmt[lang].format(new Date(iso));
}

export function fmtDayLocalised(iso: string, lang: "en" | "hi"): string {
  return lang === "hi" ? hiDayFmt.format(new Date(iso)) : dayFmt.format(new Date(iso));
}

export function fmtTimeLocalised(iso: string, lang: "en" | "hi"): string {
  return lang === "hi" ? hiTimeFmt.format(new Date(iso)) : fmtTime(iso);
}

/** "today", "tomorrow", or the weekday, relative to the demo clock. */
export function relativeDay(iso: string, now: string): "today" | "tomorrow" | "yesterday" | string {
  const diff = Math.round((ms(`${istDate(iso)}T00:00:00+05:30`) - ms(`${istDate(now)}T00:00:00+05:30`)) / 86_400_000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  return fmtDay(iso);
}

/** Human age of a reading relative to the demo clock, e.g. "40 min ago". */
export function ageLabel(iso: string, now: string): string {
  const mins = Math.round((ms(now) - ms(iso)) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

export function isStale(iso: string, now: string, maxHours: number): boolean {
  return hoursBetween(iso, now) > maxHours;
}
