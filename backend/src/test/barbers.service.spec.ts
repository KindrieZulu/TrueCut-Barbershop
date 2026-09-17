import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { BarbersService } from '../modules/barbers/barbers.service';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@prisma/client';

// Regression test for an IDOR: addBlockOut only checked role membership
// (BARBER/COMPANY_ADMIN/SYSTEM_ADMIN), never that a requesting BARBER's own
// id matched the :id in the URL - any authenticated barber could add
// fabricated leave/unavailability for a colleague.
describe('BarbersService.addBlockOut ownership check', () => {
  let service: BarbersService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      barberBlockOut: {
        create: jest.fn().mockResolvedValue({ id: 'bo1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BarbersService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get(BarbersService);
  });

  const start = new Date('2026-10-01T09:00:00Z');
  const end = new Date('2026-10-01T10:00:00Z');

  it('lets a barber block out their own schedule', async () => {
    const self = { id: 'barber-1', role: UserRole.BARBER };
    await expect(
      service.addBlockOut('barber-1', 'branch-1', start, end, 'Dentist', self),
    ).resolves.toEqual({ id: 'bo1' });
    expect(prismaMock.barberBlockOut.create).toHaveBeenCalledTimes(1);
  });

  it('blocks a barber from blocking out a colleague schedule (the actual IDOR)', async () => {
    const attacker = { id: 'barber-2', role: UserRole.BARBER };
    await expect(
      service.addBlockOut('barber-1', 'branch-1', start, end, 'Fake leave', attacker),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.barberBlockOut.create).not.toHaveBeenCalled();
  });

  it('lets a company admin block out any barber schedule', async () => {
    const admin = { id: 'admin-1', role: UserRole.COMPANY_ADMIN };
    await expect(
      service.addBlockOut('barber-1', 'branch-1', start, end, 'Company retreat', admin),
    ).resolves.toEqual({ id: 'bo1' });
  });
});
