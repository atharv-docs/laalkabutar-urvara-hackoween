/**
 * Demo-data repository: the deterministic synthetic scenario, persisted in this
 * browser's localStorage. Tabs stay in sync through the `storage` event, so the
 * Owner and Farmer portals can run side by side during a demo.
 */
import type { UrvaraState } from "@/types";
import { createSeedState, SCHEMA_VERSION } from "@/data/seed";
import type { DataRepository } from "./types";

const KEY = "urvara:demo-state";

function read(): UrvaraState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UrvaraState;
    return parsed.schemaVersion === SCHEMA_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

function write(state: UrvaraState) {
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export class LocalDemoRepository implements DataRepository {
  readonly source = "demo" as const;
  readonly description = "Synthetic demo scenario stored in this browser. No real farm or farmer data.";

  async load(): Promise<UrvaraState> {
    const existing = read();
    if (existing) return existing;
    const seeded = createSeedState();
    write(seeded);
    return seeded;
  }

  async save(_prev: UrvaraState, next: UrvaraState): Promise<void> {
    write(next);
  }

  subscribe(_scope: unknown, onChange: (state: UrvaraState) => void): () => void {
    const handler = (event: StorageEvent) => {
      if (event.key !== KEY) return;
      const state = read();
      if (state) onChange(state);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  async reset(): Promise<UrvaraState> {
    const seeded = createSeedState();
    write(seeded);
    return seeded;
  }
}
