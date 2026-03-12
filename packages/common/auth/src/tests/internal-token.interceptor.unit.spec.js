// @ts-nocheck
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { hookInternalTokenInterceptor } from "../interceptors/internal-token.interceptor.js";
import { CryptoService } from "common-crypto";
import logger from "common-logger";
import { createExecutionContext } from "./test-helpers.js";
import { UserRole, TokenType } from "../enums.js";
import { InternalServerError, UnauthorizedError } from "common-errors";

describe("hookInternalTokenInterceptor (Interceptor Unit Test)", () => {
  const options = {
    privateKeyPath: "/path/to/private.pem",
    source: "test-source",
    expiresIn: "10s",
  };

  let hook;

  beforeEach(() => {
    hook = hookInternalTokenInterceptor(options);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call done() immediately and not process if the route is public", async () => {
    const { request, reply, done, fastify } = createExecutionContext();
    request.routeOptions = { config: { isPublic: true } };

    await hook.call(fastify, request, reply, done);

    expect(done).toHaveBeenCalledWith();
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("should call done(error) if request.user is missing or incomplete", async () => {
    const { request, reply, done, fastify } = createExecutionContext();
    const loggerSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    await hook.call(fastify, request, reply, done);

    expect(loggerSpy).toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(done.mock.calls[0][0].message).toBe(
      "Unauthorized: Missing user context",
    );

    vi.clearAllMocks();
    const {
      request: req2,
      reply: rep2,
      done: done2,
      fastify: fast2,
    } = createExecutionContext({}, { userId: "partial" });
    await hook.call(fast2, req2, rep2, done2);

    expect(loggerSpy).toHaveBeenCalled();
    expect(done2).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it("should sign payload and attach internal-token to request if user is valid", async () => {
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
        type: TokenType.INTERNAL,
        source: "test-source",
      },
      options.privateKeyPath,
      { expiresIn: "10s" },
    );
    expect(request.headers["internal-token"]).toBe("signed.internal.token");
    expect(request.internalToken).toBe("signed.internal.token");
    expect(done).toHaveBeenCalledWith();
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("should call done(error) if internal token generation throws an error", async () => {
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
    expect(done).toHaveBeenCalledWith(expect.any(InternalServerError));
    expect(done.mock.calls[0][0].message).toBe(
      "Internal token generation failed",
    );
  });
});
