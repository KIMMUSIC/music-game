import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface InternalRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ServiceUrls {
  auth: string;
  quiz: string;
  game: string;
  social: string;
}

@Injectable()
export class InternalHttpService {
  private readonly logger = new Logger(InternalHttpService.name);
  private readonly internalKey: string;
  private readonly serviceUrls: ServiceUrls;

  constructor(private configService: ConfigService) {
    this.internalKey = this.configService.get<string>('INTERNAL_API_KEY', '');

    this.serviceUrls = {
      auth: this.configService.get<string>('AUTH_SERVICE_URL', 'http://localhost:3001'),
      quiz: this.configService.get<string>('QUIZ_SERVICE_URL', 'http://localhost:3002'),
      game: this.configService.get<string>('GAME_SERVICE_URL', 'http://localhost:3003'),
      social: this.configService.get<string>('SOCIAL_SERVICE_URL', 'http://localhost:3004'),
    };
  }

  async request<T>(
    service: keyof ServiceUrls,
    path: string,
    options: InternalRequestOptions = {},
  ): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;
    const url = `${this.serviceUrls[service]}${path}`;

    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Internal-Key': this.internalKey,
      ...headers,
    };

    try {
      const response = await fetch(url, {
        method,
        headers: fetchHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Internal request failed: ${method} ${url} - ${response.status}: ${errorText}`,
        );
        throw new Error(`Internal service request failed: ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      this.logger.error(`Internal request error: ${method} ${url}`, error);
      throw error;
    }
  }

  // Convenience methods
  async get<T>(service: keyof ServiceUrls, path: string): Promise<T> {
    return this.request<T>(service, path, { method: 'GET' });
  }

  async post<T>(service: keyof ServiceUrls, path: string, body?: unknown): Promise<T> {
    return this.request<T>(service, path, { method: 'POST', body });
  }

  async put<T>(service: keyof ServiceUrls, path: string, body?: unknown): Promise<T> {
    return this.request<T>(service, path, { method: 'PUT', body });
  }

  async delete<T>(service: keyof ServiceUrls, path: string): Promise<T> {
    return this.request<T>(service, path, { method: 'DELETE' });
  }
}
