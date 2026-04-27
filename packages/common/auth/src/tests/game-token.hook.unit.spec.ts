import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { hookGameToken } from "../hooks/game-token.hook.js";
import { CryptoService } from "common-crypto";
import logger, { mockLogger } from "common-logger";
import { createExecutionContext } from "./test-helpers.js";
import { UnauthorizedError } from "common-errors";
import { TokenType } from "../enums.js";
import { onRequestHookHandler } from "fastify";
import { Mock } from "vitest";

describe("hookGameToken (Guard/Hook Unit Test)", () => {
  const options = { publicKeyPath: "/path/to/public.pem" };
  let hook: onRequestHookHandler;

  beforeEach(() => {
    mockLogger(vi);
    hook = hookGameToken(options);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call done() immediately and not process if the route is public", async () => {
    const { request, reply, done, fastify } = createExecutionContext(
      {},
      undefined,
      true,
    );

    await hook.call(fastify, request, reply, done);

    expect(done).toHaveBeenCalledWith();
  });

  it("should call done(error) if game-token header is missing", async () => {
    const { request, reply, done, fastify } = createExecutionContext();
    request.routeOptions.config.useGameToken = true;
    const loggerSpy = vi.spyOn(logger, "warn");

    await hook.call(fastify, request, reply, done);

    expect(loggerSpy).toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    const error = (done as unknown as Mock).mock.calls[0][0];
    expect(error.message).toBe("Missing game-token header");
  });

  it("should call done() without error if websocket handshake is missing game-token (delegating to service)", async () => {
    const { request, reply, done, fastify } = createExecutionContext();
    request.url = "/ws/session";
    request.headers = { upgrade: "websocket" };
    request.query = {};

    await hook.call(fastify, request, reply, done);

    expect(done).toHaveBeenCalledWith();
    expect(request.gameTokenPayload).toBeUndefined();
  });

  it("should call done() without error for invalid token on WS (delegating rejection to service)", async () => {
    const { request, reply, done, fastify } = createExecutionContext();
    request.url = "/ws/session";
    request.headers = { upgrade: "websocket", "game-token": "invalid.token" };

    vi.spyOn(CryptoService, "verify").mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    const loggerSpy = vi.spyOn(logger, "warn");

    await hook.call(fastify, request, reply, done);

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.anything(),
      "Invalid game token on WS handshake"
    );
    expect(done).toHaveBeenCalledWith();
  });

  it("should append gameTokenPayload and user to request and call done() if token is valid", async () => {
    const { request, reply, done, fastify } = createExecutionContext({
      "game-token": "valid.token",
    });
    const mockPayload = {
      sessionId: "session-123",
      participantId: "part-123",
      type: TokenType.GAME,
    };
    const cryptoSpy = vi
      .spyOn(CryptoService, "verify")
      .mockReturnValue(mockPayload);

    await hook.call(fastify, request, reply, done);

    expect(cryptoSpy).toHaveBeenCalledWith(
      "valid.token",
      options.publicKeyPath,
    );
    expect(request.gameTokenPayload).toEqual(mockPayload);
    expect(request.user).toEqual(mockPayload);
    expect(done).toHaveBeenCalledWith();
  });

  it("should resolve websocket game-token from query and call done() if token is valid", async () => {
    const { request, reply, done, fastify } = createExecutionContext();
    request.url = "/ws/session?game-token=valid.ws.token";
    request.headers = { upgrade: "websocket" };
    request.query = { "game-token": "valid.ws.token" };
    const mockPayload = {
      sessionId: "session-321",
      participantId: "part-321",
      type: TokenType.GAME,
    };
    const cryptoSpy = vi
      .spyOn(CryptoService, "verify")
      .mockReturnValue(mockPayload);

    await hook.call(fastify, request, reply, done);

    expect(cryptoSpy).toHaveBeenCalledWith(
      "valid.ws.token",
      options.publicKeyPath,
    );
    expect(request.gameTokenPayload).toEqual(mockPayload);
    expect(request.user).toEqual(mockPayload);
    expect(done).toHaveBeenCalledWith();
  });
});
