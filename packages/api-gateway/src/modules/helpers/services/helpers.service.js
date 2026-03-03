import { CryptoService } from "common-crypto";
import { BaseService } from "common-core";
import { config } from "../../../config.js";

export class HelpersService extends BaseService {
  /**
   * Generates an infinite internal token.
   * @returns {string}
   */
  generateInfiniteToken() {
    return CryptoService.sign(
      {
        type: "internal",
        service: "api-gateway",
        role: "internal",
      },
      config.auth.internal.privateKeyPath,
      {
        expiresIn: "36500d", // 100 years
      },
    );
  }

  /**
   * Generates an infinite access token (100 years).
   * @param {string} userId
   * @param {string} role
   * @returns {string}
   */
  generateInfiniteAccessToken(userId = "helper-user", role = "admin") {
    return CryptoService.sign(
      {
        type: "access",
        userId,
        role,
      },
      config.auth.access.privateKeyPath,
      {
        expiresIn: "36500d", // 100 years
      },
    );
  }

  /**
   * Generates an infinite refresh token (100 years).
   * @param {string} userId
   * @param {string} role
   * @returns {string}
   */
  generateInfiniteRefreshToken(userId = "helper-user", role = "admin") {
    return CryptoService.sign(
      {
        type: "refresh",
        userId,
        role,
      },
      config.auth.refresh.privateKeyPath,
      {
        expiresIn: "36500d", // 100 years
      },
    );
  }
}
