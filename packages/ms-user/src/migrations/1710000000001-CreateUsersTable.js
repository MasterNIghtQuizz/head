/** @type {import('typeorm').MigrationInterface} */
export class CreateUsersTable1710000000001 {
  name = "CreateUsersTable1710000000001";

  /**
   * @param {import('typeorm').QueryRunner} queryRunner
   */
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "emailHash" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_emailHash" UNIQUE ("emailHash")
      )
    `);
  }

  /**
   * @param {import('typeorm').QueryRunner} queryRunner
   */
  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
