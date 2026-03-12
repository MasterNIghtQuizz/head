import jwt from "jsonwebtoken";
import fs from "node:fs";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
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

  /**
   * @param {string} password
   * @returns {Promise<string>}
   */
  static async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  /**
   * @param {string} password
   * @param {string} hash
   * @returns {Promise<boolean>}
   */
  static async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * @param {string} text
   * @param {string} secretKey
   * @returns {string}
   */
  static encrypt(text, secretKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(secretKey, "hex"),
      iv,
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  }

  /**
   * @param {string} text
   * @param {string} secretKey
   * @returns {string}
   */
  static decrypt(text, secretKey) {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift() || "", "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(secretKey, "hex"),
      iv,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  /**
   * @param {string} text
   * @returns {string}
   */
  static sha256Hash(text) {
    return crypto.createHash("sha256").update(text).digest("hex");
  }
}
