export class CreateProcessedEventsTable1710000000000 {
  /**
   * @param {import('typeorm').QueryRunner} queryRunner
   */
  async up(queryRunner) {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "processed_events" ("id" character varying NOT NULL, "topic" character varying NOT NULL, "processedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_processed_events" PRIMARY KEY ("id"))`
    );
  }

  /**
   * @param {import('typeorm').QueryRunner} queryRunner
   */
  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "processed_events"`);
  }
}
