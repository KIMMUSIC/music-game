import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'audio');
    this.baseUrl = this.configService.get<string>(
      'LOCAL_STORAGE_URL',
      'http://localhost:3002/uploads/audio',
    );

    // Ensure upload directory exists
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  async saveFile(
    file: Buffer,
    originalName: string,
    userId: string,
  ): Promise<string> {
    const extension = originalName.split('.').pop() || 'mp3';
    const fileName = `${userId}_${uuidv4()}.${extension}`;
    const filePath = path.join(this.uploadDir, fileName);

    await fs.promises.writeFile(filePath, file);
    this.logger.log(`Saved file: ${filePath}`);

    return `${this.baseUrl}/${fileName}`;
  }

  async deleteFile(audioUrl: string): Promise<void> {
    const fileName = this.extractFileName(audioUrl);
    if (!fileName) return;

    const filePath = path.join(this.uploadDir, fileName);

    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.log(`Deleted file: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file: ${filePath}`, error);
    }
  }

  getLocalUploadInfo(
    userId: string,
    fileName: string,
  ): { uploadPath: string; audioUrl: string; fileName: string } {
    const extension = fileName.split('.').pop() || 'mp3';
    const newFileName = `${userId}_${uuidv4()}.${extension}`;

    return {
      uploadPath: path.join(this.uploadDir, newFileName),
      audioUrl: `${this.baseUrl}/${newFileName}`,
      fileName: newFileName,
    };
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  private extractFileName(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/');
      return parts[parts.length - 1];
    } catch {
      return null;
    }
  }
}
