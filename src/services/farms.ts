/**
 * Farm and field administration.
 */
import type { CropStage, CropType, UrvaraState } from "@/types";
import { nextId } from "@/lib/ids";
import { withAudit } from "./audit";

export interface FieldDraft {
  farmId: string;
  name: string;
  crop: CropType;
  stage: CropStage;
  areaAcres: number;
  plantedOn: string;
  soilType: string;
}

export function validateFieldDraft(state: UrvaraState, draft: FieldDraft, editingId?: string): Partial<Record<keyof FieldDraft, string>> {
  const errors: Partial<Record<keyof FieldDraft, string>> = {};
  if (!state.farms.some((f) => f.id === draft.farmId)) errors.farmId = "Choose a farm.";
  if (draft.name.trim().length < 2) errors.name = "Give the field a name, e.g. \"Field 4 – Well side\".";
  else if (state.fields.some((f) => f.farmId === draft.farmId && f.id !== editingId && f.name.toLowerCase() === draft.name.trim().toLowerCase()))
    errors.name = "This farm already has a field with that name.";
  if (!(draft.areaAcres > 0) || draft.areaAcres > 500) errors.areaAcres = "Enter the area in acres (for example 4.5).";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.plantedOn)) errors.plantedOn = "Enter the planting or sowing date.";
  return errors;
}

export function saveField(state: UrvaraState, draft: FieldDraft, actorId: string, editingId?: string): { state: UrvaraState; fieldId: string } {
  if (editingId) {
    const before = state.fields.find((f) => f.id === editingId)!;
    const fields = state.fields.map((f) => (f.id === editingId ? { ...f, ...draft, name: draft.name.trim() } : f));
    const changes = (["crop", "stage", "areaAcres", "name"] as const).filter((k) => before[k] !== (k === "name" ? draft.name.trim() : draft[k]));
    return {
      state: withAudit({ ...state, fields }, actorId, "field.updated", editingId, `Updated ${draft.name.trim()}${changes.length ? ` (${changes.join(", ")})` : ""}`),
      fieldId: editingId,
    };
  }
  const id = nextId("fld", state.fields);
  const field = { id, ...draft, name: draft.name.trim() };
  const farm = state.farms.find((f) => f.id === draft.farmId);
  const farms = state.farms.map((f) => (f.id === draft.farmId ? { ...f, areaAcres: Math.round((f.areaAcres + draft.areaAcres) * 10) / 10 } : f));
  return {
    state: withAudit({ ...state, fields: [...state.fields, field], farms }, actorId, "field.created", id, `Added ${field.name} to ${farm?.name}`),
    fieldId: id,
  };
}
