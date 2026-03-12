import { BaseService } from "common-core";
import { CryptoService } from "common-crypto";
import { UnauthorizedError } from "common-errors";
import logger from "common-logger";
import { UserMapper } from "../mappers/user.mapper.js";
import { config } from "../../../config.js";
import { UserRole, TokenType } from "common-auth";
import {
  USER_NOT_FOUND,
  USER_CONFLICT,
  DATABASE_ERROR,
} from "../errors/user.errors.js";
import { UserModel } from "../models/user.model.js";

export class UserService extends BaseService {
  /**
   * @param {import('common-kafka').KafkaProducer | null} kafkaProducer
   * @param {import('../repositories/user.repository.js').UserRepository} userRepository
   */
  constructor(kafkaProducer, userRepository) {
    super();
    this.kafkaProducer = kafkaProducer;
    this.userRepository = userRepository;
  }

  /**
   * @param {import('../contracts/user.dto.js').RegisterUserDto} data
   * @returns {Promise<import('common-contracts').TokenResponse>}
   */
  async register(data) {
    const emailHash = CryptoService.sha256Hash(data.email);

    /** @type {import('../entities/user.entity.js').UserEntity | null} */
    let existingUser;
    try {
      existingUser = await this.userRepository.findByEmailHash(emailHash);
    } catch (error) {
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }

    if (existingUser) {
      throw USER_CONFLICT(data.email);
    }

    const model = await UserModel.createFromRegistration(
      data,
      UserRole.USER,
      CryptoService.hashPassword,
    );

    const entityToCreate = UserMapper.toEntity(
      model,
      config.security.encryptionKey,
    );

    /** @type {import('../entities/user.entity.js').UserEntity} */
    let userEntity;
    try {
      userEntity = await this.userRepository.create(entityToCreate);

      try {
        await this.userRepository.valkeyRepository.del("user:all");
      } catch (cacheError) {
        logger.warn({ cacheError }, "Valkey cache invalidate all failed");
      }
    } catch (error) {
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }

    const userModel = UserMapper.toModel(
      userEntity,
      config.security.encryptionKey,
    );

    if (this.kafkaProducer) {
      await this.kafkaProducer.publish(
        "user-registered",
        UserMapper.toDto(userModel),
      );
    }

    const userDto = UserMapper.toDto(userModel);
    const accessToken = CryptoService.sign(
      { userId: userDto.id, role: userDto.role, type: TokenType.ACCESS },
      config.auth.access.privateKeyPath,
      { expiresIn: "1h" },
    );

    const refreshToken = CryptoService.sign(
      { userId: userDto.id, role: userDto.role, type: TokenType.REFRESH },
      config.auth.refresh.privateKeyPath,
      { expiresIn: "7d" },
    );

    return {
      accessToken,
      refreshToken,
      user: userDto,
    };
  }

