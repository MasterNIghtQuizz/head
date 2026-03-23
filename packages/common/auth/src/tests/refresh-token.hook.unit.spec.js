// @ts-nocheck
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { hookRefreshToken } from "../hooks/refresh-token.hook.js";
import { CryptoService } from "common-crypto";
import logger, { mockLogger } from "common-logger";
import { createExecutionContext } from "./test-helpers.js";
import { UnauthorizedError } from "common-errors";

describe("hookRefreshToken (Guard/Hook Unit Test)", () => {
  const options = { publicKeyPath: "/path/to/public.pem" };
  let hook;

  beforeEach(() => {
    mockLogger(vi);
    hook = hookRefreshToken(options);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call done() immediately and not process if the route is public", async () => {
    const { request, reply, done, fastify } = createExecutionContext();
    request.routeOptions = {
      config: { isPublic: true, useRefreshToken: true },
    };

    await hook.call(fastify, request, reply, done);

    expect(done).toHaveBeenCalledWith();
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("should call done() immediately and not process if useRefreshToken is false", async () => {
    const { request, reply, done, fastify } = createExecutionContext();
    request.routeOptions = { config: { useRefreshToken: false } };

    await hook.call(fastify, request, reply, done);

    expect(done).toHaveBeenCalledWith();
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("should call done(error) if refresh-token header is missing", async () => {
    const { request, reply, done, fastify } = createExecutionContext();
    request.routeOptions = { config: { useRefreshToken: true } };
    const loggerSpy = logger.warn;

    await hook.call(fastify, request, reply, done);

    expect(loggerSpy).toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    const error = done.mock.calls[0][0];
    expect(error.message).toBe("Missing refresh-token header");
  });

  it("should call done(error) if refresh token is invalid or expired", async () => {
    const { request, reply, done, fastify } = createExecutionContext({
      "refresh-token": "invalid.token",
    });
    request.routeOptions = { config: { useRefreshToken: true } };
    const cryptoSpy = vi
      .spyOn(CryptoService, "verify")
      .mockImplementation(() => {
        throw new Error("Invalid signature");
      });
    const loggerSpy = logger.warn;

    await hook.call(fastify, request, reply, done);

    expect(cryptoSpy).toHaveBeenCalledWith(
      "invalid.token",
      options.publicKeyPath,
    );
    expect(loggerSpy).toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    const error = done.mock.calls[0][0];
    expect(error.message).toBe("Invalid or expired refresh token");
  });

  it("should append user to request and call done() if token is valid", async () => {
    const { request, reply, done, fastify } = createExecutionContext({
      "refresh-token": "valid.token",
    });
    request.routeOptions = { config: { useRefreshToken: true } };
    const mockPayload = { userId: "123", role: "admin", type: "refresh" };
    const cryptoSpy = vi
      .spyOn(CryptoService, "verify")
      .mockReturnValue(mockPayload);

    await hook.call(fastify, request, reply, done);

    expect(cryptoSpy).toHaveBeenCalledWith(
      "valid.token",
      options.publicKeyPath,
    );
    expect(request.user).toEqual(mockPayload);
    expect(done).toHaveBeenCalledWith();
    expect(reply.code).not.toHaveBeenCalled();
  });
});
