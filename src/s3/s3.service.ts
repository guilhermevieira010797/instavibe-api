import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { config as injectEnv } from 'dotenv';
injectEnv();

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3: S3Client | null;
  private readonly bucketName = process.env.AWS_S3_BUCKET ?? '';
  private readonly region = process.env.AWS_REGION ?? '';

  constructor() {
    const hasCredentials =
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET &&
      process.env.AWS_REGION;

    if (hasCredentials) {
      this.s3 = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
    } else {
      this.s3 = null;
      this.logger.warn(
        'AWS S3 credentials not configured. File uploads will return base64 data URIs. ' +
          'Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, and AWS_REGION to enable S3.',
      );
    }
  }

  /**
   * Faz upload de um arquivo em base64 para o S3 e retorna a URL pública.
   * @param base64 base64 do arquivo
   * @param folder pasta opcional dentro do bucket
   */
  async upload(
    base64OrFileUrl: string,
    folder = 'uploads',
    name: string = randomUUID(),
  ): Promise<string> {
    if (!base64OrFileUrl) {
      return '';
    }

    if (
      base64OrFileUrl.startsWith('http://') ||
      base64OrFileUrl.startsWith('https://')
    ) {
      return base64OrFileUrl;
    }

    const matches = base64OrFileUrl.match(/^data:(.+);base64,(.*)$/);
    if (!matches) {
      throw new Error('Formato base64 inválido');
    }

    if (!this.s3) {
      this.logger.warn('S3 not configured — returning base64 data URI as-is');
      return base64OrFileUrl;
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    const ext = mimeType.split('/')[1];
    const fileName = `${folder}/${name}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: mimeType,
    });

    await this.s3.send(command);

    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
  }

  async delete(fileUrl: string): Promise<void> {
    if (!fileUrl || !this.s3) {
      return;
    }

    const key = this.getKeyFromUrl(fileUrl);

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3.send(command);
  }

  private getKeyFromUrl(fileUrl: string): string {
    if (!fileUrl) {
      return '';
    }

    if (fileUrl.startsWith('http')) {
      const url = new URL(fileUrl);
      return decodeURIComponent(url.pathname.substring(1));
    }

    return fileUrl;
  }
}
