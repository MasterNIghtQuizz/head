import { BaseService } from "common-core";
import logger from "../../../logger.js";
import { QUIZ_NOT_FOUND, QUIZ_CONFLICT } from "../errors/quiz.errors.js";
import { DATABASE_ERROR } from "../errors/internal.errors.js";
import { BaseError } from "common-errors";
import { QuizEntity } from "../core/entities/quiz.entity.js";
import { QuizMapper } from "../infra/mappers/quiz.mapper.js";

export class QuizService extends BaseService {
  /**
   * @param {import('../core/ports/quiz.repository.js').IQuizRepository} quizRepository
   * @param {number} cacheTtl
   */
  constructor(quizRepository, cacheTtl) {
    super();
    /** @type {import('../core/ports/quiz.repository.js').IQuizRepository} */
    this.quizRepository = quizRepository;
    /** @type {import('common-valkey').ValkeyRepository} */
    this.valkeyRepository = quizRepository.valkeyRepository;
    /** @type {number} */
    this.cacheTtl = cacheTtl;
  }

  async getAllQuizzes() {
    logger.info("Fetching all quizzes...");
    const cacheKey = "quizzes:all";
    try {
      const cached = await this.valkeyRepository.get(cacheKey);
      if (cached) {
        logger.info("Quizzes fetched from cache");
        return cached;
      }
    } catch (error) {
      logger.warn(
        { error: /** @type {Error} */ (error) },
        "Valkey cache get failed, falling back to DB",
      );
    }

    try {
      const entities = await this.quizRepository.findAll();
      const dtos = QuizMapper.toDtos(entities);

      try {
        await this.valkeyRepository.set(cacheKey, dtos, this.cacheTtl);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError) },
          "Valkey cache set failed",
        );
      }

      logger.info({ count: entities.length }, "Quizzes fetched from DB");
      return dtos;
    } catch (error) {
      logger.error(
        { error: /** @type {Error} */ (error) },
        "Error fetching all quizzes from DB",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} id
   */
  async getQuizById(id) {
    logger.info({ id }, "Fetching quiz by id...");
    const cacheKey = `quiz:${id}`;
    try {
      const cached = await this.valkeyRepository.get(cacheKey);
      if (cached) {
        logger.info({ id }, "Quiz fetched from cache");
        return cached;
      }
    } catch (error) {
      logger.warn(
        { error: /** @type {Error} */ (error), id },
        "Valkey cache get failed, falling back to DB",
      );
    }

    try {
      const entity = await this.quizRepository.findOne(id);
      if (!entity) {
        logger.warn({ id }, "Quiz not found in DB");
        throw QUIZ_NOT_FOUND(id);
      }

      const dto = QuizMapper.toDto(entity);
      try {
        await this.valkeyRepository.set(cacheKey, dto, this.cacheTtl);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), id },
          "Valkey cache set failed",
        );
      }

      logger.info({ id }, "Quiz fetched from DB");
      return dto;
    } catch (error) {
      if (/** @type {BaseError} */ (error).statusCode) {
        throw error;
      }
      logger.error(
        { error: /** @type {Error} */ (error), id },
        "Error fetching quiz by id from DB",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {import('../contracts/quiz.dto.js').CreateQuizRequestDto} data
   */
  async createQuiz(data) {
    logger.info({ title: data.title }, "Creating new quiz...");
    try {
      const entity = new QuizEntity({
        title: data.title,
        description: data.description,
      });
      const createdEntity = await this.quizRepository.create(entity);
      try {
        await this.valkeyRepository.del("quizzes:all");
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError) },
          "Valkey cache invalidation failed",
        );
      }
      logger.info({ id: createdEntity.id }, "Quiz created successfully");
      return QuizMapper.toDto(createdEntity);
    } catch (error) {
      // @ts-ignore
      if (error?.code === "23505") {
        logger.warn(
          { title: data.title },
          "Quiz conflict: title already exists",
        );
        throw QUIZ_CONFLICT(data.title || "unknown");
      }
      logger.error(
        { error: /** @type {Error} */ (error), data },
        "Error creating quiz",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} id
   * @param {import('../contracts/quiz.dto.js').UpdateQuizRequestDto} data
   */
  async updateQuiz(id, data) {
    logger.info({ id }, "Updating quiz...");
    try {
      const entity = await this.quizRepository.findOne(id);
      if (!entity) {
        logger.warn({ id }, "Quiz not found for update");
        throw QUIZ_NOT_FOUND(id);
      }

      entity.update(data);
      const updatedEntity = await this.quizRepository.update(id, entity);
      if (!updatedEntity) {
        throw QUIZ_NOT_FOUND(id);
      }

      const dto = QuizMapper.toDto(updatedEntity);
      try {
        await Promise.all([
          this.valkeyRepository.del(`quiz:${id}`),
          this.valkeyRepository.del("quizzes:all"),
        ]);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), id },
          "Valkey cache invalidation failed during update",
        );
      }
      logger.info({ id }, "Quiz updated successfully");
      return dto;
    } catch (error) {
      if (/** @type {BaseError} */ (error).statusCode) {
        throw error;
      }
      // @ts-ignore
      if (error?.code === "23505") {
        logger.warn({ id, title: data.title }, "Quiz update conflict");
        throw QUIZ_CONFLICT(data.title || id);
      }
      logger.error(
        { error: /** @type {Error} */ (error), id, data },
        "Error updating quiz",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} id
   */
  async deleteQuiz(id) {
    logger.info({ id }, "Deleting quiz and cascading cache invalidation...");
    try {
      const entity = await this.quizRepository.findByIdWithChildren(id);

      if (!entity) {
        logger.warn({ id }, "Quiz not found for deletion");
        throw QUIZ_NOT_FOUND(id);
      }
      await this.quizRepository.delete(id);

      const keysToInvalidate = new Set([
        `quiz:${id}`,
        "quizzes:all",
        `quiz:questions:${id}`,
        "questions:all",
        "choices:all",
      ]);

      if (entity.questions?.length > 0) {
        entity.questions.forEach((question) => {
          keysToInvalidate.add(`question:${question.id}`);
          keysToInvalidate.add(`question:choices:${question.id}`);

          if (question.choices?.length > 0) {
            question.choices.forEach((choice) => {
              keysToInvalidate.add(`choice:${choice.id}`);
            });
          }
        });
      }
      try {
        await Promise.all(
          Array.from(keysToInvalidate).map((key) =>
            this.valkeyRepository
              .del(key)
              ?.catch?.((err) =>
                logger.warn(
                  { key, err: err.message },
                  "Failed to delete cache key during quiz delete",
                ),
              ),
          ),
        );
      } catch (cacheError) {
        logger.error(
          { error: cacheError },
          "Global cache invalidation failed during quiz delete",
        );
      }

      logger.info(
        { id },
        "Quiz and all related sub-resources deleted successfully",
      );
    } catch (error) {
      if (/** @type {BaseError} */ (error).statusCode) {
        throw error;
      } // Relance les erreurs métier (404)

      logger.error(
        { error: /** @type {Error} */ (error), id },
        "Error during quiz deletion",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }
}
