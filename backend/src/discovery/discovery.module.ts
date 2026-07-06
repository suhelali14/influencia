import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { DiscoveryService } from './discovery.service';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryQueueProcessor, DISCOVERY_QUEUE } from './discovery.queue';

// Old entity (kept for backward compat)
import { DiscoveredCreator } from './discovered-creator.entity';
// New entities
import { CreatorIndex } from './entities/creator-index.entity';
import { CampaignCreatorScore } from './entities/campaign-creator-score.entity';
import { DiscoveryJob } from './entities/discovery-job.entity';

import { Campaign } from '../campaigns/entities/campaign.entity';
import { Creator } from '../creators/entities/creator.entity';
import { Brand } from '../brands/entities/brand.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DiscoveredCreator,
      CreatorIndex,
      CampaignCreatorScore,
      DiscoveryJob,
      Campaign,
      Creator,
      Brand,
    ]),
    BullModule.registerQueue({
      name: DISCOVERY_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,   // keep last 50 completed jobs for debugging
        removeOnFail: 100,
        timeout: 180_000,       // 3 min max per job
      },
    }),
  ],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, DiscoveryQueueProcessor],
  exports: [DiscoveryService, DiscoveryQueueProcessor, BullModule],
})
export class DiscoveryModule {}
