import crypto from 'crypto';
import { config } from '../config.js';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const keyHex = config.encryptionMasterKey;
  if (!keyHex || keyHex.length < 64) {
    // Hash key if provided string is not 64-hex chars to produce exact 32 bytes
    return crypto.createHash('sha256').update(keyHex || 'fallback_key_2026').digest();
  }
  return Buffer.from(keyHex.substring(0, 64), 'hex');
}

/**
 * Encrypt sensitive refresh token using AES-256-GCM (Phase 3 Security Requirement)
 */
export function encryptToken(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt refresh token using AES-256-GCM
 */
export function decryptToken(cipherText: string): string {
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid cipher text format.');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
