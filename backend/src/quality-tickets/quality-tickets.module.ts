import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QualityTicketsController } from './quality-tickets.controller';
import { QualityTicketsService } from './quality-tickets.service';

@Module({
  imports: [AuthModule],
  controllers: [QualityTicketsController],
  providers: [QualityTicketsService],
})
export class QualityTicketsModule {}




