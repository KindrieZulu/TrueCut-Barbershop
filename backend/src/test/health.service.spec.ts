import { HealthService } from '../modules/health/health.service';

describe('HealthService', () => {
  it('marks the system as degraded when the database and redis are unhealthy', async () => {
    const mockPrisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('db down')),
    } as any;

    const mockRedis = {
      ping: jest.fn().mockRejectedValue(new Error('redis down')),
    } as any;

    const service = new HealthService(mockPrisma, mockRedis);
    const result = await service.getHealthSnapshot();

    expect(result.status).toBe('DEGRADED');
    expect(result.services.database).toBe('DOWN');
    expect(result.services.redis).toBe('DOWN');
    expect(result.services.api).toBe('UP');
  });
});
