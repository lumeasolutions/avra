import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private s3 = new S3Client({ region: process.env.S3_REGION || 'auto' });

  async uploadFile(key: string, body: Buffer, contentType: string) {
    await this.s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    return `https://${process.env.S3_BUCKET}.r2.cloudflarestorage.com/${key}`;
  }
}
