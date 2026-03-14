import { UserResponseDto } from "../../contracts/user.dto.js";
import { UserEntity } from "../../core/entities/user.entity.js";
import { CryptoService } from "common-crypto";
import { UserModel } from "../models/user.model.js";

/**
 * @typedef {UserModel} UserPersistenceModel
 */

export class UserMapper {
  /**
   * @param {UserEntity} entity
   * @returns {UserResponseDto}
   */
  static toDto(entity) {
    const dto = new UserResponseDto();
    dto.id = entity.id || "";
    dto.email = entity.email || "";
    dto.role = entity.role || "";
    return dto;
  }

  /**
   * @param {UserPersistenceModel} model
   * @param {string} encryptionKey
   * @returns {UserEntity}
   */
  static toDomain(model, encryptionKey) {
    return new UserEntity({
      id: model.id || "",
      email: CryptoService.decrypt(model.email || "", encryptionKey),
      emailHash: model.emailHash || "",
      password: model.password || "",
      role: model.role || "",
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }

  /**
   * @param {Partial<UserEntity>} entity
   * @param {string} encryptionKey
   * @returns {Partial<UserPersistenceModel>}
   */
  static toPersistence(entity, encryptionKey) {
    /** @type {Partial<UserPersistenceModel>} */
    const data = {};

    if (entity.email) {
      data.email = CryptoService.encrypt(entity.email, encryptionKey);
    }
    if (entity.emailHash) {
      data.emailHash = entity.emailHash;
    }
    if (entity.password) {
      data.password = entity.password;
    }
    if (entity.role) {
      data.role = entity.role;
    }
    if (entity.updatedAt || entity.createdAt) {
      data.updatedAt = entity.updatedAt || new Date();
    }
    if (!entity.id && entity.createdAt) {
      data.createdAt = entity.createdAt || new Date();
    }

    if (entity.id) {
      data.id = entity.id;
    }

    return data;
  }

  /**
   * @param {UserEntity[]} entities
   * @returns {UserResponseDto[]}
   */
  static toDtos(entities) {
    return entities.map(this.toDto);
  }

  /**
   * @param {UserPersistenceModel[]} models
   * @param {string} encryptionKey
   * @returns {UserEntity[]}
   */
  static toDomains(models, encryptionKey) {
    return models.map((m) => this.toDomain(m, encryptionKey));
  }
}
