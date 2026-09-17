import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaynowEcoCashAdapter } from './adapters/paynow-ecocash.adapter';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  providers: [PaymentsService, PaynowEcoCashAdapter],
  controllers: [PaymentsController],
  exports: [PaymentsService, PaynowEcoCashAdapter],
})
export class PaymentsModule {}
