import { UserModel } from "../../modules/user/infra/models/user.model.js";
import { UserEntity } from "../../modules/user/core/entities/user.entity.js";

/**
 * @param {Partial<import('../../modules/user/infra/models/user.model.js').UserModel>} overrides
 * @returns {UserModel}
 */
export const createUserModelMock = (overrides = {}) => {
  const model = new UserModel();
  model.id = "uuid-user-123";
  model.email = "encrypted-email";
  model.emailHash = "hashed-email";
  model.password = "hashed-password";
  model.role = "USER";
  model.createdAt = new Date();
  model.updatedAt = new Date();

  Object.assign(model, overrides);
  return model;
};

/**
 * @param {Partial<import('../../modules/user/core/entities/user.entity.js').UserEntity>} overrides
 * @returns {UserEntity}
 */
export const createUserEntityMock = (overrides = {}) => {
  return new UserEntity({
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
