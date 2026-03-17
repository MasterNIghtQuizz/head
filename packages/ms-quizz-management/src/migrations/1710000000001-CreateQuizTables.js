/** @type {import('typeorm').MigrationInterface} */
export class CreateQuizTables1710000000001 {
  name = "CreateQuizTables1710000000001";

  // @ts-ignore
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quizzes" (
        "id"          uuid              NOT NULL DEFAULT gen_random_uuid(),
        "title"       character varying NOT NULL,
        "description" text,
        "createdAt"   TIMESTAMP         NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quizzes" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "question" (
        "id"            uuid              NOT NULL DEFAULT gen_random_uuid(),
        "label"         character varying NOT NULL,
        "type"          character varying NOT NULL,
        "order_index"   integer           NOT NULL,
        "timer_seconds" integer           NOT NULL,
        "quiz_id"       uuid,
        CONSTRAINT "PK_question" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "choice" (
        "id"          uuid              NOT NULL DEFAULT gen_random_uuid(),
        "text"        character varying NOT NULL,
        "is_correct"  boolean           NOT NULL,
        "question_id" uuid,
        CONSTRAINT "PK_choice" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "question"
        ADD CONSTRAINT "FK_question_quiz"
        FOREIGN KEY ("quiz_id")
        REFERENCES "quizzes"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "choice"
        ADD CONSTRAINT "FK_choice_question"
        FOREIGN KEY ("question_id")
        REFERENCES "question"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  // @ts-ignore
  async down(queryRunner) {
    await queryRunner.query(
      `ALTER TABLE "choice" DROP CONSTRAINT "FK_choice_question"`,
    );
    await queryRunner.query(
      `ALTER TABLE "question" DROP CONSTRAINT "FK_question_quiz"`,
    );
    await queryRunner.query(`DROP TABLE "choice"`);
    await queryRunner.query(`DROP TABLE "question"`);
    await queryRunner.query(`DROP TABLE "quizzes"`);
  }
}
