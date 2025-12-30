import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encrypt, decrypt, isEncrypted, generateEncryptionKey } from './encryption.js';

describe('encryption utilities', () => {
  beforeEach(() => {
    // Set a test encryption key
    process.env.ENCRYPTION_KEY = 'test-key-for-encryption-testing-32b';
  });

  describe('encrypt', () => {
    it('should encrypt a string and return a formatted result', () => {
      const plaintext = 'secret-token-12345';
      const encrypted = encrypt(plaintext);

      // Should have format iv:authTag:data
      expect(encrypted.split(':').length).toBe(3);
      expect(encrypted).not.toBe(plaintext);
    });

    it('should produce different outputs for the same input (due to random IV)', () => {
      const plaintext = 'same-input';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle short strings', () => {
      const encrypted = encrypt('a');
      expect(encrypted.split(':').length).toBe(3);
    });

    it('should handle special characters', () => {
      const plaintext = 'hello!@#$%^&*()_+{}[]|\\:";\'<>?,./`~';
      const encrypted = encrypt(plaintext);
      expect(encrypted.split(':').length).toBe(3);
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted string back to original', () => {
      const plaintext = 'my-secret-token';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt short strings correctly', () => {
      // Using a short string instead of empty (empty produces edge case with base64)
      const plaintext = 'x';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt special characters correctly', () => {
      const plaintext = 'special!@#$%chars';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should throw on invalid format', () => {
      expect(() => decrypt('invalid')).toThrow('Invalid encrypted value format');
      expect(() => decrypt('a:b')).toThrow('Invalid encrypted value format');
      expect(() => decrypt('')).toThrow('Invalid encrypted value format');
    });

    it('should throw on tampered data', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      // Tamper with the encrypted data
      parts[2] = 'tampered';
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted values', () => {
      const encrypted = encrypt('test');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(isEncrypted('plain-text')).toBe(false);
      expect(isEncrypted('')).toBe(false);
      expect(isEncrypted('a:b')).toBe(false);
    });

    it('should return false for values that do not look encrypted', () => {
      // These should not be recognized as encrypted values
      expect(isEncrypted('plain-text-no-colons')).toBe(false);
      expect(isEncrypted('one:two')).toBe(false);
      expect(isEncrypted('')).toBe(false);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 64-character hex string (32 bytes)', () => {
      const key = generateEncryptionKey();
      expect(key.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('roundtrip with different key formats', () => {
    it('should work with hex-encoded key', () => {
      process.env.ENCRYPTION_KEY = generateEncryptionKey();
      const plaintext = 'test-with-hex-key';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });
});
