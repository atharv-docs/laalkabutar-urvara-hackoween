/**
 * Deterministic, collision-free IDs derived from the existing collection, so a
 * replayed demo produces the same IDs every time.
 */
export function nextId(prefix: string, existing: { id: string }[]): string {
  let max = 0;
  for (const item of existing) {
    if (!item.id.startsWith(`${prefix}-`)) continue;
    const n = Number.parseInt(item.id.slice(prefix.length + 1), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}
