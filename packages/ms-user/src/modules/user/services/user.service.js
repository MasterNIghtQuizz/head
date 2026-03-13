import { BaseService } from "common-core";
import { CryptoService } from "common-crypto";
import { UnauthorizedError } from "common-errors";
import logger from "common-logger";
import { UserEntity } from "../core/entities/user.entity.js";
import { UserMapper } from "../infra/mappers/user.mapper.js";
import { config } from "../../../config.js";
import { UserRole, TokenType } from "common-auth";
import {
  USER_NOT_FOUND,
  USER_CONFLICT,
  DATABASE_ERROR,
} from "../errors/user.errors.js";

export class UserService extends BaseService {
  /**
   * @param {import('common-kafka').KafkaProducer | null} kafkaProducer
   * @param {import('../core/ports/user.repository.js').IUserRepository} userRepository
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

    /** @type {import('../core/entities/user.entity.js').UserEntity | null} */
    let existingUser;
    try {
      existingUser = await this.userRepository.findByEmailHash(emailHash);
    } catch (error) {
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }

    if (existingUser) {
      throw USER_CONFLICT(data.email);
    }

    const entity = await UserEntity.createFromRegistration(
      data,
      UserRole.USER,
      CryptoService.hashPassword,
    );

    /** @type {import('../core/entities/user.entity.js').UserEntity} */
    let createdEntity;
    try {
      createdEntity = await this.userRepository.create(entity);

      try {
        await this.userRepository.valkeyRepository.del("user:all");
      } catch (cacheError) {
        logger.warn({ cacheError }, "Valkey cache invalidate all failed");
      }
    } catch (error) {
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }

    if (this.kafkaProducer) {
      await this.kafkaProducer.publish(
        "user-registered",
        UserMapper.toDto(createdEntity),
      );
    }

    const userDto = UserMapper.toDto(createdEntity);
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

    const userEntity = await this.userRepository.findByEmailHash(emailHash);
    if (!userEntity) {
      throw USER_NOT_FOUND(data.email);
    }

    const isPasswordValid = await userEntity.checkPassword(
      data.password,
      CryptoService.comparePassword,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const userDto = UserMapper.toDto(userEntity);
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

    /** @type {import('../core/entities/user.entity.js').UserEntity | null} */
    let userEntity;
    try {
      userEntity = await this.userRepository.findOne(userId);
    } catch (error) {
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }

    if (!userEntity) {
      throw USER_NOT_FOUND(userId);
    }

    const userDto = UserMapper.toDto(userEntity);

    try {
      await this.userRepository.valkeyRepository.set(
        `user:${userId}`,
        userDto,
        config.valkey.ttl,
      );
    } catch (cacheError) {
      logger.warn({ cacheError, userId }, "Valkey cache set failed");
    }

    return userDto;
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

    /** @type {import('../core/entities/user.entity.js').UserEntity[]} */
    let entities;
    try {
      entities = await this.userRepository.findAll();
    } catch (error) {
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }

    const dtos = UserMapper.toDtos(entities);

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
    /** @type {import('../core/entities/user.entity.js').UserEntity | null} */
    let userEntity;
    try {
      userEntity = await this.userRepository.findOne(data.user_id);
    } catch (error) {
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }

    if (!userEntity || !userEntity.id) {
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

      const updatedUserEntity = await this.userRepository.findOne(data.user_id);
      if (!updatedUserEntity) {
        throw USER_NOT_FOUND(data.user_id);
      }

      return UserMapper.toDto(updatedUserEntity);
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
    /** @type {import('../core/entities/user.entity.js').UserEntity | null} */
    const userEntity = await this.userRepository.findOne(userId);
    if (!userEntity) {
      throw USER_NOT_FOUND(userId);
    }

    if (data.email) {
      const emailHash = CryptoService.sha256Hash(data.email);
      /** @type {import('../core/entities/user.entity.js').UserEntity | null} */
      const existingUser = await this.userRepository.findByEmailHash(emailHash);
      if (existingUser && existingUser.id !== userId) {
        throw USER_CONFLICT(data.email);
      }
    }

    const entity = await this.userRepository.findOne(userId);
    if (!entity) {
      throw USER_NOT_FOUND(userId);
    }

    await entity.updateFromDto(
      data,
      config.security.encryptionKey,
      CryptoService.hashPassword,
    );

    try {
      await this.userRepository.update(userId, entity);

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
