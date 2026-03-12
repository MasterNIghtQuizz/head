import { BaseService } from "common-core";
import { call } from "common-axios";
import { config } from "../../../config.js";

export class UserService extends BaseService {
  /**
   * @param {import('common-contracts').RegisterRequest} userData
   * @returns {Promise<import('common-contracts').TokenResponse>}
   */
  async register(userData) {
    return call({
      url: `${config.services.user}/users/register`,
      method: "POST",
      data: userData,
    });
  }
  /**
   * @param {import('common-contracts').LoginRequest} loginData
   * @returns {Promise<import('common-contracts').TokenResponse>}
   */
  async login(loginData) {
    return call({
      url: `${config.services.user}/users/login`,
      method: "POST",
      data: loginData,
    });
  }

  /**
   * @param {string} internalToken
   * @returns {Promise<import('common-contracts').TokenResponse>}
   */
  async refreshToken(internalToken) {
    return call({
      url: `${config.services.user}/users/refresh-access-token`,
      method: "GET",
      headers: {
        "internal-token": internalToken,
      },
    });
  }
  /**
   * @param {import('common-contracts').GrantPermissionRequest} permissionsData
   * @param {string} internalToken
   * @returns {Promise<import('common-contracts').UserResponse>}
   */
  async grantPermissions(permissionsData, internalToken) {
    if (!internalToken) {
      throw new Error("Internal token is missing in service call");
    }
    return call({
      url: `${config.services.user}/users/permissions`,
      method: "POST",
      data: permissionsData,
      headers: {
        "internal-token": internalToken,
      },
    });
  }

  /**
   * @param {string} internalToken
   * @returns {Promise<import('common-contracts').UserResponse[]>}
   */
  async findAll(internalToken) {
    return call({
      url: `${config.services.user}/users`,
      method: "GET",
      headers: { "internal-token": internalToken },
    });
  }

  /**
   * @param {string} id
   * @param {string} internalToken
   * @returns {Promise<import('common-contracts').UserResponse>}
   */
  async findById(id, internalToken) {
    return call({
      url: `${config.services.user}/users/${id}`,
      method: "GET",
      headers: { "internal-token": internalToken },
    });
  }

  /**
   * @param {string} id
   * @param {any} data
   * @param {string} internalToken
   * @returns {Promise<import('common-contracts').UserResponse>}
   */
  async updateUser(id, data, internalToken) {
    return call({
      url: `${config.services.user}/users/${id}`,
      method: "PUT",
      data,
      headers: { "internal-token": internalToken },
    });
  }

  /**
   * @param {string} id
   * @param {string} internalToken
   * @returns {Promise<void>}
   */
  async deleteUser(id, internalToken) {
    return call({
      url: `${config.services.user}/users/${id}`,
      method: "DELETE",
      headers: { "internal-token": internalToken },
    });
  }

  /**
   * @param {string} internalToken
   * @returns {Promise<import('common-contracts').UserResponse>}
   */
  async getMe(internalToken) {
    return call({
      url: `${config.services.user}/users/me`,
      method: "GET",
      headers: { "internal-token": internalToken },
    });
  }

  /**
   * @param {import('common-contracts').UpdateUserRequest} data
   * @param {string} internalToken
   * @returns {Promise<import('common-contracts').UserResponse>}
   */
  async updateMe(data, internalToken) {
    return call({
      url: `${config.services.user}/users/me`,
      method: "PUT",
      data,
      headers: { "internal-token": internalToken },
    });
  }

  /**
   * @param {string} internalToken
   * @returns {Promise<void>}
   */
  async deleteMe(internalToken) {
    return call({
      url: `${config.services.user}/users/me`,
      method: "DELETE",
      headers: { "internal-token": internalToken },
    });
  }
}
