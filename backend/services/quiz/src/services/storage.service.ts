import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';
import { LocalStorageService } from './local-storage.service';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly useLocalStorage: boolean;

  constructor(
    private configService: ConfigService,
    private s3Service: S3Service,
    private localStorageService: LocalStorageService,
  ) {
    // Check if AWS credentials are configured
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID', '');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
      '',
    );

    this.useLocalStorage = !accessKeyId || !secretAccessKey;

    if (this.useLocalStorage) {
      this.logger.warn(
        'AWS credentials not configured. Using local file storage.',
      );
      this.logger.log(
        `Upload directory: ${this.localStorageService.getUploadDir()}`,
      );
    } else {
      this.logger.log('Using AWS S3 for file storage.');
    }
  }

  async uploadAudio(
    file: Buffer,
    originalName: string,
    userId: string,
  ): Promise<string> {
    if (this.useLocalStorage) {
      return this.localStorageService.saveFile(file, originalName, userId);
    }
    return this.s3Service.uploadAudio(file, originalName, userId);
  }

  async deleteAudio(audioUrl: string): Promise<void> {
    if (this.useLocalStorage) {
      return this.localStorageService.deleteFile(audioUrl);
    }
    return this.s3Service.deleteAudio(audioUrl);
  }

  async getPresignedUploadUrl(
    userId: string,
    fileName: string,
  ): Promise<{ uploadUrl: string; audioUrl: string }> {
    if (this.useLocalStorage) {
      // For local storage, we'll use a direct upload endpoint
      const info = this.localStorageService.getLocalUploadInfo(userId, fileName);
      return {
        uploadUrl: `/quiz/upload-file?fileName=${encodeURIComponent(info.fileName)}`,
        audioUrl: info.audioUrl,
      };
    }
    return this.s3Service.getPresignedUploadUrl(userId, fileName);
  }

  isUsingLocalStorage(): boolean {
    return this.useLocalStorage;
  }
}
