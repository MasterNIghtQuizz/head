import { TokenType } from "common-auth";
import { call } from "common-axios";
import { CryptoService } from "common-crypto";
import { config as gatewayConfig } from "../../../../config.js";

/**
 *
 * @returns {Promise<void>}
 */
export async function seed_quizz_db() {
  const internalToken = CryptoService.sign(
    {
      userId: "e2e-user",
      role: "admin",
      type: TokenType.INTERNAL,
      source: "api-gateway-e2e",
    },
    gatewayConfig.auth.internal.privateKeyPath,
    { expiresIn: "1h" },
  );
  return await ping(gatewayConfig.services.quizz, internalToken);
}
/**
 * @param {string} serviceUrl
 * @param {string} internalToken
 * @returns {Promise<void>}
 */
export async function ping(serviceUrl, internalToken, maxTry = 30) {
  for (let i = 0; i < maxTry; i++) {
    try {
      await call({
        url: `${serviceUrl}/testing/seed`,
        method: "POST",
        data: {},
        headers: { "internal-token": internalToken },
      });
      break;
    } catch (err) {
      if (i === maxTry - 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
