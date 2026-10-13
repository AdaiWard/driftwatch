import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AppConfig } from './config';
import type { ObjectStore } from './storage';

/**
 * Lazy-loaded only when STORAGE_DRIVER=s3, so the fs profile never
 * pays the startup cost for the AWS SDK.
 */
export class S3ObjectStore implements ObjectStore {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: AppConfig) {
    this.client = new S3Client({
      endpoint: config.S3_ENDPOINT,
      region: config.S3_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY,
        secretAccessKey: config.S3_SECRET_KEY,
      },
    });
    this.bucket = config.S3_BUCKET;
  }

  async put(key: string, body: Buffer, contentType = 'image/png'): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!res.Body) {
      throw new Error(`object not found: ${key}`);
    }
    return Buffer.from(await res.Body.transformToByteArray());
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (error) {
      const name = (error as { name?: string }).name;
      if (name === 'NotFound' || name === 'NoSuchKey' || name === '404') {
        return false;
      }
      throw error;
    }
  }

  async publicUrl(key: string): Promise<string | null> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: 7 * 24 * 60 * 60,
    });
  }
}