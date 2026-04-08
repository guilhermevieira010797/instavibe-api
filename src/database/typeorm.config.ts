import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Post } from '../posts/post.entity';
import { Profile } from '../profiles/profile.entity';
import { User } from '../users/user.entity';
import { CreateInitialSchema20260407193000 } from './migrations/20260407193000-create-initial-schema';
import { AlterPostsUserOwnershipAndDraft20260407223000 } from './migrations/20260407223000-alter-posts-user-ownership-and-draft';

export function getTypeOrmOptions(
  configService: ConfigService,
): TypeOrmModuleOptions {
  const connectionString = configService.get<string>('DB_CONNECTION_STRING');
  if (!connectionString) {
    throw new Error(
      'DB_CONNECTION_STRING is not defined in environment variables',
    );
  }

  return {
    type: 'postgres',
    url: connectionString,
    entities: [User, Profile, Post],
    migrations: [
      CreateInitialSchema20260407193000,
      AlterPostsUserOwnershipAndDraft20260407223000,
    ],
    migrationsRun: true,
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
  };
}
