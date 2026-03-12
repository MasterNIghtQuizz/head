import { SignOptions } from "jsonwebtoken";

export declare class CryptoService {
  /**
   * @param payload Payload to sign
   * @param privateKeyPath Path to the RSA private key file
   * @param options Standard JWT sign options (Algorithm is forced to RS256)
   */
  static sign(
    payload: any,
    privateKeyPath: string,
    options?: SignOptions,
  ): string;

  /**
   * @param token JWT token to verify
   * @param publicKeyPath Path to the RSA public key file
   */
  static verify<T = any>(token: string, publicKeyPath: string): T;

  static hashPassword(password: string): Promise<string>;
  static comparePassword(password: string, hash: string): Promise<boolean>;
  static encrypt(text: string, secretKey: string): string;
  static decrypt(text: string, secretKey: string): string;
  static sha256Hash(text: string): string;
}
