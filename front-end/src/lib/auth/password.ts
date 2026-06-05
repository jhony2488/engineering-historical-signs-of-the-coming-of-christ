import { scryptSync, timingSafeEqual, randomBytes } from "crypto";

const KEY_LEN = 64;

/** Formato armazenado: hexHash|hexSalt */
export function hashPassword(password: string, saltHex?: string): string {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN);
  return `${hash.toString("hex")}|${salt.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [hashHex, saltHex] = stored.split("|");
  if (!hashHex || !saltHex || password.length > 256) {
    return false;
  }

  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const derived = scryptSync(password, salt, KEY_LEN);
    if (derived.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
