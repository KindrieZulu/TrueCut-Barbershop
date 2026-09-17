import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LedgerEntryType } from '@prisma/client';

export interface CreateLedgerEntryDto {
  paymentId?: string;
  bookingId: string;
  branchId: string;
  entryType: LedgerEntryType;
  serviceAmount: number;
  bookingFee: number;
  emergencyFee: number;
  squeezeInFee: number;
  houseCallFee: number;
  penaltyAmount: number;
  totalNet: number;
  providerRef?: string;
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordEntry(dto: CreateLedgerEntryDto) {
    const entry = await this.prisma.paymentLedger.create({
      data: {
        paymentId: dto.paymentId || null,
        bookingId: dto.bookingId,
        branchId: dto.branchId,
        entryType: dto.entryType,
        serviceAmount: dto.serviceAmount,
        bookingFee: dto.bookingFee,
        emergencyFee: dto.emergencyFee,
        squeezeInFee: dto.squeezeInFee,
        houseCallFee: dto.houseCallFee,
        penaltyAmount: dto.penaltyAmount,
        totalNet: dto.totalNet,
        providerRef: dto.providerRef,
      },
    });

    this.logger.log(
      `[LEDGER APPEND] ID: ${entry.id} | Booking: ${dto.bookingId} | Type: ${dto.entryType} | Net: $${dto.totalNet}`,
    );

    return entry;
  }

  async getLedgerForBranch(branchId?: string, startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return this.prisma.paymentLedger.findMany({
      where,
      include: {
        booking: {
          select: { bookingCode: true, client: { select: { name: true, phone: true } } },
        },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generateCsvExport(branchId?: string) {
    const entries = await this.getLedgerForBranch(branchId);
    let csv = 'ID,BookingCode,ClientName,Branch,EntryType,ServiceAmount,BookingFee,EmergencyFee,SqueezeInFee,HouseCallFee,Penalty,TotalNet,ProviderRef,Timestamp\n';

    for (const e of entries) {
      const code = e.booking?.bookingCode || 'N/A';
      const name = e.booking?.client?.name || 'N/A';
      const branch = e.branch?.name || 'N/A';
      csv += `${e.id},${code},"${name}","${branch}",${e.entryType},${e.serviceAmount},${e.bookingFee},${e.emergencyFee},${e.squeezeInFee},${e.houseCallFee},${e.penaltyAmount},${e.totalNet},${e.providerRef || ''},${e.createdAt.toISOString()}\n`;
    }

    return csv;
  }
}
