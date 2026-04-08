import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class CreateInitialSchema20260407193000
  implements MigrationInterface
{
  name = 'CreateInitialSchema20260407193000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await this.createUsersTable(queryRunner);
    await this.ensureUsersEmailUnique(queryRunner);

    await this.createProfilesTable(queryRunner);
    await this.ensureProfilesUserIdIndex(queryRunner);
    await this.ensureProfilesUserForeignKey(queryRunner);

    await this.createPostsTable(queryRunner);
    await this.ensurePostsProfileIdIndex(queryRunner);
    await this.ensurePostsProfileForeignKey(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('posts')) {
      await queryRunner.dropTable('posts', true, true, true);
    }

    if (await queryRunner.hasTable('profiles')) {
      await queryRunner.dropTable('profiles', true, true, true);
    }

    if (await queryRunner.hasTable('users')) {
      await queryRunner.dropTable('users', true, true, true);
    }
  }

  private async createUsersTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('users')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'email',
            type: 'varchar',
          },
          {
            name: 'password',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'google_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );
  }

  private async ensureUsersEmailUnique(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      return;
    }

    const hasEmailUnique = usersTable.uniques.some(
      (unique) => unique.columnNames.length === 1 && unique.columnNames[0] === 'email',
    );

    if (!hasEmailUnique) {
      await queryRunner.createUniqueConstraint(
        'users',
        new TableUnique({
          name: 'UQ_users_email',
          columnNames: ['email'],
        }),
      );
    }
  }

  private async createProfilesTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('profiles')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'profiles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'niche',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'visual_identity',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'color_palette',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'font_style',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'reference_images_base64',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'instagram_username',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'instagram_account_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'instagram_access_token',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'profile_picture_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );
  }

  private async ensureProfilesUserIdIndex(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const profilesTable = await queryRunner.getTable('profiles');
    if (!profilesTable) {
      return;
    }

    const hasUserIdIndex = profilesTable.indices.some(
      (index) =>
        index.columnNames.length === 1 && index.columnNames[0] === 'user_id',
    );

    if (!hasUserIdIndex) {
      await queryRunner.createIndex(
        'profiles',
        new TableIndex({
          name: 'IDX_profiles_user_id',
          columnNames: ['user_id'],
        }),
      );
    }
  }

  private async ensureProfilesUserForeignKey(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const profilesTable = await queryRunner.getTable('profiles');
    if (!profilesTable) {
      return;
    }

    const hasForeignKey = profilesTable.foreignKeys.some(
      (foreignKey) =>
        foreignKey.columnNames.length === 1 &&
        foreignKey.columnNames[0] === 'user_id' &&
        foreignKey.referencedTableName === 'users',
    );

    if (!hasForeignKey) {
      await queryRunner.createForeignKey(
        'profiles',
        new TableForeignKey({
          name: 'FK_profiles_user_id_users_id',
          columnNames: ['user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  private async createPostsTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('posts')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'posts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'profile_id',
            type: 'uuid',
          },
          {
            name: 'post_type',
            type: 'varchar',
          },
          {
            name: 'prompt',
            type: 'text',
          },
          {
            name: 'caption',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'hashtags',
            type: 'jsonb',
            default: "'[]'::jsonb",
          },
          {
            name: 'mentions',
            type: 'jsonb',
            default: "'[]'::jsonb",
          },
          {
            name: 'images_base64',
            type: 'jsonb',
            default: "'[]'::jsonb",
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'draft'",
          },
          {
            name: 'instagram_media_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'published_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );
  }

  private async ensurePostsProfileIdIndex(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const postsTable = await queryRunner.getTable('posts');
    if (!postsTable) {
      return;
    }

    const hasProfileIdIndex = postsTable.indices.some(
      (index) =>
        index.columnNames.length === 1 &&
        index.columnNames[0] === 'profile_id',
    );

    if (!hasProfileIdIndex) {
      await queryRunner.createIndex(
        'posts',
        new TableIndex({
          name: 'IDX_posts_profile_id',
          columnNames: ['profile_id'],
        }),
      );
    }
  }

  private async ensurePostsProfileForeignKey(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const postsTable = await queryRunner.getTable('posts');
    if (!postsTable) {
      return;
    }

    const hasForeignKey = postsTable.foreignKeys.some(
      (foreignKey) =>
        foreignKey.columnNames.length === 1 &&
        foreignKey.columnNames[0] === 'profile_id' &&
        foreignKey.referencedTableName === 'profiles',
    );

    if (!hasForeignKey) {
      await queryRunner.createForeignKey(
        'posts',
        new TableForeignKey({
          name: 'FK_posts_profile_id_profiles_id',
          columnNames: ['profile_id'],
          referencedTableName: 'profiles',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }
  }
}
