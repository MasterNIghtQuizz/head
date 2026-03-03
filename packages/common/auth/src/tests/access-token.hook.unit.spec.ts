import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { hookAccessToken } from "../hooks/access-token.hook.js";
import { CryptoService } from "common-crypto";
import logger from "common-logger";
import { createExecutionContext } from "./test-helpers.js";
import { UserRole } from "../enums.js";

describe("hookAccessToken (Guard/Hook Unit Test)", () => {
  const options = { publicKeyPath: "/path/to/public.pem" };
  let hook: (request: any, reply: any, done: () => void) => void;

  beforeEach(() => {
    hook = hookAccessToken(options);
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

  it("should return 401 if access-token header is missing", () => {
    const { request, reply, done } = createExecutionContext();
    const loggerSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    hook(request, reply, done);

    expect(loggerSpy).toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({
      error: "Missing access-token header",
    });
    expect(done).not.toHaveBeenCalled();
  });

  it("should return 401 if access token is invalid or expired", () => {
    const { request, reply, done } = createExecutionContext({
      "access-token": "invalid.token",
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
      error: "Invalid or expired access token",
    });
    expect(done).not.toHaveBeenCalled();
  });

  it("should append user to request and call done() if token is valid", () => {
    const { request, reply, done } = createExecutionContext({
      "access-token": "valid.token",
    });
    const mockPayload = { userId: "123", role: UserRole.ADMIN, type: "access" };
    const cryptoSpy = vi
      .spyOn(CryptoService, "verify")
      .mockReturnValue(mockPayload);

    hook(request, reply, done);

    expect(cryptoSpy).toHaveBeenCalledWith(
      "valid.token",
      options.publicKeyPath,
    );
    expect(request.user).toEqual(mockPayload);
    expect(done).toHaveBeenCalled();
    expect(reply.code).not.toHaveBeenCalled();
  });
});
