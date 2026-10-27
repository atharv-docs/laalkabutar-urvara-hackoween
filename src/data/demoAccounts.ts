/**
 * Passwords for the seeded demo accounts, keyed by login ID. These are
 * synthetic demo credentials (also listed in DEMO_CREDENTIALS.md); demo mode
 * checks them in the browser and `npm run seed:firestore` gives them to
 * Firebase Auth. Farmers added later get a one-time code instead.
 */
export const DEMO_PASSWORDS: Record<string, string> = {
  "URV-O-0001": "Anjali@2026",
  "URV-F-0001": "Ramesh@1001",
  "URV-F-0002": "Sunita@1002",
  "URV-F-0003": "Vikas@1003",
  "URV-F-0004": "Lakshmi@1004",
  "URV-F-0005": "Arjun@1005",
  "URV-F-0006": "Kavita@1006",
  "URV-F-0007": "Sanjay@1007",
  "URV-F-0008": "Pooja@1008",
};

export function demoPasswordFor(loginId: string): string | undefined {
  return DEMO_PASSWORDS[loginId.trim().toUpperCase()];
}
