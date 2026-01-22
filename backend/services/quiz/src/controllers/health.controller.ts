import { Controller, Get } from '@nestjs/common';

@Controller('healthz')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'quiz', timestamp: new Date().toISOString() };
  }
}
