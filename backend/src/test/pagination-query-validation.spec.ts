import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { LedgerQueryDto } from '../modules/ledger/dto/ledger-query.dto';
import { AuditLogQueryDto } from '../modules/audit/dto/audit-log-query.dto';

// Query string values always arrive as strings (Express does not parse types),
// so this exercises the exact global ValidationPipe config from main.ts against
// real query-string-shaped input, not typed JS objects a unit test might use
// by mistake. It also proves the multi-field DTOs (branchId combined with
// pagination) do not trip forbidNonWhitelisted against each other.
describe('Pagination query validation (matches the global ValidationPipe config in main.ts)', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
  const runThrough = (metatype: any, value: any) => pipe.transform(value, { type: 'query', metatype, data: '' });

  it('defaults page and limit when neither is provided', async () => {
    const result = await runThrough(PaginationQueryDto, {});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('coerces query-string page/limit into numbers', async () => {
    const result = await runThrough(PaginationQueryDto, { page: '3', limit: '10' });
    expect(result).toBeInstanceOf(PaginationQueryDto);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
  });

  it('rejects a limit above the max of 100', async () => {
    await expect(runThrough(PaginationQueryDto, { limit: '500' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a page below 1', async () => {
    await expect(runThrough(PaginationQueryDto, { page: '0' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-numeric page', async () => {
    await expect(runThrough(PaginationQueryDto, { page: 'not-a-number' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts branchId combined with pagination on LedgerQueryDto', async () => {
    const result = await runThrough(LedgerQueryDto, { branchId: 'branch-1', page: '2', limit: '15' });
    expect(result.branchId).toBe('branch-1');
    expect(result.page).toBe(2);
    expect(result.limit).toBe(15);
  });

  it('accepts branchId and action combined with pagination on AuditLogQueryDto', async () => {
    const result = await runThrough(AuditLogQueryDto, { branchId: 'branch-1', action: 'BOOKING_CONFIRMED', page: '1' });
    expect(result.branchId).toBe('branch-1');
    expect(result.action).toBe('BOOKING_CONFIRMED');
  });

  it('rejects an unrecognised field on LedgerQueryDto', async () => {
    await expect(runThrough(LedgerQueryDto, { branchId: 'b1', sortBy: 'amount' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
