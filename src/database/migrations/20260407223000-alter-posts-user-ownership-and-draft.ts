import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AlterPostsUserOwnershipAndDraft20260407223000 implements MigrationInterface {
  name = 'AlterPostsUserOwnershipAndDraft20260407223000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const postsTable = await queryRunner.getTable('posts');
    if (!postsTable) {
      return;
    }

    const hasUserIdColumn = postsTable.columns.some(
      (column) => column.name === 'user_id',
    );

    if (!hasUserIdColumn) {
      await queryRunner.addColumn(
        'posts',
        new TableColumn({
          name: 'user_id',
          type: 'uuid',
          isNullable: true,
        }),
      );
    }

    const hasDraftColumn = postsTable.columns.some(
      (column) => column.name === 'draft',
    );

    if (!hasDraftColumn) {
      await queryRunner.addColumn(
        'posts',
        new TableColumn({
          name: 'draft',
          type: 'boolean',
          isNullable: false,
          default: 'true',
        }),
      );

      await queryRunner.query(
        `UPDATE posts SET draft = CASE WHEN status = 'draft' THEN true ELSE false END`,
      );
    }

    await queryRunner.query(
      `UPDATE posts p
       SET user_id = pr.user_id
       FROM profiles pr
       WHERE p.profile_id = pr.id
       AND p.user_id IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE posts ALTER COLUMN user_id SET NOT NULL`,
    );

    const refreshedPostsTable = await queryRunner.getTable('posts');
    if (!refreshedPostsTable) {
      return;
    }

    const hasUserIdIndex = refreshedPostsTable.indices.some(
      (index) =>
        index.columnNames.length === 1 && index.columnNames[0] === 'user_id',
    );

    if (!hasUserIdIndex) {
      await queryRunner.createIndex(
        'posts',
        new TableIndex({
          name: 'IDX_posts_user_id',
          columnNames: ['user_id'],
        }),
      );
    }

    const postsUserForeignKey = refreshedPostsTable.foreignKeys.find(
      (foreignKey) =>
        foreignKey.columnNames.length === 1 &&
        foreignKey.columnNames[0] === 'user_id' &&
        foreignKey.referencedTableName === 'users',
    );

    if (!postsUserForeignKey) {
      await queryRunner.createForeignKey(
        'posts',
        new TableForeignKey({
          name: 'FK_posts_user_id_users_id',
          columnNames: ['user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }

    const postsProfileForeignKey = refreshedPostsTable.foreignKeys.find(
      (foreignKey) =>
        foreignKey.columnNames.length === 1 &&
        foreignKey.columnNames[0] === 'profile_id' &&
        foreignKey.referencedTableName === 'profiles',
    );

    if (postsProfileForeignKey) {
      await queryRunner.dropForeignKey('posts', postsProfileForeignKey);
    }

    await queryRunner.query(
      `ALTER TABLE posts ALTER COLUMN profile_id DROP NOT NULL`,
    );

    await queryRunner.createForeignKey(
      'posts',
      new TableForeignKey({
        name: 'FK_posts_profile_id_profiles_id',
        columnNames: ['profile_id'],
        referencedTableName: 'profiles',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const postsTable = await queryRunner.getTable('posts');
    if (!postsTable) {
      return;
    }

    const postsProfileForeignKey = postsTable.foreignKeys.find(
      (foreignKey) =>
        foreignKey.columnNames.length === 1 &&
        foreignKey.columnNames[0] === 'profile_id' &&
        foreignKey.referencedTableName === 'profiles',
    );

    if (postsProfileForeignKey) {
      await queryRunner.dropForeignKey('posts', postsProfileForeignKey);
    }

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

    await queryRunner.query(`DELETE FROM posts WHERE profile_id IS NULL`);
    await queryRunner.query(
      `ALTER TABLE posts ALTER COLUMN profile_id SET NOT NULL`,
    );

    const refreshedPostsTable = await queryRunner.getTable('posts');
    if (!refreshedPostsTable) {
      return;
    }

    const postsUserForeignKey = refreshedPostsTable.foreignKeys.find(
      (foreignKey) =>
        foreignKey.columnNames.length === 1 &&
        foreignKey.columnNames[0] === 'user_id' &&
        foreignKey.referencedTableName === 'users',
    );

    if (postsUserForeignKey) {
      await queryRunner.dropForeignKey('posts', postsUserForeignKey);
    }

    const userIdIndex = refreshedPostsTable.indices.find(
      (index) => index.name === 'IDX_posts_user_id',
    );

    if (userIdIndex) {
      await queryRunner.dropIndex('posts', userIdIndex);
    }

    const hasUserIdColumn = refreshedPostsTable.columns.some(
      (column) => column.name === 'user_id',
    );

    if (hasUserIdColumn) {
      await queryRunner.dropColumn('posts', 'user_id');
    }

    const hasDraftColumn = refreshedPostsTable.columns.some(
      (column) => column.name === 'draft',
    );

    if (hasDraftColumn) {
      await queryRunner.dropColumn('posts', 'draft');
    }
  }
}
