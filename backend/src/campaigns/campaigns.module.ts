import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { Campaign } from './entities/campaign.entity';
import { BrandsModule } from '../brands/brands.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { DISCOVERY_QUEUE } from '../discovery/discovery.queue';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign]),
    BrandsModule,
    // Import DiscoveryModule so we can inject the Bull queue
    DiscoveryModule,
    // Register the same queue name so InjectQueue works in CampaignsService
    BullModule.registerQueue({ name: DISCOVERY_QUEUE }),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
