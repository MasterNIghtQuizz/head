export class CreateResponseTable1710000000000 {
  /**
   * @param {import('typeorm').QueryRunner} queryRunner
   */
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "response" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "participant_id" uuid NOT NULL,
        "question_id" uuid NOT NULL,
        "session_id" uuid NOT NULL,
        "choice_id" uuid NULL,
        "is_correct" boolean NULL,
        "submitted_at" TIMESTAMP NOT NULL DEFAULT now()
        )
    `);
  }

  /**
   * @param {import('typeorm').QueryRunner} queryRunner
   */
  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "response"`);
  }
}
