/**
 * Firestore repository. One collection per entity type plus a `meta/state`
 * document for the demo clock and scenario flags. Farmer sessions only query
 * records they are allowed to read under firestore.rules.
 */
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  writeBatch,
  type Query,
  type DocumentData,
} from "firebase/firestore";
import type { CollectionName, UrvaraState } from "@/types";
import { getFirebase } from "@/lib/firebase";
import { createSeedState, SCHEMA_VERSION } from "@/data/seed";
import { COLLECTIONS, diffState, type DataRepository, type LoadScope } from "./types";

const META = ["meta", "state"] as const;
const BATCH_LIMIT = 400;

/** Firestore rejects `undefined`; JSON round-trip drops those keys. */
const clean = <T,>(value: T): DocumentData => JSON.parse(JSON.stringify(value));

export class EmptyDatabaseError extends Error {
  constructor() {
    super("Firestore has no Urvara data yet. Seed it with `npm run seed:firestore`, or sign in as the owner and reset the demo.");
  }
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Queries for one collection under the given scope; farmers get filtered queries only. */
function queriesFor(name: CollectionName, scope: LoadScope | null): Query[] | null {
  const { db } = getFirebase();
  const col = collection(db, name);
  if (!scope || scope.role === "owner") return [query(col)];
  const inList = (field: string, ids: string[]) => (ids.length ? chunk(ids, 30).map((part) => query(col, where(field, "in", part))) : []);
  switch (name) {
    case "users":
      return [query(col, where(documentId(), "==", scope.userId))];
    case "farms":
      return inList(documentId() as unknown as string, scope.farmIds);
    case "fields":
      return inList(documentId() as unknown as string, scope.fieldIds);
    case "tasks":
    case "reports":
      return [query(col, where(name === "tasks" ? "assigneeId" : "reporterId", "==", scope.userId))];
    case "cropSeasons":
    case "rupeeScoreRecords":
      return [query(col, where("farmerId", "==", scope.userId))];
    case "sensorReadings":
    case "scoutingSuggestions":
      return inList("fieldId", scope.fieldIds);
    case "resources":
    case "weather":
      return [query(col)];
    default:
      return null; // proposals and audit events are owner-only
  }
}

async function loadMeta() {
  const { db } = getFirebase();
  const snap = await getDoc(doc(db, ...META));
  return snap.exists() ? (snap.data() as Pick<UrvaraState, "schemaVersion" | "now" | "scenario">) : null;
}

export class FirestoreRepository implements DataRepository {
  readonly source = "live" as const;
  readonly description = "Firebase Firestore. Records are still synthetic demo data unless your team has replaced them.";

  async load(scope: LoadScope | null): Promise<UrvaraState> {
    const meta = await loadMeta();
    if (!meta) throw new EmptyDatabaseError();
    const state = { schemaVersion: meta.schemaVersion, now: meta.now, scenario: meta.scenario } as UrvaraState;
    await Promise.all(
      COLLECTIONS.map(async (name) => {
        const queries = queriesFor(name, scope) ?? [];
        const snaps = await Promise.all(queries.map((q) => getDocs(q)));
        (state as unknown as Record<string, unknown[]>)[name] = snaps.flatMap((s) => s.docs.map((d) => d.data()));
      }),
    );
    return state;
  }

  async save(prev: UrvaraState, next: UrvaraState): Promise<void> {
    const { db } = getFirebase();
    const ops: ((batch: ReturnType<typeof writeBatch>) => void)[] = [];
    for (const diff of diffState(prev, next)) {
      for (const item of diff.upserts) ops.push((b) => b.set(doc(db, diff.collection, item.id), clean(item)));
      for (const id of diff.deletes) ops.push((b) => b.delete(doc(db, diff.collection, id)));
    }
    if (prev.now !== next.now || prev.scenario !== next.scenario) {
      ops.push((b) => b.set(doc(db, ...META), clean({ schemaVersion: next.schemaVersion, now: next.now, scenario: next.scenario })));
    }
    for (const part of chunk(ops, BATCH_LIMIT)) {
      const batch = writeBatch(db);
      part.forEach((op) => op(batch));
      await batch.commit();
    }
  }

  subscribe(scope: LoadScope | null, onChange: (state: UrvaraState) => void): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let first = true;
    const reload = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        this.load(scope).then(onChange).catch(() => undefined);
      }, 300);
    };
    const unsubs = COLLECTIONS.flatMap((name) => (queriesFor(name, scope) ?? []).map((q) => onSnapshot(q, () => (first ? undefined : reload()))));
    first = false;
    return () => {
      clearTimeout(timer);
      unsubs.forEach((u) => u());
    };
  }

  /** Owner-only under the security rules: wipe and re-seed the synthetic scenario. */
  async reset(): Promise<UrvaraState> {
    const { db } = getFirebase();
    const seeded = createSeedState();
    const ops: ((batch: ReturnType<typeof writeBatch>) => void)[] = [];
    for (const name of COLLECTIONS) {
      const existing = await getDocs(collection(db, name));
      const keep = new Set((seeded[name] as { id: string }[]).map((x) => x.id));
      existing.docs.filter((d) => !keep.has(d.id)).forEach((d) => ops.push((b) => b.delete(d.ref)));
      for (const item of seeded[name] as { id: string }[]) ops.push((b) => b.set(doc(db, name, item.id), clean(item)));
    }
    ops.push((b) => b.set(doc(db, ...META), clean({ schemaVersion: SCHEMA_VERSION, now: seeded.now, scenario: seeded.scenario })));
    for (const part of chunk(ops, BATCH_LIMIT)) {
      const batch = writeBatch(db);
      part.forEach((op) => op(batch));
      await batch.commit();
    }
    return seeded;
  }
}
