import { Module } from '@nestjs/common';
import { StaffDirectoryService } from './staff-directory.service';
import { StaffDirectoryController } from './staff-directory.controller';

@Module({
  providers: [StaffDirectoryService],
  controllers: [StaffDirectoryController],
  exports: [StaffDirectoryService],
})
export class StaffDirectoryModule {}
