import { describe, it, expect, vi, afterEach } from "vitest";
import axios from "axios";
import { call } from "../index.js";
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  BaseError,
} from "common-errors";

vi.mock("axios", () => {
  const instance = vi.fn();
  // @ts-ignore
  instance.interceptors = {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  };
  // @ts-ignore
  instance.defaults = { adapter: vi.fn() };

  return {
    default: {
      create: vi.fn(() => instance),
      isAxiosError: vi.fn((err) => !!err.isAxiosError),
    },
  };
});

vi.mock("axios-retry", () => ({
  default: vi.fn(),
  exponentialDelay: vi.fn(),
  isNetworkOrIdempotentRequestError: vi.fn(),
}));

/** @type {any} */
const mockedAxios = axios.create();

describe("call (Axios Helper)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully make an HTTP request and return data", async () => {
    const mockData = { success: true };
    const mockAxiosResponse = { data: mockData };

    mockedAxios.mockResolvedValueOnce(mockAxiosResponse);

    /** @type {import('../../index.d.ts').CallConfig} */
    const config = { url: "http://test.com", method: "GET" };
    const result = await call(config);

    expect(result).toEqual(mockData);
    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "http://test.com",
      }),
    );
  });

  it("should sanitise headers and remove hop-by-hop headers", async () => {
    mockedAxios.mockResolvedValueOnce({ data: {} });

    /** @type {import('../../index.d.ts').CallConfig} */
    const config = {
      url: "http://test.com",
      headers: {
        "content-length": "123",
        host: "localhost",
        "access-token": "secret",
        "custom-header": "value",
      },
    };

    await call(config);

    const callArgs = mockedAxios.mock.calls[0][0];
    expect(callArgs.headers).toEqual({
      "access-token": "secret",
      "custom-header": "value",
    });
    expect(callArgs.headers).not.toHaveProperty("content-length");
    expect(callArgs.headers).not.toHaveProperty("host");
  });

  it("should handle 400 Bad Request error", async () => {
    const errorResponse = {
      isAxiosError: true,
      message: "Request failed",
      response: {
        status: 400,
        data: { message: "Bad parameters" },
      },
    };

    mockedAxios.mockRejectedValueOnce(errorResponse);

    await expect(call({ url: "http://test.com" })).rejects.toThrow(
      BadRequestError,
    );
  });

  it("should handle 401 Unauthorized error", async () => {
    const errorResponse = {
      isAxiosError: true,
      message: "Request failed",
      response: {
        status: 401,
        data: { error: "Missing token" },
      },
    };

    mockedAxios.mockRejectedValueOnce(errorResponse);

    await expect(call({ url: "http://test.com" })).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it("should handle 403 Forbidden error", async () => {
    const errorResponse = {
      isAxiosError: true,
      response: {
        status: 403,
      },
    };

    mockedAxios.mockRejectedValueOnce(errorResponse);

    await expect(call({ url: "http://test.com" })).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("should handle 404 Not Found error", async () => {
    const errorResponse = {
      isAxiosError: true,
      response: {
        status: 404,
      },
    };

    mockedAxios.mockRejectedValueOnce(errorResponse);

    await expect(call({ url: "http://test.com" })).rejects.toThrow(
      NotFoundError,
    );
  });

  it("should handle 409 Conflict error", async () => {
    const errorResponse = {
      isAxiosError: true,
      response: {
        status: 409,
      },
    };

    mockedAxios.mockRejectedValueOnce(errorResponse);

    await expect(call({ url: "http://test.com" })).rejects.toThrow(
      ConflictError,
    );
  });

  it("should handle default BaseError for unhandled status codes", async () => {
    const errorResponse = {
      isAxiosError: true,
      response: {
        status: 418,
        data: { message: "I am a teapot" },
      },
    };

    mockedAxios.mockRejectedValueOnce(errorResponse);

    await expect(call({ url: "http://test.com" })).rejects.toThrow(BaseError);
  });

  it("should handle timeout error specifically", async () => {
    const errorResponse = {
      isAxiosError: true,
      code: "ECONNABORTED",
      message: "timeout of 10000ms exceeded",
    };

    mockedAxios.mockRejectedValueOnce(errorResponse);

    const promise = call({ url: "http://test.com" });
    await expect(promise).rejects.toThrow(InternalServerError);
    await expect(promise).rejects.toThrow("Request timed out");
  });

  it("should handle InternalServerError when no response is received", async () => {
    const errorResponse = {
      isAxiosError: true,
      request: {},
      message: "Network Error",
      config: { url: "http://test.com" },
    };

    mockedAxios.mockRejectedValueOnce(errorResponse);

    const promise = call({ url: "http://test.com" });
    await expect(promise).rejects.toThrow(InternalServerError);
    await expect(promise).rejects.toThrow(
      "No response received from the server",
    );
  });

  it("should handle InternalServerError when setting up the request fails", async () => {
    const errorResponse = {
      isAxiosError: true,
      message: "Setup Error",
      config: { url: "http://test.com" },
    };

    mockedAxios.mockRejectedValueOnce(errorResponse);

    const promise = call({ url: "http://test.com" });
    await expect(promise).rejects.toThrow(InternalServerError);
    await expect(promise).rejects.toThrow("Setup Error");
  });

  it("should continuously re-throw non-axios errors", async () => {
    const errorResponse = new Error("Standard error");

    mockedAxios.mockRejectedValueOnce(errorResponse);

    await expect(call({ url: "http://test.com" })).rejects.toThrow(
      "Standard error",
    );
  });
});
