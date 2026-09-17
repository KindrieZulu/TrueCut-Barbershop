import { HealthController } from '../modules/health/health.controller';
import { HealthService } from '../modules/health/health.service';

describe('HealthController', () => {
  it('exposes readiness and liveness endpoints', async () => {
    const service = {
      getHealthSnapshot: jest.fn().mockResolvedValue({ status: 'OK', services: { database: 'UP', api: 'UP' } }),
      getReadinessSnapshot: jest.fn().mockResolvedValue({ status: 'READY', ready: true, checks: { database: 'UP', redis: 'UP' } }),
      getLivenessSnapshot: jest.fn().mockResolvedValue({ status: 'LIVE', service: 'api', uptimeSeconds: 12 }),
    } as unknown as HealthService;

    const controller = new HealthController(service);

    await expect(controller.checkHealth()).resolves.toMatchObject({ status: 'OK' });
    await expect(controller.getReadiness()).resolves.toMatchObject({ status: 'READY', ready: true });
    await expect(controller.getLiveness()).resolves.toMatchObject({ status: 'LIVE', service: 'api' });
  });
});
