import axios from "axios";
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  BaseError,
} from "common-errors";

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
  } else if (error.request) {
    throw new InternalServerError("No response received from the server");
  } else {
    throw new InternalServerError(error.message);
  }
}

/**
 * Make an HTTP request
 * @param {import('../index.d.ts').CallConfig} config
 * @returns {Promise<any>}
 */
export async function call(config) {
  try {
    const response = await axios({
      method: config.method || "GET",
      url: config.url,
      data: config.data,
      params: config.params,
      headers: config.headers,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      handleAxiosError(error);
    }
    throw error;
  }
}
