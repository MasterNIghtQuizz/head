import axios from "axios";
import axiosRetry from "axios-retry";
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  BaseError,
} from "common-errors";

const axiosInstance = axios.create({
  timeout: 10000,
});

axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  /** @param {any} error */
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      error.response?.status === 429
    );
  },
});

/**
 * Handle axios error based on status code and throw common-errors.
 * @param {import('axios').AxiosError} error
 */
function handleAxiosError(error) {
  if (error.response) {
    const { status, data } = error.response;
    const message = data?.message || data?.error || error.message;

    switch (status) {
      case 400:
        throw new BadRequestError(message, data);
      case 401:
        throw new UnauthorizedError(message, data);
      case 403:
        throw new ForbiddenError(message, data);
      case 404:
        throw new NotFoundError(message, data);
      case 409:
        throw new ConflictError(message, data);
      default:
        throw new BaseError(message, status, data);
    }
  } else if (
    error.code === "ECONNABORTED" ||
    (error.message && error.message.includes("timeout"))
  ) {
    throw new InternalServerError(`Request timed out: ${error.message}`);
  } else if (error.request) {
    throw new InternalServerError("No response received from the server");
  } else {
    throw new InternalServerError(error.message);
  }
}

const HOP_BY_HOP_HEADERS = new Set([
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "host",
  "te",
  "trailer",
  "upgrade",
]);

/**x
 * @param {Record<string, unknown> | import('http').IncomingHttpHeaders | undefined} headers
 * @returns {Record<string, string>}
 */
function sanitiseHeaders(headers) {
  if (!headers) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(headers)
      .filter(
        ([key, value]) =>
          !HOP_BY_HOP_HEADERS.has(key.toLowerCase()) && value !== undefined,
      )
      .map(([key, value]) => [key, String(value)]),
  );
}

/**
 * Make an HTTP request
 * @param {import('../index.d.ts').CallConfig} config
 * @returns {Promise<any>}
 */
export async function call(config) {
  try {
    const response = await axiosInstance(
      /** @type {any} */ ({
        method: config.method || "GET",
        url: config.url,
        data: config.data,
        params: config.params,
        headers: sanitiseHeaders(config.headers),
        timeout: config.timeout,
        "axios-retry": config.retry,
      }),
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      handleAxiosError(error);
    }
    throw error;
  }
}
