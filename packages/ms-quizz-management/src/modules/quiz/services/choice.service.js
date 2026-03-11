import { BaseService } from "common-core";
import logger from "common-logger";
import { ChoiceMapper } from "../mappers/choice.mapper.js";
import { CHOICE_NOT_FOUND, CHOICE_CONFLICT } from "../errors/choice.errors.js";
import { DATABASE_ERROR } from "../errors/internal.errors.js";
import { BaseError } from "common-errors";

export class ChoiceService extends BaseService {
  /**
   * @param {import('../repositories/choice.repository.js').ChoiceRepository} choiceRepository
   * @param {import('common-valkey').ValkeyRepository} valkeyRepository
   * @param {number} cacheTtl
   */
  constructor(choiceRepository, valkeyRepository, cacheTtl) {
    super();
    /** @type {import('../repositories/choice.repository.js').ChoiceRepository} */
    this.choiceRepository = choiceRepository;
    /** @type {import('common-valkey').ValkeyRepository} */
    this.valkeyRepository = valkeyRepository;
    /** @type {number} */
    this.cacheTtl = cacheTtl;
  }

  async getAllChoices() {
    logger.info("Fetching all choices...");
    const cacheKey = "choices:all";
    try {
      const cached = await this.valkeyRepository.get(cacheKey);
      if (cached) {
        logger.info("Choices fetched from cache");
        return cached;
      }
    } catch (error) {
      logger.warn(
        { error: /** @type {Error} */ (error) },
        "Valkey cache get failed, falling back to DB",
      );
    }

    try {
      const choices = await this.choiceRepository.findAll();
      const response = choices.map(ChoiceMapper.toResponse);

      try {
        await this.valkeyRepository.set(cacheKey, response, this.cacheTtl);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError) },
          "Valkey cache set failed",
        );
      }

      logger.info({ count: choices.length }, "Choices fetched from DB");
      return response;
    } catch (error) {
      logger.error(
        { error: /** @type {Error} */ (error) },
        "Error fetching all choices from DB",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} id
   */
  async getChoiceById(id) {
    logger.info({ id }, "Fetching choice by id...");
    const cacheKey = `choice:${id}`;
    try {
      const cached = await this.valkeyRepository.get(cacheKey);
      if (cached) {
        logger.info({ id }, "Choice fetched from cache");
        return cached;
      }
    } catch (error) {
      logger.warn(
        { error: /** @type {Error} */ (error), id },
        "Valkey cache get failed, falling back to DB",
      );
    }

    try {
      const choice = await this.choiceRepository.findOne(id);
      if (!choice) {
        logger.warn({ id }, "Choice not found in DB");
        throw CHOICE_NOT_FOUND(id);
      }

      const response = ChoiceMapper.toResponse(choice);
      try {
        await this.valkeyRepository.set(cacheKey, response, this.cacheTtl);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), id },
          "Valkey cache set failed",
        );
      }

      logger.info({ id }, "Choice fetched from DB");
      return response;
    } catch (error) {
      if (/** @type {BaseError} */ (error).statusCode) {
        throw error;
      }
      logger.error(
        { error: /** @type {Error} */ (error), id },
        "Error fetching choice by id from DB",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} questionId
   */
  async getChoicesByQuestionId(questionId) {
    logger.info({ questionId }, "Fetching choices for question...");
    const cacheKey = `question:choices:${questionId}`;
    try {
      const cached = await this.valkeyRepository.get(cacheKey);
      if (cached) {
        logger.info({ questionId }, "Choices for question fetched from cache");
        return cached;
      }
    } catch (error) {
      logger.warn(
        { error: /** @type {Error} */ (error), questionId },
        "Valkey cache get failed, falling back to DB",
      );
    }

    try {
      const choices = await this.choiceRepository.findByQuestionId(questionId);
      const response = choices.map(ChoiceMapper.toResponse);

      try {
        await this.valkeyRepository.set(cacheKey, response, this.cacheTtl);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), questionId },
          "Valkey cache set failed",
        );
      }

      logger.info(
        { questionId, count: choices.length },
        "Choices for question fetched from DB",
      );
      return response;
    } catch (error) {
      logger.error(
        { error: /** @type {Error} */ (error), questionId },
        "Error fetching choices for question from DB",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {import('../contracts/choice.dto.js').CreateChoiceRequestDto} data
   */
  async createChoice(data) {
    logger.info({ text: data.text }, "Creating new choice...");
    try {
      const choice = await this.choiceRepository.create(data);
      try {
        await Promise.all([
          this.valkeyRepository.del("choices:all"),
          data.question_id
            ? this.valkeyRepository.del(`question:choices:${data.question_id}`)
            : Promise.resolve(),
        ]);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError) },
          "Valkey cache invalidation failed during create",
        );
      }
      logger.info({ id: choice.id }, "Choice created successfully");
      return ChoiceMapper.toResponse(choice);
    } catch (error) {
      // @ts-ignore
      if (error?.code === "23505") {
        logger.warn(
          { text: data.text },
          "Choice conflict: text already exists",
        );
        throw CHOICE_CONFLICT(data.text);
      }
      logger.error(
        { error: /** @type {Error} */ (error), data },
        "Error creating choice",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} id
   * @param {import('../contracts/choice.dto.js').UpdateChoiceRequestDto} data
   */
  async updateChoice(id, data) {
    logger.info({ id }, "Updating choice...");
    try {
      const choice = await this.choiceRepository.update(id, data);
      if (!choice) {
        logger.warn({ id }, "Choice not found for update");
        throw CHOICE_NOT_FOUND(id);
      }

      const response = ChoiceMapper.toResponse(choice);
      try {
        const invalidations = [
          this.valkeyRepository.del(`choice:${id}`),
          this.valkeyRepository.del("choices:all"),
        ];

        if (choice.question?.id) {
          invalidations.push(
            this.valkeyRepository.del(`question:choices:${choice.question.id}`),
          );
        }

        await Promise.all(invalidations);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), id },
          "Valkey cache invalidation failed during update",
        );
      }

      logger.info({ id }, "Choice updated successfully");
      return response;
    } catch (error) {
      if (/** @type {BaseError} */ (error).statusCode) {
        throw error;
      }
      // @ts-ignore
      if (error?.code === "23505") {
        logger.warn({ id, text: data.text }, "Choice update conflict");
        throw CHOICE_CONFLICT(data.text || id);
      }
      logger.error(
        { error: /** @type {Error} */ (error), id, data },
        "Error updating choice",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} id
   */
  async deleteChoice(id) {
    logger.info({ id }, "Deleting choice...");
    try {
      const choice = await this.choiceRepository.findOne(id);
      await this.choiceRepository.delete(id);

      try {
        const invalidations = [
          this.valkeyRepository.del(`choice:${id}`),
          this.valkeyRepository.del("choices:all"),
        ];

        if (choice?.question?.id) {
          invalidations.push(
            this.valkeyRepository.del(`question:choices:${choice.question.id}`),
          );
        }

        await Promise.all(invalidations);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), id },
          "Valkey cache invalidation failed during delete",
        );
      }

      logger.info({ id }, "Choice deleted successfully");
    } catch (error) {
      logger.error(
        { error: /** @type {Error} */ (error), id },
        "Error deleting choice",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }
}
