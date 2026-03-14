import { CryptoService } from "common-crypto";
import { UserRole } from "common-auth";
import { config } from "../config.js";

/**
 * @param {import('typeorm').DataSource} datasource
 */
export async function seedTestData(datasource) {
  await datasource.query("TRUNCATE TABLE users CASCADE");

  const secretKey = config.security.encryptionKey;

  const adminEmail = "admin@test.com";
  const adminPassword = await CryptoService.hashPassword(adminEmail);
  const adminEmailHash = CryptoService.sha256Hash(adminEmail);
  const encryptedAdminEmail = CryptoService.encrypt(adminEmail, secretKey);

  await datasource.query(
    `INSERT INTO users (id, email, "emailHash", password, role) VALUES ($1, $2, $3, $4, $5)`,
    [
      "550e8400-e29b-41d4-a716-446655440100",
      encryptedAdminEmail,
      adminEmailHash,
      adminPassword,
      UserRole.ADMIN,
    ],
  );

  const userEmail = "user@test.com";
  const userPassword = await CryptoService.hashPassword("user123");
  const userEmailHash = CryptoService.sha256Hash(userEmail);
  const encryptedUserEmail = CryptoService.encrypt(userEmail, secretKey);

  await datasource.query(
    `INSERT INTO users (id, email, "emailHash", password, role) VALUES ($1, $2, $3, $4, $5)`,
    [
      "550e8400-e29b-41d4-a716-446655440101",
      encryptedUserEmail,
      userEmailHash,
      userPassword,
      UserRole.USER,
    ],
  );
}
