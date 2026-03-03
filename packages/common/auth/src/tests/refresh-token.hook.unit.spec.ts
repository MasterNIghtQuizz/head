import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { hookRefreshToken } from "../hooks/refresh-token.hook.js";
import { CryptoService } from "common-crypto";
import logger from "common-logger";
import { createExecutionContext } from "./test-helpers.js";

describe("hookRefreshToken (Guard/Hook Unit Test)", () => {
  const options = { publicKeyPath: "/path/to/public.pem" };
  let hook: (request: any, reply: any, done: () => void) => void;

  beforeEach(() => {
    hook = hookRefreshToken(options);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call done() immediately and not process if the route is public", () => {
    const { request, reply, done } = createExecutionContext();
    request.routeOptions = { config: { isPublic: true } };

    hook(request, reply, done);

    expect(done).toHaveBeenCalled();
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("should return 401 if refresh-token header is missing", () => {
    const { request, reply, done } = createExecutionContext();
    const loggerSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    hook(request, reply, done);

    expect(loggerSpy).toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({
      error: "Missing refresh-token header",
    });
    expect(done).not.toHaveBeenCalled();
  });

  it("should return 401 if refresh token is invalid or expired", () => {
    const { request, reply, done } = createExecutionContext({
      "refresh-token": "invalid.token",
    });
    const cryptoSpy = vi
      .spyOn(CryptoService, "verify")
      .mockImplementation(() => {
        throw new Error("Invalid signature");
      });
    const loggerSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    hook(request, reply, done);

    expect(cryptoSpy).toHaveBeenCalledWith(
      "invalid.token",
      options.publicKeyPath,
    );
    expect(loggerSpy).toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({
      error: "Invalid or expired refresh token",
    });
    expect(done).not.toHaveBeenCalled();
  });

  it("should append payload to request.refreshTokenPayload and call done() if token is valid", () => {
    const { request, reply, done } = createExecutionContext({
      "refresh-token": "valid.token",
    });
    const mockPayload = { userId: "123", role: "admin", type: "refresh" };
    const cryptoSpy = vi
      .spyOn(CryptoService, "verify")
      .mockReturnValue(mockPayload);

    hook(request, reply, done);

    expect(cryptoSpy).toHaveBeenCalledWith(
      "valid.token",
      options.publicKeyPath,
    );
    expect(request.refreshTokenPayload).toEqual(mockPayload);
    expect(done).toHaveBeenCalled();
    expect(reply.code).not.toHaveBeenCalled();
  });
});
