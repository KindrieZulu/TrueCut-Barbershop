import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './database/prisma.module';
import { CorrelationIdMiddleware } from './common/correlation-id.middleware';
import { RateLimitMiddleware } from './common/rate-limit.middleware';
import { CsrfMiddleware } from './common/csrf.middleware';

import { SystemSettingsModule } from './modules/config/system-settings.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BranchesModule } from './modules/branches/branches.module';
import { ServicesModule } from './modules/services/services.module';
import { BarbersModule } from './modules/barbers/barbers.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { BookingHoldsModule } from './modules/booking-holds/booking-holds.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { ReceptionistModule } from './modules/reception/receptionist.module';
import { RecurringModule } from './modules/recurring/recurring.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { EventsModule } from './modules/events/events.module';
import { StaffDirectoryModule } from './modules/staff-directory/staff-directory.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute
      },
    ]),
    PrismaModule,
    SystemSettingsModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    ServicesModule,
    BarbersModule,
    SchedulingModule,
    BookingHoldsModule,
    BookingsModule,
    PaymentsModule,
    LedgerModule,
    ReceptionistModule,
    RecurringModule,
    NotificationsModule,
    ReportsModule,
    AuditModule,
    HealthModule,
    EventsModule,
    StaffDirectoryModule,
    JobsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
    consumer.apply(RateLimitMiddleware).forRoutes('*');
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}
