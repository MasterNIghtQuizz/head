import { UserModel } from "../../modules/user/models/user.model.js";

/**
 * @param {Partial<import('../../modules/user/models/user.model.js').UserModel>} overrides
 * @returns {UserModel}
 */
export const createUserModelMock = (overrides = {}) => {
  return new UserModel({
    id: "uuid-user-123",
    email: "test@example.com",
    emailHash: "hashed-email",
    password: "hashed-password",
    role: "USER",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
};

/**
 * @param {Partial<import('../../modules/user/entities/user.entity.js').UserEntity>} overrides
 * @returns {import('../../modules/user/entities/user.entity.js').UserEntity}
 */
export const createUserEntityMock = (overrides = {}) => {
  return {
    id: "uuid-user-123",
    email: "encrypted-email",
    emailHash: "hashed-email",
    password: "hashed-password",
    role: "USER",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};
