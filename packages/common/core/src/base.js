/**
 * @abstract Base class for all services.
 */
export class BaseService {
  constructor() {}
}

/**
 * @template {import('typeorm').ObjectLiteral} T
 * @abstract Base class for all repositories.
 */
export class BaseRepository {
  /**
   * @public
   * @type {import('typeorm').Repository<T>}
   */
  repo;

  /**
   * @param {import('typeorm').DataSource} datasource
   * @param {import('typeorm').EntitySchema<T>|import('typeorm').EntityTarget<T>} entity
   */
  constructor(datasource, entity) {
    this.datasource = datasource;
    this.entity = entity;
    this.repo = datasource.getRepository(entity);
  }

  /**
   * @returns {Promise<T[]>}
   */
  async findAll() {
    return this.repo.find();
  }

  /**
   * @param {string|number|any} id
   * @returns {Promise<T|null>}
   */
  async findOne(id) {
    // @ts-ignore
    return this.repo.findOneBy({ id });
  }

  /**
   * @param {import('typeorm').DeepPartial<T>} data
   * @returns {Promise<T>}
   */
  async create(data) {
    const entry = this.repo.create(data);
    return this.repo.save(entry);
  }

  /**
   * @param {string|number|any} id
   * @param {import('typeorm').QueryDeepPartialEntity<T>} data
   * @returns {Promise<T|null>}
   */
  async update(id, data) {
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  /**
   * @param {string|number|any} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    await this.repo.delete(id);
  }
}

/**
 * @abstract Base class for all controllers.
 */
export class BaseController {
  constructor() {}
}
