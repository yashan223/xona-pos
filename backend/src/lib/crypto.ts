import crypto from 'node:crypto';
/**
 * Hashes a plain-text password using PBKDF2.
 * @param password Plain-text password
 * @returns salt:hash format
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}
/**
 * Verifies a plain-text password against a stored hash.
 * @param password Plain-text password
 * @param storedHash salt:hash format
 * @returns True if password matches, false otherwise
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, hash] = storedHash.split(':');
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === checkHash;
}
