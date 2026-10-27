/**
 * Demo temporary credentials. Only a salted SHA-256 digest is ever stored; the
 * plaintext is shown to the owner once and then discarded.
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTempCredential(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export async function hashCredential(loginId: string, credential: string): Promise<string> {
  const data = new TextEncoder().encode(`urvara:${loginId.toUpperCase()}:${credential.trim().toUpperCase()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
