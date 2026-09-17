import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateHoldRequestDto } from '../modules/booking-holds/dto/create-hold-request.dto';

// Regression test for a business-logic bypass: POST /booking-holds passed
// the raw request body straight into BookingHoldsService.createHold(), and
// isSqueezeIn: true skips that method overlap/availability check entirely.
// The only legitimate caller of isSqueezeIn: true is
// ReceptionistService.processWalkInBooking, which calls the service
// directly in-process - never through this HTTP endpoint. Before this DTO,
// any authenticated CLIENT could send isSqueezeIn: true here and skip the
// availability check the public booking UI never even exposes as an option.
describe('CreateHoldRequestDto validation (matches the global ValidationPipe config in main.ts)', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
  const runThrough = (value: any) => pipe.transform(value, { type: 'body', metatype: CreateHoldRequestDto, data: '' });

  const validBody = {
    branchId: 'branch-1',
    barberId: 'barber-1',
    serviceId: 'service-1',
    startTimeStr: '2026-10-01T09:00:00.000Z',
    bookingType: 'GENERAL',
  };

  it('accepts a well-formed hold request', async () => {
    const result = await runThrough(validBody);
    expect(result).toBeInstanceOf(CreateHoldRequestDto);
    expect(result.branchId).toBe('branch-1');
  });

  it('rejects isSqueezeIn: true - the actual bypass this DTO closes', async () => {
    await expect(runThrough({ ...validBody, isSqueezeIn: true })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a client-supplied clientId (must come from the authenticated session, not the body)', async () => {
    await expect(runThrough({ ...validBody, clientId: 'someone-elses-id' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a non-ISO8601 startTimeStr', async () => {
    await expect(runThrough({ ...validBody, startTimeStr: 'not-a-date' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an invalid bookingType', async () => {
    await expect(runThrough({ ...validBody, bookingType: 'NOT_A_REAL_TYPE' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accepts a legitimate isEmergency flag (unlike isSqueezeIn, this is client-settable by design)', async () => {
    const result = await runThrough({ ...validBody, isEmergency: true });
    expect(result.isEmergency).toBe(true);
  });
});
