import axios from "axios";
import { CryptoService } from "common-crypto";
import { TokenType } from "common-auth";
import path from "node:path";
import { config } from "../../../config.js";

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

  const quizzUrl = config.services.quizz;
  const userUrl = config.services.user;
  const sessionUrl = config.services.session;
  const responseUrl = config.services.response;

  await Promise.all([
    axios.post(
      `${quizzUrl}/testing/seed`,
      {},
      {
        headers: { "internal-token": token },
      },
    ),
    axios.post(
      `${userUrl}/testing/seed`,
      {},
      {
        headers: { "internal-token": token },
      },
    ),
    axios.post(
      `${sessionUrl}/testing/seed`,
      {},
      {
        headers: { "internal-token": token },
      },
    ),
    axios.post(
      `${responseUrl}/testing/seed`,
      {},
      {
        headers: { "internal-token": token },
      },
    ),
  ]);
}
