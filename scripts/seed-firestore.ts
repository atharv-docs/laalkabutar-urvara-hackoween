/**
 * Seeds Firestore and Firebase Auth with the deterministic synthetic scenario.
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY in the environment (see .env.example).
 * Every seeded account gets URVARA_DEMO_PASSWORD and a role custom claim.
 *
 *   FIREBASE_SERVICE_ACCOUNT_KEY="$(cat service-account.json)" npm run seed:firestore
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { createSeedState } from "../src/data/seed";
import { COLLECTIONS } from "../src/repositories/types";
import { loginIdToEmail } from "../src/lib/firebase";

const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!key) {
  console.error("Set FIREBASE_SERVICE_ACCOUNT_KEY to the service-account JSON first.");
  process.exit(1);
}
const password = process.env.URVARA_DEMO_PASSWORD ?? "urvara-demo-2026";

const app = initializeApp({ credential: cert(JSON.parse(key)) });
const db = getFirestore(app);
const auth = getAuth(app);
const state = createSeedState();
const clean = (v: unknown) => JSON.parse(JSON.stringify(v));

async function main() {
  for (const user of state.users) {
    const email = loginIdToEmail(user.loginId);
    try {
      await auth.getUser(user.id);
      await auth.updateUser(user.id, { email, password, displayName: user.name });
    } catch {
      await auth.createUser({ uid: user.id, email, password, displayName: user.name });
    }
    await auth.setCustomUserClaims(user.id, { role: user.role });
  }
  let batch = db.batch();
  let ops = 0;
  const flush = async () => {
    if (ops) await batch.commit();
    batch = db.batch();
    ops = 0;
  };
  for (const name of COLLECTIONS) {
    const existing = await db.collection(name).listDocuments();
    for (const ref of existing) {
      batch.delete(ref);
      if (++ops >= 400) await flush();
    }
    await flush();
    for (const item of state[name] as { id: string }[]) {
      batch.set(db.collection(name).doc(item.id), clean(item));
      if (++ops >= 400) await flush();
    }
  }
  batch.set(db.collection("meta").doc("state"), clean({ schemaVersion: state.schemaVersion, now: state.now, scenario: state.scenario }));
  ops++;
  await flush();
  console.log(`Seeded ${COLLECTIONS.length} collections and ${state.users.length} demo accounts (password: ${password}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
