import { CryptoService } from "common-crypto";

export class UserEntity {
  /**
   * @param {Object} params
   * @param {string} [params.id]
   * @param {string} params.email
   * @param {string} params.emailHash
   * @param {string} params.password
   * @param {string} params.role
   * @param {Date} [params.createdAt]
   * @param {Date} [params.updatedAt]
   */
  constructor({ id, email, emailHash, password, role, createdAt, updatedAt }) {
    this.id = id;
    this.email = email;
    this.emailHash = emailHash;
    this.password = password;
    this.role = role;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * @param {import('../../contracts/user.dto.js').UpdateUserDto} dto
   * @param {string} _encryptionKey
   * @param {function(string): Promise<string>} hashFn
   */
  async updateFromDto(dto, _encryptionKey, hashFn) {
    if (dto.email) {
      this.email = dto.email;
      this.emailHash = CryptoService.sha256Hash(dto.email);
    }
    if (dto.password) {
      this.password = await hashFn(dto.password);
    }
    if (dto.role) {
      this.role = dto.role;
    }
  }

  /**
   * @param {string} plainPassword
   * @param {function(string, string): Promise<boolean>} compareFn
   * @returns {Promise<boolean>}
   */
  async checkPassword(plainPassword, compareFn) {
    return compareFn(plainPassword, this.password);
  }

  /**
   * @param {import('../../contracts/user.dto.js').RegisterUserDto} dto
   * @param {string} role
   * @param {function(string): Promise<string>} hashFn
   * @returns {Promise<UserEntity>}
   */
  static async createFromRegistration(dto, role, hashFn) {
    const password = await hashFn(dto.password);
    const emailHash = CryptoService.sha256Hash(dto.email);

    return new UserEntity({
      email: dto.email,
      emailHash,
      password,
      role,
    });
  }
}
