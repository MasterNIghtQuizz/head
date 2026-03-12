/**
 * @typedef {import('common-contracts').RegisterRequest} RegisterRequest
 * @typedef {import('common-contracts').LoginRequest} LoginRequest
 * @typedef {import('common-contracts').GrantPermissionRequest} GrantPermissionRequest
 * @typedef {import('common-contracts').UserResponse} UserResponse
 */

/**
 * @implements {RegisterRequest}
 */
export class RegisterUserDto {
  /** @type {string} */
  email = "";
  /** @type {string} */
  password = "";
}
/**
 * @implements {LoginRequest}
 */
export class LoginUserDto {
  /** @type {string} */
  email = "";
  /** @type {string} */
  password = "";
}
/**
 * @implements {GrantPermissionRequest}
 */
export class GrantPermissionsDto {
  /** @type {string} */
  user_id = "";
  /** @type {string} */
  role = "";
}

/**
 * @implements {UserResponse}
 */
export class UserResponseDto {
  /** @type {string} */
  id = "";
  /** @type {string} */
  email = "";
  /** @type {string} */
  role = "";
}

/**
 * @typedef {import('common-contracts').UpdateUserRequest} UpdateUserRequest
 */

/**
 * @implements {UpdateUserRequest}
 */
export class UpdateUserDto {
  /** @type {string} */
  email = "";
  /** @type {string} */
  password = "";
  /** @type {string} */
  role = "";
}
