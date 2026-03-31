/** @type {import("typeorm").MigrationInterface} */
export class CreateSessionsAndParticipantsTables1774942938 {
  /**
   * @param {import('typeorm').QueryRunner} queryRunner
   */
  async up(queryRunner) {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "sessions" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "public_key" character varying NOT NULL,
      "status" character varying NOT NULL,
      "current_question_id" character varying,
      "quizz_id" character varying NOT NULL,
      "host_id" character varying NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_sessions_public_key" UNIQUE ("public_key"),
      CONSTRAINT "PK_sessions" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "participants" (
      "id"         uuid              NOT NULL DEFAULT gen_random_uuid(),
      "nickname"   character varying NOT NULL,
      "socket_id"  character varying NOT NULL,
      "role"       character varying NOT NULL,
      "session_id" uuid              NOT NULL,
      "createdAt"  TIMESTAMP         NOT NULL DEFAULT now(),
      CONSTRAINT "PK_participants" PRIMARY KEY ("id"),
      CONSTRAINT "FK_participants_session_id"
        FOREIGN KEY ("session_id")
        REFERENCES "sessions"("id")
        ON DELETE CASCADE)`,
    );
  }

  /**
   * @param {import('typeorm').QueryRunner} queryRunner
   */
  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "participants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
  }
}
