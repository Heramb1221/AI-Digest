// lib/crypto.ts
// AES-256-GCM symmetric encryption for sensitive values stored in the database.
// Used for: BYOK Gemini API keys.
//
// Why AES-256-GCM?
//   - Authenticated encryption — detects tampering (unlike AES-CBC)
//   - 256-bit key — NIST-approved, quantum-resistant margin
//   - Random IV per encryption — same plaintext encrypts differently each time
//
// Key derivation:
//   ENCRYPTION_KEY env var must be a 64-character hex string (32 bytes).
//   Generate with: openssl rand -hex 32
//
// Storage format: "<iv_hex>:<ciphertext_hex>"
//   Both parts stored in a single DB column as one string.

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256; // bits
const IV_LENGTH  = 12;  // bytes — recommended for GCM

// ─── Key loading ─────────────────────────────────────────────────────────────

let _key: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (_key) return _key;

  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey || hexKey.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string. " +
      "Generate with: openssl rand -hex 32"
    );
  }

  const keyBytes = Buffer.from(hexKey, "hex");

  _key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // not extractable
    ["encrypt", "decrypt"]
  );

  return _key;
}

// ─── Encrypt ──────────────────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string.
 * Returns "<iv_hex>:<ciphertext_hex>" — safe to store in a DB text column.
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv  = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  const ivHex         = Buffer.from(iv).toString("hex");
  const ciphertextHex = Buffer.from(cipherBuffer).toString("hex");

  return `${ivHex}:${ciphertextHex}`;
}

// ─── Decrypt ──────────────────────────────────────────────────────────────────

/**
 * Decrypts a value produced by encrypt().
 * Returns null if the value is null/empty (key not set).
 * Throws if the ciphertext is malformed or the key is wrong.
 */
export async function decrypt(stored: string | null): Promise<string | null> {
  if (!stored) return null;

  const parts = stored.split(":");
  if (parts.length !== 2) {
    // Legacy plaintext (before encryption was added) — return as-is.
    // This allows a safe migration from unencrypted to encrypted storage.
    return stored;
  }

  const [ivHex, ciphertextHex] = parts;
  const key         = await getKey();
  const iv          = Buffer.from(ivHex,         "hex");
  const ciphertext  = Buffer.from(ciphertextHex, "hex");

  try {
    const plainBuffer = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(plainBuffer);
  } catch {
    throw new Error("Decryption failed — wrong key or corrupted ciphertext");
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Safely encrypt a nullable value — pass-through for null.
 */
export async function encryptIfPresent(value: string | null): Promise<string | null> {
  if (!value) return null;
  return encrypt(value);
}

/**
 * Safely decrypt a nullable value — pass-through for null.
 */
export async function decryptIfPresent(value: string | null): Promise<string | null> {
  if (!value) return null;
  return decrypt(value);
}
