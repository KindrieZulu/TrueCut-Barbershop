import { Controller, Post, Get, Param, Body, UseGuards, Headers } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { PaymentType, UserRole } from '@prisma/client';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  async initiatePayment(
    @Body('bookingId') bookingId: string,
    @Body('phone') phone: string,
    @Body('paymentType') paymentType: PaymentType,
    @Headers('x-idempotency-key') idempotencyKeyHeader: string,
    @Body('idempotencyKey') idempotencyKeyBody: string,
  ) {
    const idempotencyKey = idempotencyKeyHeader || idempotencyKeyBody || `IDEM-${bookingId}-${Date.now()}`;
    return this.paymentsService.initiatePayment(bookingId, phone, paymentType, idempotencyKey);
  }

  @Post('webhook')
  async handleWebhook(@Body() payload: any) {
    return this.paymentsService.handleWebhook(payload);
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECEPTIONIST, UserRole.COMPANY_ADMIN, UserRole.SYSTEM_ADMIN)
  async confirmPayment(@Param('id') paymentId: string) {
    return this.paymentsService.confirmPayment(paymentId);
  }
}
