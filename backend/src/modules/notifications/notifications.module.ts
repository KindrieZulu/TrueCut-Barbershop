import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SmsAdapter } from './adapters/sms.adapter';

@Module({
  providers: [NotificationsService, SmsAdapter],
  controllers: [NotificationsController],
  exports: [NotificationsService, SmsAdapter],
})
export class NotificationsModule {}
