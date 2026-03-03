import jwt from "jsonwebtoken";
import fs from "node:fs";
import logger from "common-logger";

export class CryptoService {
  /**
   * @param {Object} payload
   * @param {string} privateKeyPath
   * @param {Object} [options={}]
   * @returns {string}
   */
  static sign(payload, privateKeyPath, options = {}) {
    try {
      if (!fs.existsSync(privateKeyPath)) {
        throw new Error(`Private key not found at: ${privateKeyPath}`);
      }
      const privateKey = fs.readFileSync(privateKeyPath, "utf-8");
      return jwt.sign(payload, privateKey, {
        algorithm: "RS256",
        ...options,
      });
    } catch (error) {
      logger.error({ error, privateKeyPath }, "JWT sign failed");
      throw error;
    }
  }

  /**
   * @param {string} token
   * @param {string} publicKeyPath
   * @returns {Object|string}
   */
  static verify(token, publicKeyPath) {
    try {
      if (!fs.existsSync(publicKeyPath)) {
        throw new Error(`Public key not found at: ${publicKeyPath}`);
      }
      const publicKey = fs.readFileSync(publicKeyPath, "utf-8");
      return jwt.verify(token, publicKey, {
        algorithms: ["RS256"],
      });
    } catch (error) {
      logger.error({ error, publicKeyPath }, "JWT verify failed");
      throw error;
    }
  }
}
