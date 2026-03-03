import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

vi.mock("axios");

describe("call (Axios Helper)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should successfully make an HTTP request and return data", async () => {
    const mockData = { success: true };
    const mockAxiosResponse = { data: mockData };

    vi.mocked(axios).mockResolvedValue(mockAxiosResponse);

    const result = await call({ url: "http://test.com", method: "GET" });

    expect(result).toEqual(mockData);
    expect(axios).toHaveBeenCalledWith({
      method: "GET",
      url: "http://test.com",
      data: undefined,
      params: undefined,
      headers: undefined,
    });
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

    vi.mocked(axios).mockRejectedValue(errorResponse);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

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

    vi.mocked(axios).mockRejectedValue(errorResponse);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

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

    vi.mocked(axios).mockRejectedValue(errorResponse);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

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

    vi.mocked(axios).mockRejectedValue(errorResponse);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

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

    vi.mocked(axios).mockRejectedValue(errorResponse);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

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

    vi.mocked(axios).mockRejectedValue(errorResponse);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

    await expect(call({ url: "http://test.com" })).rejects.toThrow(BaseError);
  });

  it("should handle InternalServerError when no response is received", async () => {
    const errorResponse = {
      isAxiosError: true,
      request: {},
      message: "Network Error",
    };

    vi.mocked(axios).mockRejectedValue(errorResponse);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

    await expect(call({ url: "http://test.com" })).rejects.toThrow(
      InternalServerError,
    );
    await expect(call({ url: "http://test.com" })).rejects.toThrow(
      "No response received from the server",
    );
  });

  it("should handle InternalServerError when setting up the request fails", async () => {
    const errorResponse = {
      isAxiosError: true,
      message: "Setup Error",
    };

    vi.mocked(axios).mockRejectedValue(errorResponse);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

    await expect(call({ url: "http://test.com" })).rejects.toThrow(
      InternalServerError,
    );
    await expect(call({ url: "http://test.com" })).rejects.toThrow(
      "Setup Error",
    );
  });

  it("should continuously re-throw non-axios errors", async () => {
    const errorResponse = new Error("Standard error");

    vi.mocked(axios).mockRejectedValue(errorResponse);
    vi.mocked(axios.isAxiosError).mockReturnValue(false);

    await expect(call({ url: "http://test.com" })).rejects.toThrow(
      errorResponse,
    );
  });
});
