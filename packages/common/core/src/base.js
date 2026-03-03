/**
 * @abstract Base class for all services.
 */
export class BaseService {
  constructor() {}
}

/**
 * @abstract Base class for all repositories.
 */
export class BaseRepository {
  /**
   * @param {any} datasource - The TypeORM DataSource instance
   * @param {any} entity - The TypeORM EntitySchema or Entity
   */
  constructor(datasource, entity) {
    this.datasource = datasource;
    this.entity = entity;
    this.repo = datasource.getRepository(entity);
  }

  /**
   * @returns {Promise<any[]>}
   */
  async findAll() {
    return this.repo.find();
  }

  /**
   * @param {string|number} id
   * @returns {Promise<any|null>}
   */
  async findOne(id) {
    return this.repo.findOneBy({ id });
  }

  /**
   * @param {any} data
   * @returns {Promise<any>}
   */
  async create(data) {
    const entry = this.repo.create(data);
    return this.repo.save(entry);
  }

  /**
   * @param {string|number} id
   * @param {any} data
   * @returns {Promise<any>}
   */
  async update(id, data) {
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  /**
   * @param {string|number} id
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
