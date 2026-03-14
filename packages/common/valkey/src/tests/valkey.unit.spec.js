import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ValkeyService } from "../index.js";
import { Redis } from "ioredis";

vi.mock("ioredis", () => {
  const client = {
    connect: vi.fn().mockResolvedValue(true),
    quit: vi.fn().mockResolvedValue(true),
    on: vi.fn().mockReturnThis(),
  };
  const Redis = vi.fn(function () {
    return client;
  });
  return { Redis };
});

vi.mock("common-logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("ValkeyService (Unit Test)", () => {
  const config = { host: "localhost", port: 6379 };
  /** @type {ValkeyService} */
  let valkeyService;

  beforeEach(() => {
    valkeyService = new ValkeyService(config);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with config", () => {
    expect(valkeyService).toBeDefined();
  });

  it("should connect to valkey", async () => {
    const client = await valkeyService.connect();

    expect(Redis).toHaveBeenCalledWith(
      expect.objectContaining({
        host: config.host,
        port: config.port,
      }),
    );
    expect(client.connect).toHaveBeenCalled();
  });

  it("should return the same client if already connected", async () => {
    await valkeyService.connect();
    await valkeyService.connect();

    expect(Redis).toHaveBeenCalledTimes(1);
  });

  it("should disconnect correctly", async () => {
    const client = await valkeyService.connect();
    await valkeyService.disconnect();

    expect(client.quit).toHaveBeenCalled();
  });

  it("should throw error if client is accessed before connection", () => {
    expect(() => valkeyService.client).toThrow(
      "Valkey client not connected. Call connect() first.",
    );
  });
});
