import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { hookInternalTokenInterceptor } from "../interceptors/internal-token.interceptor.js";
import { CryptoService } from "common-crypto";
import logger from "common-logger";
import { createExecutionContext } from "./test-helpers.js";
import { UserRole } from "../enums.js";
import type { InternalTokenInterceptorOptions } from "../types.js";

describe("hookInternalTokenInterceptor (Interceptor Unit Test)", () => {
  const options: InternalTokenInterceptorOptions = {
    privateKeyPath: "/path/to/private.pem",
    source: "test-source",
    expiresIn: "10s",
  };
  let hook: (request: any, reply: any, done: () => void) => void;

  beforeEach(() => {
    hook = hookInternalTokenInterceptor(options);
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

  it("should return 401 if request.user is missing or incomplete", () => {
    let { request, reply, done } = createExecutionContext();
    const loggerSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    hook(request, reply, done);

    expect(loggerSpy).toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({
      error: "Unauthorized: Missing user context",
    });
    expect(done).not.toHaveBeenCalled();

    vi.clearAllMocks();
    ({ request, reply, done } = createExecutionContext(
      {},
      { userId: "partial" },
    ));
    hook(request, reply, done);

    expect(loggerSpy).toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(done).not.toHaveBeenCalled();
  });

  it("should sign payload and attach internal-token to request if user is valid", () => {
    const { request, reply, done } = createExecutionContext(
      {},
      { userId: "456", role: UserRole.USER },
    );
    const cryptoSpy = vi
      .spyOn(CryptoService, "sign")
      .mockReturnValue("signed.internal.token");

    hook(request, reply, done);

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

  it("should return 500 if internal token generation throws an error", () => {
    const { request, reply, done } = createExecutionContext(
      {},
      { userId: "456", role: UserRole.USER },
    );
    vi.spyOn(CryptoService, "sign").mockImplementation(() => {
      throw new Error("Sign failure");
    });
    const loggerSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    hook(request, reply, done);

    expect(loggerSpy).toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({
      error: "Internal token generation failed",
    });
    expect(done).not.toHaveBeenCalled();
  });
});
