import type { CollectionName, Role, UrvaraState } from "@/types";

export type DataSource = "demo" | "live";

/** What the signed-in user is allowed to load. Farmers only ever query their own records. */
export interface LoadScope {
  role: Role;
  userId: string;
  farmIds: string[];
  fieldIds: string[];
}

export interface DataRepository {
  readonly source: DataSource;
  /** Human description for the data-source indicator. */
  readonly description: string;
  load(scope: LoadScope | null): Promise<UrvaraState>;
  /** Persist every entity whose reference changed between prev and next. */
  save(prev: UrvaraState, next: UrvaraState): Promise<void>;
  subscribe(scope: LoadScope | null, onChange: (state: UrvaraState) => void): () => void;
  reset(): Promise<UrvaraState>;
}

export const COLLECTIONS: CollectionName[] = [
  "users",
  "farms",
  "fields",
  "tasks",
  "resources",
  "reports",
  "sensorReadings",
  "weather",
  "cropSeasons",
  "rupeeScoreRecords",
  "proposals",
  "scoutingSuggestions",
  "auditEvents",
];

export interface CollectionDiff {
  collection: CollectionName;
  upserts: { id: string }[];
  deletes: string[];
}

/** Reference-based diff: domain services return new objects only for entities they change. */
export function diffState(prev: UrvaraState, next: UrvaraState): CollectionDiff[] {
  const out: CollectionDiff[] = [];
  for (const collection of COLLECTIONS) {
    const before = prev[collection] as { id: string }[];
    const after = next[collection] as { id: string }[];
    if (before === after) continue;
    const prevById = new Map(before.map((item) => [item.id, item]));
    const nextIds = new Set(after.map((item) => item.id));
    const upserts = after.filter((item) => prevById.get(item.id) !== item);
    const deletes = before.filter((item) => !nextIds.has(item.id)).map((item) => item.id);
    if (upserts.length || deletes.length) out.push({ collection, upserts, deletes });
  }
  return out;
}
