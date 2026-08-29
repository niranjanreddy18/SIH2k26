import crypto from 'crypto';

export class CryptoService {
  /**
   * Calculates SHA-256 hex hash of a Buffer
   */
  public static calculateBufferHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Calculates SHA-256 hex hash of a text string
   */
  public static calculateStringHash(text: string): string {
    return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
  }

  /**
   * Computes the Audit Event hash for DB tamper-evidence chaining.
   * Formula: SHA256(actorId + action + targetId + timestamp + prevEventHash)
   */
  public static computeAuditEventHash(
    actorId: string,
    action: string,
    targetId: string,
    timestamp: string,
    prevEventHash: string
  ): string {
    const rawData = `${actorId}${action}${targetId}${timestamp}${prevEventHash}`;
    return this.calculateStringHash(rawData);
  }

  /**
   * Genesis hash constant (64 zeros)
   */
  public static GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
}

