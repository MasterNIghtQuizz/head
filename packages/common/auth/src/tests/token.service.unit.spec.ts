import { vi, describe, it, expect, afterEach } from "vitest";
import { TokenService } from "../services/token.service.js";
import { CryptoService } from "common-crypto";
import { TokenType } from "../enums.js";
import type {
  GameTokenPayload,
  AccessTokenPayload,
  InternalTokenPayload,
} from "../types.d.ts";

describe("TokenService (Unit Test)", () => {
  const privateKeyPath = "/path/to/private.pem";

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should sign a game token with correct payload and type", () => {
    const payload = {
      sessionId: "session-123",
      participantId: "part-123",
      role: "moderator",
    } as unknown as GameTokenPayload;
    const signSpy = vi
      .spyOn(CryptoService, "sign")
      .mockReturnValue("mock.token");

    const token = TokenService.signGameToken(payload, privateKeyPath);

    expect(signSpy).toHaveBeenCalledWith(
      {
        ...payload,
        type: TokenType.GAME,
      },
      privateKeyPath,
      expect.objectContaining({ expiresIn: "6h" }),
    );
    expect(token).toBe("mock.token");
  });

  it("should sign an access token with correct payload and type", () => {
    const payload = {
      userId: "user-123",
      role: "admin",
    } as unknown as AccessTokenPayload;
    const signSpy = vi
      .spyOn(CryptoService, "sign")
      .mockReturnValue("mock.token");

    const token = TokenService.signAccessToken(payload, privateKeyPath);

    expect(signSpy).toHaveBeenCalledWith(
      {
        ...payload,
        type: TokenType.ACCESS,
      },
      privateKeyPath,
      expect.objectContaining({ expiresIn: "15m" }),
    );
    expect(token).toBe("mock.token");
  });

  it("should sign an internal token with correct payload and type", () => {
    const payload = {
      userId: "user-123",
      role: "admin",
      source: "test",
    } as unknown as InternalTokenPayload;
    const signSpy = vi
      .spyOn(CryptoService, "sign")
      .mockReturnValue("mock.token");

    const token = TokenService.signInternalToken(payload, privateKeyPath);

    expect(signSpy).toHaveBeenCalledWith(
      {
        ...payload,
        type: TokenType.INTERNAL,
      },
      privateKeyPath,
      expect.objectContaining({ expiresIn: "30s" }),
    );
    expect(token).toBe("mock.token");
  });
});
