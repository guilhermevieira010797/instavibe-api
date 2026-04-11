import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { InstagramGraphService } from './instagram-graph.service';
import { ProfilesModule } from '../profiles/profiles.module';
import { AiModule } from '../ai/ai.module';
import { S3Module } from '../s3/s3.module';
import { BillingModule } from '../billing/billing.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post]),
    ProfilesModule,
    AiModule,
    S3Module,
    BillingModule,
    UsersModule,
  ],
  controllers: [PostsController],
  providers: [PostsService, InstagramGraphService],
  exports: [PostsService],
})
export class PostsModule {}
