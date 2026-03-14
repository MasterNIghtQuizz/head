import { BaseService } from "common-core";
import logger from "common-logger";
import { QUESTION_NOT_FOUND } from "../errors/question.errors.js";
import { DATABASE_ERROR } from "../errors/internal.errors.js";
import { BaseError } from "common-errors";
import { QuestionEntity } from "../core/entities/question.entity.js";
import { QuestionMapper } from "../infra/mappers/question.mapper.js";

export class QuestionService extends BaseService {
  /**
   * @param {import('../core/ports/question.repository.js').IQuestionRepository} questionRepository
   * @param {number} cacheTtl
   */
  constructor(questionRepository, cacheTtl) {
    super();
    /** @type {import('../core/ports/question.repository.js').IQuestionRepository} */
    this.questionRepository = questionRepository;
    /** @type {import('common-valkey').ValkeyRepository} */
    this.valkeyRepository = questionRepository.valkeyRepository;
    /** @type {number} */
    this.cacheTtl = cacheTtl;
  }

  async getAllQuestions() {
    logger.info("Fetching all questions...");
    const cacheKey = "questions:all";
    try {
      const cached = await this.valkeyRepository.get(cacheKey);
      if (cached) {
        logger.info("Questions fetched from cache");
        return cached;
      }
    } catch (error) {
      logger.warn(
        { error: /** @type {Error} */ (error) },
        "Valkey cache get failed, falling back to DB",
      );
    }

    try {
      const entities = await this.questionRepository.findAll();
      const dtos = QuestionMapper.toDtos(entities);

      try {
        await this.valkeyRepository.set(cacheKey, dtos, this.cacheTtl);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError) },
          "Valkey cache set failed",
        );
      }

      logger.info({ count: entities.length }, "Questions fetched from DB");
      return dtos;
    } catch (error) {
      logger.error(
        { error: /** @type {Error} */ (error) },
        "Error fetching all questions from DB",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} quizId
   */
  async getQuestionsByQuizId(quizId) {
    logger.info({ quizId }, "Fetching questions by quizId...");
    const cacheKey = `quiz:questions:${quizId}`;
    try {
      const cached = await this.valkeyRepository.get(cacheKey);
      if (cached) {
        logger.info({ quizId }, "Questions fetched from cache");
        return cached;
      }
    } catch (error) {
      logger.warn(
        { error: /** @type {Error} */ (error), quizId },
        "Valkey cache get failed, falling back to DB",
      );
    }

    try {
      const entities = await this.questionRepository.findByQuizId(quizId);
      const dtos = QuestionMapper.toDtos(entities);

      try {
        await this.valkeyRepository.set(cacheKey, dtos, this.cacheTtl);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), quizId },
          "Valkey cache set failed",
        );
      }

      logger.info(
        { quizId, count: entities.length },
        "Questions fetched from DB",
      );
      return dtos;
    } catch (error) {
      logger.error(
        { error: /** @type {Error} */ (error), quizId },
        "Error fetching questions by quizId from DB",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} id
   */
  async getQuestionById(id) {
    logger.info({ id }, "Fetching question by id...");
    const cacheKey = `question:${id}`;
    try {
      const cached = await this.valkeyRepository.get(cacheKey);
      if (cached) {
        logger.info({ id }, "Question fetched from cache");
        return cached;
      }
    } catch (error) {
      logger.warn(
        { error: /** @type {Error} */ (error), id },
        "Valkey cache get failed, falling back to DB",
      );
    }

    try {
      const entity = await this.questionRepository.findOne(id);
      if (!entity) {
        logger.warn({ id }, "Question not found in DB");
        throw QUESTION_NOT_FOUND(id);
      }

      const dto = QuestionMapper.toDto(entity);
      try {
        await this.valkeyRepository.set(cacheKey, dto, this.cacheTtl);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), id },
          "Valkey cache set failed",
        );
      }

      logger.info({ id }, "Question fetched from DB");
      return dto;
    } catch (error) {
      if (/** @type {BaseError} */ (error).statusCode) {
        throw error;
      }
      logger.error(
        { error: /** @type {Error} */ (error), id },
        "Error fetching question by id from DB",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {import('../contracts/question.dto.js').CreateQuestionRequestDto} data
   */
  async createQuestion(data) {
    logger.info({ label: data.label }, "Creating new question...");
    try {
      const entity = new QuestionEntity({
        label: data.label,
        type: data.type,
        order_index: data.order_index,
        timer_seconds: data.timer_seconds,
        quizId: data.quiz_id,
      });
      const createdEntity = await this.questionRepository.create(entity);
      try {
        await Promise.all([
          this.valkeyRepository.del("questions:all"),
          data.quiz_id
            ? this.valkeyRepository.del(`quiz:questions:${data.quiz_id}`)
            : Promise.resolve(),
          data.quiz_id
            ? this.valkeyRepository.del(`quiz:${data.quiz_id}`)
            : Promise.resolve(),
          this.valkeyRepository.del("quizzes:all"),
        ]);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError) },
          "Valkey cache invalidation failed",
        );
      }
      logger.info({ id: createdEntity.id }, "Question created successfully");
      return QuestionMapper.toDto(createdEntity);
    } catch (error) {
      logger.error(
        { error: /** @type {Error} */ (error), data },
        "Error creating question",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} id
   * @param {import('../contracts/question.dto.js').UpdateQuestionRequestDto} data
   */
  async updateQuestion(id, data) {
    logger.info({ id }, "Updating question...");
    try {
      const entity = await this.questionRepository.findOne(id);
      if (!entity) {
        logger.warn({ id }, "Question not found for update");
        throw QUESTION_NOT_FOUND(id);
      }

      entity.update(data);
      const updatedEntity = await this.questionRepository.update(id, entity);
      if (!updatedEntity) {
        throw QUESTION_NOT_FOUND(id);
      }

      const dto = QuestionMapper.toDto(updatedEntity);
      try {
        const invalidations = [
          this.valkeyRepository.del(`question:${id}`),
          this.valkeyRepository.del("questions:all"),
          this.valkeyRepository.del("quizzes:all"),
        ];
        if (updatedEntity.quizId) {
          invalidations.push(
            this.valkeyRepository.del(`quiz:questions:${updatedEntity.quizId}`),
          );
          invalidations.push(
            this.valkeyRepository.del(`quiz:${updatedEntity.quizId}`),
          );
        }
        await Promise.all(invalidations);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), id },
          "Valkey cache invalidation failed during update",
        );
      }
      logger.info({ id }, "Question updated successfully");
      return dto;
    } catch (error) {
      if (/** @type {BaseError} */ (error).statusCode) {
        throw error;
      }
      logger.error(
        { error: /** @type {Error} */ (error), id, data },
        "Error updating question",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} id
   */
  async deleteQuestion(id) {
    logger.info({ id }, "Deleting question...");
    try {
      const entity = await this.questionRepository.findByIdWithChildren(id);
      if (!entity) {
        logger.warn({ id }, "Question not found for deletion");
        throw QUESTION_NOT_FOUND(id);
      }
      await this.questionRepository.delete(id);
      const keys = [
        `question:${id}`,
        "questions:all",
        `question:choices:${id}`,
        "choices:all",
        "quizzes:all",
      ];

      if (entity.quizId) {
        keys.push(`quiz:questions:${entity.quizId}`, `quiz:${entity.quizId}`);
      }

      if (entity.choices?.length > 0) {
        entity.choices.forEach((c) => keys.push(`choice:${c.id}`));
      }

      await Promise.all(
        keys.map((key) =>
          this.valkeyRepository
            .del(key)
            .catch((err) =>
              logger.warn(
                { key, err: err.message },
                "Failed to delete a specific cache key",
              ),
            ),
        ),
      );
    } catch (error) {
      if (/** @type {BaseError} */ (error).statusCode) {
        throw error;
      }
      logger.error(
        { error: /** @type {Error} */ (error), id },
        "Error deleting question",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }
}
