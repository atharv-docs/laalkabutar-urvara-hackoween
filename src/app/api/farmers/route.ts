/**
 * Live-mode farmer creation. Verifies the caller is an owner (custom claim set
 * by the Admin SDK, never by the browser), creates the Firebase Auth account,
 * sets the farmer role claim and writes the users/{uid} profile.
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY (JSON) on the server; demo mode never calls this.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function admin() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) return null;
  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  const app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(key)) });
  const { getAuth } = await import("firebase-admin/auth");
  const { getFirestore } = await import("firebase-admin/firestore");
  return { auth: getAuth(app), db: getFirestore(app) };
}

export async function POST(request: Request) {
  const sdk = await admin();
  if (!sdk) return NextResponse.json({ error: "Server is not configured with FIREBASE_SERVICE_ACCOUNT_KEY." }, { status: 501 });

  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  let caller;
  try {
    caller = await sdk.auth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
  }
  if (caller.role !== "owner") return NextResponse.json({ error: "Only an owner can add farmers." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { name?: string; village?: string; language?: string; fieldIds?: string[]; loginId?: string; password?: string } | null;
  if (!body?.name || !body.loginId || !body.password || !/^URV-F-\d{4}$/.test(body.loginId)) {
    return NextResponse.json({ error: "Name, login ID and code are required." }, { status: 400 });
  }
  const fieldIds = Array.isArray(body.fieldIds) ? body.fieldIds.filter((x) => typeof x === "string") : [];
  const fieldDocs = await Promise.all(fieldIds.map((id) => sdk.db.collection("fields").doc(id).get()));
  const farmIds = [...new Set(fieldDocs.filter((d) => d.exists).map((d) => d.get("farmId") as string))];

  const created = await sdk.auth.createUser({
    email: `${body.loginId.toLowerCase()}@users.urvara.app`,
    password: body.password,
    displayName: body.name,
  });
  await sdk.auth.setCustomUserClaims(created.uid, { role: "farmer" });
  const now = new Date().toISOString();
  await sdk.db.collection("users").doc(created.uid).set({
    id: created.uid,
    name: body.name.trim(),
    role: "farmer",
    loginId: body.loginId,
    status: "invited",
    farmIds,
    fieldIds,
    language: body.language === "en" || body.language === "pa" ? body.language : "hi",
    village: body.village?.trim() ?? "",
    credentialIssuedAt: now,
    createdAt: now,
  });
  const audit = sdk.db.collection("auditEvents").doc();
  await audit.set({
    id: audit.id,
    at: now,
    actorId: caller.uid,
    action: "farmer.created",
    entity: created.uid,
    summary: `Created ${body.name.trim()} (${body.loginId}) and issued a temporary password`,
  });
  return NextResponse.json({ uid: created.uid });
}
