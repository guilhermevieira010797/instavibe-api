import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PostsModule } from './posts/posts.module';
import { S3Module } from './s3/s3.module';
import { MailModule } from './mail/mail.module';
import { BillingModule } from './billing/billing.module';
import { CreateInitialSchema20260407193000 } from './database/migrations/20260407193000-create-initial-schema';
import { AlterPostsUserOwnershipAndDraft20260407223000 } from './database/migrations/20260407223000-alter-posts-user-ownership-and-draft';
import { AddProfileExtraFields20260407300000 } from './database/migrations/20260407300000-add-profile-extra-fields';
import { AddBillingAndEmailVerification20260411000000 } from './database/migrations/20260411000000-add-billing-and-email-verification';
import { User } from './users/user.entity';
import { Profile } from './profiles/profile.entity';
import { Post } from './posts/post.entity';
import { Subscription } from './billing/entities/subscription.entity';
import { CreditPurchase } from './billing/entities/credit-purchase.entity';
import { config as injectEnv } from 'dotenv';
injectEnv();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    S3Module,
    MailModule,
    UsersModule,
    AuthModule,
    BillingModule,
    AiModule,
    ProfilesModule,
    PostsModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DB_CONNECTION_STRING,
      migrations: [
        CreateInitialSchema20260407193000,
        AlterPostsUserOwnershipAndDraft20260407223000,
        AddProfileExtraFields20260407300000,
        AddBillingAndEmailVerification20260411000000,
      ],
      entities: [User, Profile, Post, Subscription, CreditPurchase],
      migrationsRun: true,
      migrationsTableName: 'typeorm_migrations',
      autoLoadEntities: true,
      synchronize: false,
      ssl: {
        rejectUnauthorized: false,
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
