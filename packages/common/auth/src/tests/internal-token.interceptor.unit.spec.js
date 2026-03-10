// @ts-nocheck
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { hookInternalTokenInterceptor } from "../interceptors/internal-token.interceptor.js";
import { CryptoService } from "common-crypto";
import logger from "common-logger";
import { createExecutionContext } from "./test-helpers.js";
import { UserRole } from "../enums.js";

describe("hookInternalTokenInterceptor (Interceptor Unit Test)", () => {
  /** @type {import('../types.d.ts').InternalTokenInterceptorOptions} */
  const options = {
    privateKeyPath: "/path/to/private.pem",
    source: "test-source",
    expiresIn: "10s",
  };

  /** @type {import('fastify').onRequestHookHandler} */
  let hook;

  beforeEach(() => {
    // @ts-ignore
    hook = hookInternalTokenInterceptor(options);
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

  it("should return 401 if request.user is missing or incomplete", async () => {
    const { request, reply, done, fastify } = createExecutionContext();
    const loggerSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    await hook.call(fastify, request, reply, done);

    expect(loggerSpy).toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({
      error: "Unauthorized: Missing user context",
    });
    expect(done).not.toHaveBeenCalled();

    vi.clearAllMocks();
    const {
      request: req2,
      reply: rep2,
      done: done2,
      fastify: fast2,
    } = createExecutionContext({}, { userId: "partial" });
    await hook.call(fast2, req2, rep2, done2);

    expect(loggerSpy).toHaveBeenCalled();
    expect(rep2.code).toHaveBeenCalledWith(401);
    expect(done2).not.toHaveBeenCalled();
  });

  it("should sign payload and attach internal-token to request if user is valid", async () => {
    /** @type {any} */
    const { request, reply, done, fastify } = createExecutionContext(
      {},
      { userId: "456", role: UserRole.USER },
    );
    const cryptoSpy = vi
      .spyOn(CryptoService, "sign")
      .mockReturnValue("signed.internal.token");

    await hook.call(fastify, request, reply, done);

    expect(cryptoSpy).toHaveBeenCalledWith(
      {
        userId: "456",
        role: UserRole.USER,
        type: "internal",
        source: "test-source",
      },
      options.privateKeyPath,
      { expiresIn: "10s" },
    );
    expect(request.headers["internal-token"]).toBe("signed.internal.token");
    expect(request.internalToken).toBe("signed.internal.token");
    expect(done).toHaveBeenCalled();
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("should return 500 if internal token generation throws an error", async () => {
    const { request, reply, done, fastify } = createExecutionContext(
      {},
      { userId: "456", role: UserRole.USER },
    );
    vi.spyOn(CryptoService, "sign").mockImplementation(() => {
      throw new Error("Sign failure");
    });
    const loggerSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    await hook.call(fastify, request, reply, done);

    expect(loggerSpy).toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({
      error: "Internal token generation failed",
    });
    expect(done).not.toHaveBeenCalled();
  });
});