  /**
   * @param {import('../contracts/user.dto.js').LoginUserDto} data
   * @returns {Promise<import('common-contracts').TokenResponse>}
   */
  async login(data) {
    const emailHash = CryptoService.sha256Hash(data.email);

    /** @type {import('../entities/user.entity.js').UserEntity | null} */
    let userEntity;
    try {
      userEntity = await this.userRepository.findByEmailHash(emailHash);
    } catch (error) {
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }

    if (!userEntity) {
      throw USER_NOT_FOUND(data.email);
    }

    const userModel = UserMapper.toModel(
      userEntity,
      config.security.encryptionKey,
    );

    const isPasswordValid = await userModel.checkPassword(
      data.password,
      CryptoService.comparePassword,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const userDto = UserMapper.toDto(userModel);
    const accessToken = CryptoService.sign(
      { userId: userDto.id, role: userDto.role, type: TokenType.ACCESS },
      config.auth.access.privateKeyPath,
      { expiresIn: "1h" },
    );

    const refreshToken = CryptoService.sign(
      { userId: userDto.id, role: userDto.role, type: TokenType.REFRESH },
      config.auth.refresh.privateKeyPath,
      { expiresIn: "7d" },
    );

    return {
      accessToken,
      refreshToken,
      user: userDto,
    };
  }

  /**
   * @param {string} userId
   * @returns {Promise<import('common-contracts').TokenResponse>}
   */
  async refreshAccessToken(userId) {
    let userDto;
    try {
      userDto = await this.findById(userId);
    } catch (error) {
      logger.warn({ error }, "User not found");
      throw new UnauthorizedError("User is no longer valid");
    }

    const accessToken = CryptoService.sign(
      { userId: userDto.id, role: userDto.role, type: TokenType.ACCESS },
      config.auth.access.privateKeyPath,
      { expiresIn: "1h" },
    );

    const newRefreshToken = CryptoService.sign(
      { userId: userDto.id, role: userDto.role, type: TokenType.REFRESH },
      config.auth.refresh.privateKeyPath,
      { expiresIn: "7d" },
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: userDto,
    };
  }

  /**
   * @param {string} userId
   * @returns {Promise<import('../contracts/user.dto.js').UserResponseDto>}
   */
  async findById(userId) {
    try {
      const cached = await this.userRepository.valkeyRepository.get(
        `user:${userId}`,
      );
      if (cached) {
        return cached;
      }
    } catch (cacheError) {
      logger.warn({ cacheError, userId }, "Valkey cache get failed");
    }

    /** @type {import('../entities/user.entity.js').UserEntity | null} */
    let userEntity;
    try {
      userEntity = await this.userRepository.findOne(userId);
    } catch (error) {
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }

    if (!userEntity) {
      throw USER_NOT_FOUND(userId);
    }

    const userModel = UserMapper.toModel(
      userEntity,
      config.security.encryptionKey,
    );
    const dto = UserMapper.toDto(userModel);

    try {
      await this.userRepository.valkeyRepository.set(
        `user:${userId}`,
        dto,
        config.valkey.ttl,
      );
    } catch (cacheError) {
      logger.warn({ cacheError, userId }, "Valkey cache set failed");
    }

    return dto;
  }

  /**
   * @returns {Promise<import('../contracts/user.dto.js').UserResponseDto[]>}
   */
  async findAll() {
    try {
      const cached = await this.userRepository.valkeyRepository.get("user:all");
      if (cached) {
        return cached;
      }
    } catch (cacheError) {
      logger.warn({ cacheError }, "Valkey cache get all failed");
    }

    /** @type {import('../entities/user.entity.js').UserEntity[]} */
    let entities;
    try {
      entities = await this.userRepository.findAll();
    } catch (error) {
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }

    const models = UserMapper.toModels(entities, config.security.encryptionKey);
    const dtos = UserMapper.toDtos(models);

    try {
      await this.userRepository.valkeyRepository.set(
        "user:all",
        dtos,
        config.valkey.ttl,
      );
    } catch (cacheError) {
      logger.warn({ cacheError }, "Valkey cache set all failed");
    }

    return dtos;
  }

  /**
   * @param {string} currentUserId
   * @param {import('../contracts/user.dto.js').GrantPermissionsDto} data
   * @returns {Promise<import('../contracts/user.dto.js').UserResponseDto>}
   */
  async grantPermissions(currentUserId, data) {
    logger.info(
      {
        adminId: currentUserId,
        targetUserId: data.user_id,
        newRole: data.role,
      },
      "Admin is granting permissions",
    );
    /** @type {import('../entities/user.entity.js').UserEntity | null} */
    let userEntity;
    try {
      userEntity = await this.userRepository.findOne(data.user_id);
    } catch (error) {
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }

    if (!userEntity) {
      throw USER_NOT_FOUND(data.user_id);
    }

    try {
      await this.userRepository.update(userEntity.id, { role: data.role });

      try {
        await Promise.all([
          this.userRepository.valkeyRepository.del(`user:${userEntity.id}`),
          this.userRepository.valkeyRepository.del("user:all"),
        ]);
      } catch (cacheError) {
        logger.warn({ cacheError }, "Valkey cache invalidate failed");
      }

      const updated = await this.userRepository.findOne(userEntity.id);
      if (!updated) {
        throw USER_NOT_FOUND(userEntity.id);
      }

      const userModel = UserMapper.toModel(
        updated,
        config.security.encryptionKey,
      );
      return UserMapper.toDto(userModel);
    } catch (error) {
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deleteUser(userId) {
    try {
      await this.userRepository.delete(userId);
      try {
        await Promise.all([
          this.userRepository.valkeyRepository.del(`user:${userId}`),
          this.userRepository.valkeyRepository.del("user:all"),
        ]);
      } catch (cacheError) {
        logger.warn({ cacheError, userId }, "Valkey cache delete failed");
      }

      if (this.kafkaProducer) {
        await this.kafkaProducer.publish("user-deleted", { userId });
      }
    } catch (error) {
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} userId
   * @param {import('../contracts/user.dto.js').UpdateUserDto} data
   * @returns {Promise<import('../contracts/user.dto.js').UserResponseDto>}
   */
  async updateUser(userId, data) {
    /** @type {import('../entities/user.entity.js').UserEntity | null} */
    const userEntity = await this.userRepository.findOne(userId);
    if (!userEntity) {
      throw USER_NOT_FOUND(userId);
    }

    if (data.email) {
      const emailHash = CryptoService.sha256Hash(data.email);
      /** @type {import('../entities/user.entity.js').UserEntity | null} */
      const existingUser = await this.userRepository.findByEmailHash(emailHash);
      if (existingUser && existingUser.id !== userId) {
        throw USER_CONFLICT(data.email);
      }
    }

    const model = UserMapper.toModel(userEntity, config.security.encryptionKey);
    await model.updateFromDto(
      data,
      config.security.encryptionKey,
      CryptoService.hashPassword,
    );

    const updateData = UserMapper.toEntity(
      model,
      config.security.encryptionKey,
    );

    try {
      await this.userRepository.update(userId, updateData);

      try {
        await Promise.all([
          this.userRepository.valkeyRepository.del(`user:${userId}`),
          this.userRepository.valkeyRepository.del("user:all"),
        ]);
      } catch (cacheError) {
        logger.warn({ cacheError, userId }, "Valkey cache update failed");
      }

      const updatedUserDto = await this.findById(userId);

      if (this.kafkaProducer) {
        await this.kafkaProducer.publish("user-updated", updatedUserDto);
      }

      return updatedUserDto;
    } catch (error) {
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }
}
