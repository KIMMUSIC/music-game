import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;

    // Generate or use existing correlation ID
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    // Log on response finish
    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      const contentLength = res.get('content-length') || 0;

      const logMessage = `${method} ${originalUrl} ${statusCode} ${duration}ms ${contentLength}b`;

      if (statusCode >= 500) {
        this.logger.error(`[${correlationId}] ${logMessage} - ${ip}`);
      } else if (statusCode >= 400) {
        this.logger.warn(`[${correlationId}] ${logMessage} - ${ip}`);
      } else {
        this.logger.log(`[${correlationId}] ${logMessage}`);
      }
    });

    next();
  }
}
