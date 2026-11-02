const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/**
 * Short random id. Uses `crypto.getRandomValues`, which (unlike `randomUUID`)
 * is also available on insecure origins such as a LAN IP during development.
 */
export function createId(prefix?: string): string {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  let id = "";
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return prefix ? `${prefix}_${id}` : id;
}
