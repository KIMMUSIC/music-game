import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'ap-northeast-2'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          '',
        ),
      },
    });

    this.bucketName = this.configService.get<string>(
      'AWS_S3_BUCKET',
      'music-quiz-uploads',
    );
  }

  async uploadAudio(
    file: Buffer,
    originalName: string,
    userId: string,
  ): Promise<string> {
    const extension = originalName.split('.').pop() || 'mp3';
    const key = `audio/${userId}/${uuidv4()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: this.getContentType(extension),
    });

    await this.s3Client.send(command);

    return `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;
  }

  async deleteAudio(audioUrl: string): Promise<void> {
    const key = this.extractKeyFromUrl(audioUrl);
    if (!key) return;

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  async getPresignedUploadUrl(
    userId: string,
    fileName: string,
  ): Promise<{ uploadUrl: string; audioUrl: string }> {
    const extension = fileName.split('.').pop() || 'mp3';
    const key = `audio/${userId}/${uuidv4()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: this.getContentType(extension),
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    });

    const audioUrl = `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;

    return { uploadUrl, audioUrl };
  }

  async getPresignedDownloadUrl(audioUrl: string): Promise<string> {
    const key = this.extractKeyFromUrl(audioUrl);
    if (!key) {
      throw new Error('Invalid audio URL');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  private getContentType(extension: string): string {
    const contentTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
      flac: 'audio/flac',
    };

    return contentTypes[extension.toLowerCase()] || 'audio/mpeg';
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.slice(1); // Remove leading '/'
    } catch {
      return null;
    }
  }
}
