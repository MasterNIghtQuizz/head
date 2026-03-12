import { UserResponseDto } from "../contracts/user.dto.js";
import { UserModel } from "../models/user.model.js";
import { CryptoService } from "common-crypto";

export class UserMapper {
  /**
   * @param {UserModel} model
   * @returns {UserResponseDto}
   */
  static toDto(model) {
    const dto = new UserResponseDto();
    dto.id = model.id || "";
    dto.email = model.email || "";
    dto.role = model.role || "";
    return dto;
  }

  /**
   * @param {import('../entities/user.entity.js').UserEntity} entity
   * @param {string} encryptionKey
   * @returns {UserModel}
   */
  static toModel(entity, encryptionKey) {
    return new UserModel({
      id: entity.id,
      email: CryptoService.decrypt(entity.email, encryptionKey),
      emailHash: entity.emailHash,
      password: entity.password,
      role: entity.role,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  /**
   * @param {UserModel} model
   * @param {string} encryptionKey
   * @returns {import('../entities/user.entity.js').UserEntity}
   */
  static toEntity(model, encryptionKey) {
    /** @type {Omit<import('../entities/user.entity.js').UserEntity, "id">} */
    const entityData = {
      email: CryptoService.encrypt(model.email, encryptionKey),
      emailHash: model.emailHash,
      password: model.password,
      role: model.role,
      createdAt: model.createdAt || new Date(),
      updatedAt: model.updatedAt || new Date(),
    };

    if (model.id) {
      const userEntity =
        /** @type {import('../entities/user.entity.js').UserEntity} */ (
          entityData
        );
      userEntity.id = model.id;
      return userEntity;
    }

    return /** @type {import('../entities/user.entity.js').UserEntity} */ (
      entityData
    );
  }

  /**
   * @param {UserModel[]} models
   * @returns {UserResponseDto[]}
   */
  static toDtos(models) {
    return models.map(this.toDto);
  }

  /**
   * @param {import('../entities/user.entity.js').UserEntity[]} entities
   * @param {string} encryptionKey
   * @returns {UserModel[]}
   */
  static toModels(entities, encryptionKey) {
    return entities.map((e) => this.toModel(e, encryptionKey));
  }
}
