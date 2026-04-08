import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileExtraFields20260407300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE profiles
        ADD COLUMN IF NOT EXISTS logo_url          VARCHAR,
        ADD COLUMN IF NOT EXISTS target_audience    VARCHAR,
        ADD COLUMN IF NOT EXISTS tone_of_voice      VARCHAR,
        ADD COLUMN IF NOT EXISTS keywords           JSONB,
        ADD COLUMN IF NOT EXISTS forbidden_words    JSONB,
        ADD COLUMN IF NOT EXISTS communication_goal VARCHAR,
        ADD COLUMN IF NOT EXISTS preferred_cta      VARCHAR,
        ADD COLUMN IF NOT EXISTS brand_differentials TEXT,
        ADD COLUMN IF NOT EXISTS notes              TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE profiles
        DROP COLUMN IF EXISTS logo_url,
        DROP COLUMN IF EXISTS target_audience,
        DROP COLUMN IF EXISTS tone_of_voice,
        DROP COLUMN IF EXISTS keywords,
        DROP COLUMN IF EXISTS forbidden_words,
        DROP COLUMN IF EXISTS communication_goal,
        DROP COLUMN IF EXISTS preferred_cta,
        DROP COLUMN IF EXISTS brand_differentials,
        DROP COLUMN IF EXISTS notes
    `);
  }
}
