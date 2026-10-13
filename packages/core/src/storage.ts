import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AppConfig } from './config';

export interface ObjectStore {
  put(key: string, body: Buffer, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  /** URL the browser can open to view the object; null when unsupported. */
  publicUrl(key: string): Promise<string | null>;
}

export class FsObjectStore implements ObjectStore {
  private readonly root: string;

  constructor(fsRoot: string) {
    this.root = path.resolve(fsRoot);
  }

  private abs(key: string): string {
    const resolved = path.resolve(this.root, key);
    if (!resolved.startsWith(this.root + path.sep)) {
      throw new Error(`invalid storage key: ${key}`);
    }
    return resolved;
  }

  async put(key: string, body: Buffer): Promise<void> {
    const abs = this.abs(key);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, body);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.abs(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.abs(key));
      return true;
    } catch {
      return false;
    }
  }

  async publicUrl(key: string): Promise<string | null> {
    // served by the API at /files/* (see routes/files.ts)
    return `/files/${encodeURI(key)}`;
  }
}

export async function createObjectStore(config: AppConfig): Promise<ObjectStore> {
  if (config.STORAGE_DRIVER === 'fs') {
    return new FsObjectStore(config.FS_ROOT);
  }
  const { S3ObjectStore } = await import('./s3-store');
  return new S3ObjectStore(config);
}