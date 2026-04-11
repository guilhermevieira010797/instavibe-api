import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddBillingAndEmailVerification20260411000000
  implements MigrationInterface
{
  name = 'AddBillingAndEmailVerification20260411000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createSubscriptionsTable(queryRunner);
    await this.createCreditPurchasesTable(queryRunner);
    await this.alterUsersTable(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (usersTable) {
      const fk = usersTable.foreignKeys.find(
        (f) =>
          f.columnNames.length === 1 &&
          f.columnNames[0] === 'subscription_id',
      );
      if (fk) {
        await queryRunner.dropForeignKey('users', fk);
      }
      const columnsToDrop = [
        'is_email_verified',
        'email_verification_code',
        'email_verification_expires_at',
        'password_reset_code',
        'password_reset_expires_at',
        'credits',
        'extra_credits',
        'subscription_id',
      ];
      for (const col of columnsToDrop) {
        if (await queryRunner.hasColumn('users', col)) {
          await queryRunner.dropColumn('users', col);
        }
      }
    }

    if (await queryRunner.hasTable('credit_purchases')) {
      await queryRunner.dropTable('credit_purchases', true, true, true);
    }
    if (await queryRunner.hasTable('subscriptions')) {
      await queryRunner.dropTable('subscriptions', true, true, true);
    }
  }

  private async createSubscriptionsTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    if (await queryRunner.hasTable('subscriptions')) return;

    await queryRunner.createTable(
      new Table({
        name: 'subscriptions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'user_id', type: 'uuid' },
          { name: 'plan', type: 'varchar' },
          { name: 'provider', type: 'varchar' },
          {
            name: 'provider_subscription_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'provider_customer_id',
            type: 'varchar',
            isNullable: true,
          },
          { name: 'billing_cycle', type: 'varchar' },
          { name: 'status', type: 'varchar' },
          { name: 'current_period_start', type: 'timestamp' },
          { name: 'current_period_end', type: 'timestamp' },
          { name: 'pending_plan', type: 'varchar', isNullable: true },
          {
            name: 'pending_plan_effective_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expiration_warning_sent_at',
            type: 'timestamp',
            isNullable: true,
          },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createIndex(
      'subscriptions',
      new TableIndex({
        name: 'IDX_subscriptions_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'subscriptions',
      new TableForeignKey({
        name: 'FK_subscriptions_user_id_users_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  private async createCreditPurchasesTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    if (await queryRunner.hasTable('credit_purchases')) return;

    await queryRunner.createTable(
      new Table({
        name: 'credit_purchases',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'user_id', type: 'uuid' },
          { name: 'package_id', type: 'varchar' },
          { name: 'credits_amount', type: 'int' },
          { name: 'provider', type: 'varchar' },
          {
            name: 'provider_session_id',
            type: 'varchar',
            isNullable: true,
          },
          { name: 'status', type: 'varchar' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createIndex(
      'credit_purchases',
      new TableIndex({
        name: 'IDX_credit_purchases_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'credit_purchases',
      new TableIndex({
        name: 'IDX_credit_purchases_provider_session_id',
        columnNames: ['provider_session_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'credit_purchases',
      new TableForeignKey({
        name: 'FK_credit_purchases_user_id_users_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  private async alterUsersTable(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('users', 'is_email_verified'))) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "is_email_verified" boolean NOT NULL DEFAULT false`,
      );
      await queryRunner.query(
        `UPDATE "users" SET "is_email_verified" = true WHERE "google_id" IS NOT NULL`,
      );
    }
    if (!(await queryRunner.hasColumn('users', 'email_verification_code'))) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "email_verification_code" varchar`,
      );
    }
    if (
      !(await queryRunner.hasColumn(
        'users',
        'email_verification_expires_at',
      ))
    ) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "email_verification_expires_at" timestamp`,
      );
    }
    if (!(await queryRunner.hasColumn('users', 'password_reset_code'))) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "password_reset_code" varchar`,
      );
    }
    if (
      !(await queryRunner.hasColumn('users', 'password_reset_expires_at'))
    ) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "password_reset_expires_at" timestamp`,
      );
    }
    if (!(await queryRunner.hasColumn('users', 'credits'))) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "credits" integer NOT NULL DEFAULT 0`,
      );
    }
    if (!(await queryRunner.hasColumn('users', 'extra_credits'))) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "extra_credits" integer NOT NULL DEFAULT 0`,
      );
    }
    if (!(await queryRunner.hasColumn('users', 'subscription_id'))) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "subscription_id" uuid`,
      );
      await queryRunner.createForeignKey(
        'users',
        new TableForeignKey({
          name: 'FK_users_subscription_id_subscriptions_id',
          columnNames: ['subscription_id'],
          referencedTableName: 'subscriptions',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }
}
