import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { Brand } from '../brands/entities/brand.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { DiscoveryJob } from '../discovery/entities/discovery-job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Brand,
      Campaign,
      DiscoveryJob,
    ]),
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
