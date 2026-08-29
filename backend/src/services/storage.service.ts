import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CryptoService } from './crypto.service';

export class StorageService {
  private static storageDir = path.resolve(process.env.STORAGE_DIR || './storage_data');

  public static initialize(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Stores a file buffer and returns storageKey & SHA-256 hash.
   * The storageKey is generated automatically (UUID-based, safe).
   */
  public static async saveFile(
    fileBuffer: Buffer,
    originalName: string
  ): Promise<{ storageKey: string; hash: string; fileSize: number }> {
    this.initialize();
    const ext = path.extname(originalName);
    const storageKey = `doc_${uuidv4()}${ext}`;
    return this.saveFileWithKey(fileBuffer, storageKey);
  }

  /**
   * Stores a file buffer under a caller-specified storageKey.
   * Used by the seed script for predictable, version-stable demo files.
   */
  public static async saveFileWithKey(
    fileBuffer: Buffer,
    storageKey: string
  ): Promise<{ storageKey: string; hash: string; fileSize: number }> {
    this.initialize();
    const filePath = path.join(this.storageDir, storageKey);
    await fs.promises.writeFile(filePath, fileBuffer);
    const hash = CryptoService.calculateBufferHash(fileBuffer);
    const fileSize = fileBuffer.length;
    return { storageKey, hash, fileSize };
  }

  /**
   * Retrieves file buffer by storageKey
   */
  public static async getFile(storageKey: string): Promise<Buffer> {
    this.initialize();
    const filePath = path.join(this.storageDir, storageKey);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File with storageKey ${storageKey} not found on storage provider.`);
    }
    return fs.promises.readFile(filePath);
  }

  /**
   * Overwrites a file buffer (used solely for simulating out-of-band file tampering in tests/demos)
   */
  public static async overwriteFileForTamperDemo(storageKey: string, tamperedContent: string): Promise<void> {
    this.initialize();
    const filePath = path.join(this.storageDir, storageKey);
    await fs.promises.writeFile(filePath, Buffer.from(tamperedContent, 'utf8'));
  }
}

