import axios from "axios";
import { CryptoService } from "common-crypto";
import { TokenType } from "common-auth";
import path from "node:path";
import { config } from "../../../config.js";

/**
 * Seeds the database by calling the ms-quizz-management testing endpoint
 */
export async function seedDatabase() {
  const keyPath = path.resolve(config.auth.internal.privateKeyPath);

  const token = CryptoService.sign(
    {
      userId: "e2e-runner",
      role: "admin",
      type: TokenType.INTERNAL,
      source: "e2e-test-util",
    },
    keyPath,
    { expiresIn: "10m" },
  );

  const quizzUrl = config.services?.quizz || "http://localhost:4012";
  
  await axios.post(`${quizzUrl}/testing/seed`, {}, {
    headers: {
      "internal-token": token
    }
  });
}
