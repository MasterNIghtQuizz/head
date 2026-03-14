import { BaseService } from "common-core";
import logger from "common-logger";
import { CHOICE_NOT_FOUND } from "../errors/choice.errors.js";
import { DATABASE_ERROR } from "../errors/internal.errors.js";
import { BaseError } from "common-errors";
import { ChoiceEntity } from "../core/entities/choice.entity.js";
import { ChoiceMapper } from "../infra/mappers/choice.mapper.js";

export class ChoiceService extends BaseService {
  /**
   * @param {import('../core/ports/choice.repository.js').IChoiceRepository} choiceRepository
   * @param {import('../core/ports/question.repository.js').IQuestionRepository} questionRepository
   * @param {number} cacheTtl
   */
  constructor(choiceRepository, questionRepository, cacheTtl) {
    super();
    /** @type {import('../core/ports/choice.repository.js').IChoiceRepository} */
    this.choiceRepository = choiceRepository;
    /** @type {import('../core/ports/question.repository.js').IQuestionRepository} */
    this.questionRepository = questionRepository;
    /** @type {import('common-valkey').ValkeyRepository} */
    this.valkeyRepository = choiceRepository.valkeyRepository;
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
      const entities = await this.choiceRepository.findAll();
      const dtos = ChoiceMapper.toDtos(entities);

      try {
        await this.valkeyRepository.set(cacheKey, dtos, this.cacheTtl);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError) },
          "Valkey cache set failed",
        );
      }

      logger.info({ count: entities.length }, "Choices fetched from DB");
      return dtos;
    } catch (error) {
      logger.error(
        { error: /** @type {Error} */ (error) },
        "Error fetching all choices from DB",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} questionId
   */
  async getChoicesByQuestionId(questionId) {
    logger.info({ questionId }, "Fetching choices by questionId...");
    const cacheKey = `question:choices:${questionId}`;
    try {
      const cached = await this.valkeyRepository.get(cacheKey);
      if (cached) {
        logger.info({ questionId }, "Choices fetched from cache");
        return cached;
      }
    } catch (error) {
      logger.warn(
        { error: /** @type {Error} */ (error), questionId },
        "Valkey cache get failed, falling back to DB",
      );
    }

    try {
      const entities = await this.choiceRepository.findByQuestionId(questionId);
      const dtos = ChoiceMapper.toDtos(entities);

      try {
        await this.valkeyRepository.set(cacheKey, dtos, this.cacheTtl);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), questionId },
          "Valkey cache set failed",
        );
      }

      logger.info(
        { questionId, count: entities.length },
        "Choices fetched from DB",
      );
      return dtos;
    } catch (error) {
      logger.error(
        { error: /** @type {Error} */ (error), questionId },
        "Error fetching choices by questionId from DB",
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
      const entity = await this.choiceRepository.findOne(id);
      if (!entity) {
        logger.warn({ id }, "Choice not found in DB");
        throw CHOICE_NOT_FOUND(id);
      }

      const dto = ChoiceMapper.toDto(entity);
      try {
        await this.valkeyRepository.set(cacheKey, dto, this.cacheTtl);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), id },
          "Valkey cache set failed",
        );
      }

      logger.info({ id }, "Choice fetched from DB");
      return dto;
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
   * @param {import('../contracts/choice.dto.js').CreateChoiceRequestDto} data
   */
  async createChoice(data) {
    logger.info({ text: data.text }, "Creating new choice...");
    try {
      const entity = new ChoiceEntity({
        text: data.text,
        is_correct: data.is_correct,
        questionId: data.question_id,
      });
      const createdEntity = await this.choiceRepository.create(entity);

      try {
        const question = await this.questionRepository.findOne(
          data.question_id,
        );
        const invalidations = [
          this.valkeyRepository.del("choices:all"),
          this.valkeyRepository.del(`question:choices:${data.question_id}`),
          this.valkeyRepository.del(`question:${data.question_id}`),
          this.valkeyRepository.del("questions:all"),
        ];
        if (question?.quizId) {
          invalidations.push(
            this.valkeyRepository.del(`quiz:questions:${question.quizId}`),
          );
          invalidations.push(
            this.valkeyRepository.del(`quiz:${question.quizId}`),
          );
          invalidations.push(this.valkeyRepository.del("quizzes:all"));
        }
        await Promise.all(invalidations);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError) },
          "Valkey cache invalidation failed",
        );
      }
      logger.info({ id: createdEntity.id }, "Choice created successfully");
      return ChoiceMapper.toDto(createdEntity);
    } catch (error) {
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
      const entity = await this.choiceRepository.findOne(id);
      if (!entity) {
        logger.warn({ id }, "Choice not found for update");
        throw CHOICE_NOT_FOUND(id);
      }

      entity.update(data);
      const updatedEntity = await this.choiceRepository.update(id, entity);
      if (!updatedEntity || !updatedEntity.questionId) {
        logger.warn({ id }, "Choice not found for update");
        throw CHOICE_NOT_FOUND(id);
      }

      const dto = ChoiceMapper.toDto(updatedEntity);
      try {
        const question = await this.questionRepository.findOne(
          updatedEntity.questionId,
        );
        const invalidations = [
          this.valkeyRepository.del(`choice:${id}`),
          this.valkeyRepository.del("choices:all"),
          this.valkeyRepository.del(
            `question:choices:${updatedEntity.questionId}`,
          ),
          this.valkeyRepository.del(`question:${updatedEntity.questionId}`),
          this.valkeyRepository.del("questions:all"),
        ];
        if (question?.quizId) {
          invalidations.push(
            this.valkeyRepository.del(`quiz:questions:${question.quizId}`),
          );
          invalidations.push(
            this.valkeyRepository.del(`quiz:${question.quizId}`),
          );
          invalidations.push(this.valkeyRepository.del("quizzes:all"));
        }
        await Promise.all(invalidations);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), id },
          "Valkey cache invalidation failed during update",
        );
      }
      logger.info({ id }, "Choice updated successfully");
      return dto;
    } catch (error) {
      if (/** @type {BaseError} */ (error).statusCode) {
        throw error;
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
      const entity = await this.choiceRepository.findOne(id);
      if (!entity) {
        logger.warn({ id }, "Choice not found for deletion");
        throw CHOICE_NOT_FOUND(id);
      }
      await this.choiceRepository.delete(id);
      try {
        const invalidations = [
          this.valkeyRepository.del(`choice:${id}`),
          this.valkeyRepository.del("choices:all"),
          this.valkeyRepository.del("quizzes:all"),
          this.valkeyRepository.del("questions:all"),
        ];
        if (entity?.questionId) {
          invalidations.push(
            this.valkeyRepository.del(`question:choices:${entity.questionId}`),
          );
          invalidations.push(
            this.valkeyRepository.del(`question:${entity.questionId}`),
          );
          const question = await this.questionRepository.findOne(
            entity.questionId,
          );
          if (question?.quizId) {
            invalidations.push(
              this.valkeyRepository.del(`quiz:questions:${question.quizId}`),
            );
            invalidations.push(
              this.valkeyRepository.del(`quiz:${question.quizId}`),
            );
          }
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
      if (/** @type {BaseError} */ (error).statusCode) {
        throw error;
      }
      logger.error(
        { error: /** @type {Error} */ (error), id },
        "Error deleting choice",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }
}
