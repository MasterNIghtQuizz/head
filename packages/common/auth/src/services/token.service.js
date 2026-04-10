import { CryptoService } from "common-crypto";
import { TokenType } from "../enums.js";

export class TokenService {
  /**
   * @param {import('../types.d.ts').GameTokenPayload} payload
   * @param {string} privateKeyPath
   * @param {Object} [options={}]
   * @returns {string}
   */
  static signGameToken(payload, privateKeyPath, options = {}) {
    return CryptoService.sign(
      {
        ...payload,
        type: TokenType.GAME,
      },
      privateKeyPath,
      {
        expiresIn: "6h",
        ...options,
      },
    );
  }

  /**
   * @param {import('../types.d.ts').AccessTokenPayload} payload
   * @param {string} privateKeyPath
   * @param {Object} [options={}]
   * @returns {string}
   */
  static signAccessToken(payload, privateKeyPath, options = {}) {
    return CryptoService.sign(
      {
        ...payload,
        type: TokenType.ACCESS,
      },
      privateKeyPath,
      {
        expiresIn: "15m",
        ...options,
      },
    );
  }

  /**
   * @param {import('../types.d.ts').InternalTokenPayload} payload
   * @param {string} privateKeyPath
   * @param {Object} [options={}]
   * @returns {string}
   */
  static signInternalToken(payload, privateKeyPath, options = {}) {
    return CryptoService.sign(
      {
        ...payload,
        type: TokenType.INTERNAL,
      },
      privateKeyPath,
      {
        expiresIn: "30s",
        ...options,
      },
    );
  }
}
