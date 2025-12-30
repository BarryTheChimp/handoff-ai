import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Gets the encryption key from environment variable.
 * In production, this should be a securely generated 32-byte key.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    // For development, derive a key from JWT_SECRET
    // In production, ENCRYPTION_KEY should be set explicitly
    const fallbackKey = process.env.JWT_SECRET || 'development-key-do-not-use-in-production';
    return crypto.scryptSync(fallbackKey, 'handoff-ai-salt', 32);
  }

  // If key is provided, ensure it's 32 bytes
  if (key.length === 64) {
    // Hex-encoded 32-byte key
    return Buffer.from(key, 'hex');
  } else if (key.length === 44) {
    // Base64-encoded 32-byte key
    return Buffer.from(key, 'base64');
  } else {
    // Derive key from provided value
    return crypto.scryptSync(key, 'handoff-ai-salt', 32);
  }
}

/**
 * Encrypts a string value using AES-256-GCM.
 * Returns a string in format: iv:authTag:encryptedData (all base64)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Combine iv:authTag:encryptedData
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts a string that was encrypted with encrypt().
 * Expects format: iv:authTag:encryptedData (all base64)
 */
export function decrypt(encryptedValue: string): string {
  const key = getEncryptionKey();

  const parts = encryptedValue.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }

  const ivBase64 = parts[0];
  const authTagBase64 = parts[1];
  const encryptedData = parts[2];

  if (!ivBase64 || !authTagBase64 || !encryptedData) {
    throw new Error('Invalid encrypted value format');
  }

  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Checks if a value appears to be encrypted (has the expected format).
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) return false;

  const part0 = parts[0];
  const part1 = parts[1];
  const part2 = parts[2];

  if (!part0 || !part1 || !part2) return false;

  try {
    // Check if parts are valid base64
    Buffer.from(part0, 'base64');
    Buffer.from(part1, 'base64');
    Buffer.from(part2, 'base64');
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates a random encryption key (for initial setup).
 * Returns a hex-encoded 32-byte key.
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
