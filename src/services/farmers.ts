/**
 * Farmer account administration. Credentials are issued once and only their
 * salted hash is persisted.
 */
import type { Language, UrvaraState, User } from "@/types";
import { nextId } from "@/lib/ids";
import { withAudit } from "./audit";

export function nextLoginId(state: UrvaraState): string {
  const max = state.users
    .filter((u) => u.role === "farmer")
    .map((u) => Number.parseInt(u.loginId.replace(/\D/g, ""), 10))
    .filter(Number.isFinite)
    .reduce((m, n) => Math.max(m, n), 0);
  return `URV-F-${String(max + 1).padStart(4, "0")}`;
}

export interface FarmerDraft {
  name: string;
  village: string;
  language: Language;
  fieldIds: string[];
}

export function validateFarmerDraft(state: UrvaraState, draft: FarmerDraft): Partial<Record<keyof FarmerDraft, string>> {
  const errors: Partial<Record<keyof FarmerDraft, string>> = {};
  if (draft.name.trim().length < 3) errors.name = "Enter the farmer's full name (at least 3 letters).";
  else if (state.users.some((u) => u.name.toLowerCase() === draft.name.trim().toLowerCase()))
    errors.name = "A user with this name already exists. Add the village or a middle name to tell them apart.";
  if (!draft.village.trim()) errors.village = "Enter the village so the team can recognise them.";
  return errors;
}

export function createFarmer(
  state: UrvaraState,
  draft: FarmerDraft,
  credentialHash: string,
  actorId: string,
  loginId = nextLoginId(state),
): { state: UrvaraState; user: User } {
  const farmIds = [...new Set(draft.fieldIds.map((id) => state.fields.find((f) => f.id === id)?.farmId).filter(Boolean) as string[])];
  const user: User = {
    id: nextId("usr-f", state.users.filter((u) => u.id.startsWith("usr-f"))),
    name: draft.name.trim(),
    role: "farmer",
    loginId,
    status: "invited",
    farmIds,
    fieldIds: draft.fieldIds,
    language: draft.language,
    village: draft.village.trim(),
    credentialHash,
    credentialIssuedAt: state.now,
    createdAt: state.now,
  };
  const next = withAudit({ ...state, users: [...state.users, user] }, actorId, "farmer.created", user.id, `Created ${user.name} (${loginId}) and issued a temporary credential`);
  return { state: next, user };
}

export function setAssignments(state: UrvaraState, userId: string, fieldIds: string[], actorId: string): UrvaraState {
  const user = state.users.find((u) => u.id === userId);
  if (!user) return state;
  const farmIds = [...new Set(fieldIds.map((id) => state.fields.find((f) => f.id === id)?.farmId).filter(Boolean) as string[])];
  const users = state.users.map((u) => (u.id === userId ? { ...u, fieldIds, farmIds } : u));
  const names = fieldIds.map((id) => {
    const f = state.fields.find((x) => x.id === id);
    const farm = state.farms.find((x) => x.id === f?.farmId);
    return `${farm?.name} / ${f?.name}`;
  });
  return withAudit({ ...state, users }, actorId, "farmer.assignments", userId, `${user.name} assigned to ${names.length ? names.join(", ") : "no fields"}`);
}

export function setFarmerStatus(state: UrvaraState, userId: string, status: User["status"], actorId: string): UrvaraState {
  const user = state.users.find((u) => u.id === userId);
  if (!user || user.status === status) return state;
  const users = state.users.map((u) => (u.id === userId ? { ...u, status } : u));
  return withAudit({ ...state, users }, actorId, `farmer.${status}`, userId, `${user.name} ${status === "deactivated" ? "deactivated" : status === "active" ? "reactivated" : "invited"}`);
}

export function reissueCredential(state: UrvaraState, userId: string, credentialHash: string, actorId: string): UrvaraState {
  const user = state.users.find((u) => u.id === userId);
  if (!user) return state;
  const users = state.users.map((u) => (u.id === userId ? { ...u, credentialHash, credentialIssuedAt: state.now } : u));
  return withAudit({ ...state, users }, actorId, "farmer.credential_reissued", userId, `New temporary credential issued to ${user.name}; the old one no longer works`);
}

export function markFirstLogin(state: UrvaraState, userId: string): UrvaraState {
  const user = state.users.find((u) => u.id === userId);
  if (!user || user.status !== "invited") return state;
  const users = state.users.map((u) => (u.id === userId ? { ...u, status: "active" as const } : u));
  return withAudit({ ...state, users }, userId, "farmer.first_login", userId, `${user.name} signed in for the first time`);
}

export function setLanguage(state: UrvaraState, userId: string, language: Language): UrvaraState {
  return { ...state, users: state.users.map((u) => (u.id === userId ? { ...u, language } : u)) };
}
