import { Controller, Get } from '@nestjs/common';

/**
 * Load balancers should not have to send a GraphQL document to know the
 * process is up. This route is plain HTTP on the same Express server.
 */
@Controller()
export class HealthController {
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
