import { BaseService } from "common-core";
import logger from "common-logger";
import { QuizMapper } from "../mappers/quiz.mapper.js";
import { QUIZ_NOT_FOUND, QUIZ_CONFLICT } from "../errors/quiz.errors.js";
import { DATABASE_ERROR } from "../errors/internal.errors.js";
import { BaseError } from "common-errors";

export class QuizService extends BaseService {
  /**
   * @param {import('../repositories/quiz.repository.js').QuizRepository} quizRepository
   * @param {import('common-valkey').ValkeyRepository} valkeyRepository
   * @param {number} cacheTtl
   */
  constructor(quizRepository, valkeyRepository, cacheTtl) {
    super();
    /** @type {import('../repositories/quiz.repository.js').QuizRepository} */
    this.quizRepository = quizRepository;
    /** @type {import('common-valkey').ValkeyRepository} */
    this.valkeyRepository = valkeyRepository;
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
      const quizzes = await this.quizRepository.findAll();
      const response = quizzes.map(QuizMapper.toResponse);

      try {
        await this.valkeyRepository.set(cacheKey, response, this.cacheTtl);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError) },
          "Valkey cache set failed",
        );
      }

      logger.info({ count: quizzes.length }, "Quizzes fetched from DB");
      return response;
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
      const quiz = await this.quizRepository.findOne(id);
      if (!quiz) {
        logger.warn({ id }, "Quiz not found in DB");
        throw QUIZ_NOT_FOUND(id);
      }

      const response = QuizMapper.toResponse(quiz);
      try {
        await this.valkeyRepository.set(cacheKey, response, this.cacheTtl);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), id },
          "Valkey cache set failed",
        );
      }

      logger.info({ id }, "Quiz fetched from DB");
      return response;
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
      const quiz = await this.quizRepository.create(data);
      try {
        await this.valkeyRepository.del("quizzes:all");
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError) },
          "Valkey cache invalidation failed",
        );
      }
      logger.info({ id: quiz.id }, "Quiz created successfully");
      return QuizMapper.toResponse(quiz);
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
      const quiz = await this.quizRepository.update(id, data);
      if (!quiz) {
        logger.warn({ id }, "Quiz not found for update");
        throw QUIZ_NOT_FOUND(id);
      }
      const response = QuizMapper.toResponse(quiz);
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
      return response;
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
    logger.info({ id }, "Deleting quiz...");
    try {
      const quiz = await this.quizRepository.findByIdWithChildren(id);
      await this.quizRepository.delete(id);
      try {
        const invalidations = [
          this.valkeyRepository.del(`quiz:${id}`),
          this.valkeyRepository.del("quizzes:all"),
          this.valkeyRepository.del(`quiz:questions:${id}`),
          this.valkeyRepository.del("questions:all"),
          this.valkeyRepository.del("choices:all"),
        ];

        if (quiz?.questions) {
          for (const question of quiz.questions) {
            invalidations.push(
              this.valkeyRepository.del(`question:${question.id}`),
            );
            invalidations.push(
              this.valkeyRepository.del(`question:choices:${question.id}`),
            );
            if (question.choices) {
              for (const choice of question.choices) {
                invalidations.push(
                  this.valkeyRepository.del(`choice:${choice.id}`),
                );
              }
            }
          }
        }

        await Promise.all(invalidations);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), id },
          "Valkey cache invalidation failed during delete",
        );
      }
      logger.info({ id }, "Quiz deleted successfully");
    } catch (error) {
      logger.error(
        { error: /** @type {Error} */ (error), id },
        "Error deleting quiz",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }
}
