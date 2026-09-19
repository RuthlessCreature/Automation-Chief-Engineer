const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: ArrayBuffer): string {
  const values = new Uint8Array(bytes);
  let binary = "";
  for (const value of values) binary += String.fromCharCode(value);
  return btoa(binary);
}

function fromBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const values = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) values[index] = binary.charCodeAt(index);
  return values.buffer;
}

export async function hashPassword(password: string, salt?: string): Promise<{ salt: string; hash: string }> {
  const actualSalt = salt ?? toBase64(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    // Keep the derivation inside the Workers request CPU budget. The previous 210k
    // setting made remote registration fail before a user row could be created.
    { name: "PBKDF2", hash: "SHA-256", salt: fromBase64(actualSalt), iterations: 100_000 },
    key,
    256,
  );
  return { salt: actualSalt, hash: toBase64(bits) };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const actual = await hashPassword(password, salt);
  const [actualDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual.hash)),
    crypto.subtle.digest("SHA-256", encoder.encode(expectedHash)),
  ]);
  const actualBytes = new Uint8Array(actualDigest);
  const expectedBytes = new Uint8Array(expectedDigest);
  // Both values are SHA-256 digests, hence identical fixed length. Do not use
  // short-circuiting string equality for credential verification.
  let mismatch = 0;
  for (let index = 0; index < actualBytes.length; index += 1) mismatch |= actualBytes[index]! ^ expectedBytes[index]!;
  return mismatch === 0;
}

export function sessionCookie(sessionId: string, expiresAt: Date, secure: boolean): string {
  return `ace_session=${encodeURIComponent(sessionId)}; HttpOnly;${secure ? " Secure;" : ""} SameSite=Lax; Path=/; Expires=${expiresAt.toUTCString()}`;
}

export function clearSessionCookie(secure: boolean): string {
  return `ace_session=; HttpOnly;${secure ? " Secure;" : ""} SameSite=Lax; Path=/; Max-Age=0`;
}

export function readCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  for (const pair of cookie.split(";")) {
    const [key, ...value] = pair.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export function isoNow(): string {
  return new Date().toISOString();
}

// Wrangler emits literal types for configured vars. Reading the runtime binding
// defensively preserves a single source of truth while allowing local dev to
// override APP_ENV without hand-maintaining a second Env interface.
export function isLocalEnvironment(env: Env): boolean {
  return Reflect.get(env as object, "APP_ENV") === "local";
}

export function parseJsonBody(value: string): unknown {
  return JSON.parse(decoder.decode(encoder.encode(value))) as unknown;
}
