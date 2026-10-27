import { isFirebaseConfigured } from "@/lib/firebase";
import type { DataRepository } from "./types";
import { LocalDemoRepository } from "./localDemoRepository";
import { FirestoreRepository } from "./firestoreRepository";

export type { DataRepository, DataSource, LoadScope } from "./types";
export { EmptyDatabaseError } from "./firestoreRepository";

/** The one place that decides where data comes from. The UI shows the result, never guesses it. */
export function createRepository(): DataRepository {
  return isFirebaseConfigured() ? new FirestoreRepository() : new LocalDemoRepository();
}
