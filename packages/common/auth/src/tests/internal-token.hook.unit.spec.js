// @ts-nocheck
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { hookInternalToken } from "../hooks/internal-token.hook.js";
import { CryptoService } from "common-crypto";
import logger from "common-logger";
import { createExecutionContext } from "./test-helpers.js";
import { UserRole } from "../enums.js";

describe("hookInternalToken (Guard/Hook Unit Test)", () => {
  /** @type {import('../types.d.ts').AuthHookOptions} */
  const options = { publicKeyPath: "/path/to/public.pem" };

  /** @type {import('fastify').onRequestHookHandler} */
  let hook;

  beforeEach(() => {
    // @ts-ignore
    hook = hookInternalToken(options);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call done() immediately and not process if the route is public", async () => {
    const { request, reply, done, fastify } = createExecutionContext();
    request.routeOptions = { config: { isPublic: true } };

    await hook.call(fastify, request, reply, done);

    expect(done).toHaveBeenCalled();
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("should return 401 if internal-token header is missing", async () => {
    const { request, reply, done, fastify } = createExecutionContext();
    const loggerSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    await hook.call(fastify, request, reply, done);

    expect(loggerSpy).toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({
      error: "Missing internal-token header",
    });
    expect(done).not.toHaveBeenCalled();
  });

  it("should return 401 if internal token is invalid or expired", async () => {
    const { request, reply, done, fastify } = createExecutionContext({
      "internal-token": "invalid.token",
    });
    const cryptoSpy = vi
      .spyOn(CryptoService, "verify")
      // @ts-ignore
      .mockImplementation(() => {
        throw new Error("Invalid signature");
      });
    const loggerSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    await hook.call(fastify, request, reply, done);

    expect(cryptoSpy).toHaveBeenCalledWith(
      "invalid.token",
      options.publicKeyPath,
    );
    expect(loggerSpy).toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({
      error: "Invalid or expired internal token",
    });
    expect(done).not.toHaveBeenCalled();
  });

  it("should populate request.internalTokenPayload and request.user correctly and call done() if token is valid", async () => {
    const { request, reply, done, fastify } = createExecutionContext({
      "internal-token": "valid.token",
    });
    /** @type {import('../types.d.ts').InternalTokenPayload} */
    const mockPayload = {
      userId: "123",
      role: UserRole.ADMIN,
      type: "internal",
      source: "api-gateway",
    };
    const cryptoSpy = vi
      .spyOn(CryptoService, "verify")
      .mockReturnValue(mockPayload);

    await hook.call(fastify, request, reply, done);

    expect(cryptoSpy).toHaveBeenCalledWith(
      "valid.token",
      options.publicKeyPath,
    );
    expect(request.internalTokenPayload).toEqual(mockPayload);
    expect(request.user).toEqual({
      userId: "123",
      role: UserRole.ADMIN,
      type: "internal",
    });
    expect(done).toHaveBeenCalled();
    expect(reply.code).not.toHaveBeenCalled();
  });
});
