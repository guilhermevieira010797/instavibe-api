import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './profile.entity';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { InstagramDiscoveryService } from './instagram-discovery.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [TypeOrmModule.forFeature([Profile]), BillingModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, InstagramDiscoveryService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
