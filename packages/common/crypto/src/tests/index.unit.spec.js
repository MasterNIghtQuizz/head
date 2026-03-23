// @ts-nocheck
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { CryptoService } from "../index.js";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import logger, { mockLogger } from "common-logger";

vi.mock("jsonwebtoken");
vi.mock("node:fs");

describe("CryptoService Unit Tests (Guard/Hook Unit Test)", () => {
  beforeEach(() => {
    mockLogger(vi);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sign method", () => {
    it("should sign and return a token successfully when the private key is found", () => {
      const payload = { userId: "123" };
      const privateKeyPath = "/fake/path/private.pem";
      const privateKeyContent = "fake-private-key";
      const generatedToken = "signed.jwt.token";

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(privateKeyContent);
      vi.mocked(jwt.sign).mockReturnValue(generatedToken);

      const token = CryptoService.sign(payload, privateKeyPath, {
        expiresIn: "30d",
      });

      expect(fs.existsSync).toHaveBeenCalledWith(privateKeyPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(privateKeyPath, "utf-8");
      expect(jwt.sign).toHaveBeenCalledWith(payload, privateKeyContent, {
        algorithm: "RS256",
        expiresIn: "30d",
      });
      expect(token).toBe(generatedToken);
    });

    it("should throw an error if the private key does not exist", () => {
      const privateKeyPath = "/fake/path/private.pem";

      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => CryptoService.sign({}, privateKeyPath)).toThrow(
        `Private key not found at: ${privateKeyPath}`,
      );

      expect(logger.error).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error), privateKeyPath },
        "JWT sign failed",
      );
    });

    it("should log the error and throw when jwt.sign fails", () => {
      const privateKeyPath = "/fake/path/private.pem";
      const privateKeyContent = "fake-private-key";
      const errorMsg = "Signing error component";

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(privateKeyContent);
      vi.mocked(jwt.sign).mockImplementation(() => {
        throw new Error(errorMsg);
      });

      expect(() => CryptoService.sign({}, privateKeyPath)).toThrow(errorMsg);

      expect(logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error), privateKeyPath },
        "JWT sign failed",
      );
    });
  });

  describe("verify method", () => {
    it("should verify and return decoded payload successfully when the public key is found", () => {
      const token = "signed.jwt.token";
      const publicKeyPath = "/fake/path/public.pem";
      const publicKeyContent = "fake-public-key";
      const decodedPayload = { userId: "123", role: "ADMIN" };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(publicKeyContent);
      vi.mocked(jwt.verify).mockReturnValue(decodedPayload);

      const result = CryptoService.verify(token, publicKeyPath);

      expect(fs.existsSync).toHaveBeenCalledWith(publicKeyPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(publicKeyPath, "utf-8");
      expect(jwt.verify).toHaveBeenCalledWith(token, publicKeyContent, {
        algorithms: ["RS256"],
      });
      expect(result).toBe(decodedPayload);
    });

    it("should throw an error if the public key does not exist", () => {
      const publicKeyPath = "/fake/path/public.pem";

      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => CryptoService.verify("token", publicKeyPath)).toThrow(
        `Public key not found at: ${publicKeyPath}`,
      );

      expect(logger.error).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error), publicKeyPath },
        "JWT verify failed",
      );
    });

    it("should log the error and throw when jwt.verify fails", () => {
      const publicKeyPath = "/fake/path/public.pem";
      const publicKeyContent = "fake-public-key";
      const errorMsg = "Verification failed invalid signature";

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(publicKeyContent);
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error(errorMsg);
      });

      expect(() => CryptoService.verify("token", publicKeyPath)).toThrow(
        errorMsg,
      );

      expect(logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error), publicKeyPath },
        "JWT verify failed",
      );
    });
  });
});
