import { BaseService } from "common-core";
import logger from "common-logger";
import { QuestionMapper } from "../mappers/question.mapper.js";
import {
  QUESTION_NOT_FOUND,
  QUESTION_CONFLICT,
} from "../errors/question.errors.js";
import { DATABASE_ERROR } from "../errors/internal.errors.js";
import { BaseError } from "common-errors";

export class QuestionService extends BaseService {
  /**
   * @param {import('../repositories/question.repository.js').QuestionRepository} questionRepository
   * @param {import('common-valkey').ValkeyRepository} valkeyRepository
   * @param {number} cacheTtl
   */
  constructor(questionRepository, valkeyRepository, cacheTtl) {
    super();
    /** @type {import('../repositories/question.repository.js').QuestionRepository} */
    this.questionRepository = questionRepository;
    /** @type {import('common-valkey').ValkeyRepository} */
    this.valkeyRepository = valkeyRepository;
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
      const questions = await this.questionRepository.findAll();
      const response = questions.map(QuestionMapper.toResponse);

      try {
        await this.valkeyRepository.set(cacheKey, response, this.cacheTtl);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError) },
          "Valkey cache set failed",
        );
      }

      logger.info({ count: questions.length }, "Questions fetched from DB");
      return response;
    } catch (error) {
      logger.error(
        { error: /** @type {Error} */ (error) },
        "Error fetching all questions from DB",
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
      const question = await this.questionRepository.findOne(id);
      if (!question) {
        logger.warn({ id }, "Question not found in DB");
        throw QUESTION_NOT_FOUND(id);
      }

      const response = QuestionMapper.toResponse(question);
      try {
        await this.valkeyRepository.set(cacheKey, response, this.cacheTtl);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), id },
          "Valkey cache set failed",
        );
      }

      logger.info({ id }, "Question fetched from DB");
      return response;
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
   * @param {string[]} ids
   */
  async getQuestionsByIds(ids) {
    logger.info({ ids }, "Fetching questions by ids...");
    try {
      const questions = await this.questionRepository.findByIds(ids);
      logger.info({ count: questions.length }, "Questions fetched by ids");
      return questions.map(QuestionMapper.toResponse);
    } catch (error) {
      logger.error(
        { error: /** @type {Error} */ (error), ids },
        "Error fetching questions by ids",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} quizId
   */
  async getQuestionsByQuizId(quizId) {
    logger.info({ quizId }, "Fetching questions for quiz...");
    const cacheKey = `quiz:questions:${quizId}`;
    try {
      const cached = await this.valkeyRepository.get(cacheKey);
      if (cached) {
        logger.info({ quizId }, "Questions for quiz fetched from cache");
        return cached;
      }
    } catch (error) {
      logger.warn(
        { error: /** @type  {Error} */ (error), quizId },
        "Valkey cache get failed, falling back to DB",
      );
    }

    try {
      const questions = await this.questionRepository.findByQuizId(quizId);
      const response = questions.map(QuestionMapper.toResponse);

      try {
        await this.valkeyRepository.set(cacheKey, response, this.cacheTtl);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), quizId },
          "Valkey cache set failed",
        );
      }

      logger.info(
        { quizId, count: questions.length },
        "Questions for quiz fetched from DB",
      );
      return response;
    } catch (error) {
      logger.error(
        { error: /** @type {Error} */ (error), quizId },
        "Error fetching questions for quiz from DB",
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
      const question = await this.questionRepository.create(data);
      try {
        await Promise.all([
          this.valkeyRepository.del("questions:all"),
          data.quiz_id
            ? this.valkeyRepository.del(`quiz:questions:${data.quiz_id}`)
            : Promise.resolve(),
        ]);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError) },
          "Valkey cache invalidation failed during create",
        );
      }
      logger.info({ id: question.id }, "Question created successfully");
      return QuestionMapper.toResponse(question);
    } catch (error) {
      // @ts-ignore
      if (error?.code === "23505") {
        logger.warn({ label: data.label }, "Question conflict");
        throw QUESTION_CONFLICT(data.label);
      }
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
      const question = await this.questionRepository.update(id, data);
      if (!question) {
        logger.warn({ id }, "Question not found for update");
        throw QUESTION_NOT_FOUND(id);
      }

      const response = QuestionMapper.toResponse(question);
      try {
        const invalidations = [
          this.valkeyRepository.del(`question:${id}`),
          this.valkeyRepository.del("questions:all"),
        ];

        if (question.quiz?.id) {
          invalidations.push(
            this.valkeyRepository.del(`quiz:questions:${question.quiz.id}`),
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
      return response;
    } catch (error) {
      if (/** @type {BaseError} */ (error).statusCode) {
        throw error;
      }
      // @ts-ignore
      if (error?.code === "23505") {
        logger.warn({ id, label: data.label }, "Question update conflict");
        throw QUESTION_CONFLICT(data.label ?? "unknown");
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
      const question = await this.questionRepository.findOne(id);
      await this.questionRepository.delete(id);

      try {
        const invalidations = [
          this.valkeyRepository.del(`question:${id}`),
          this.valkeyRepository.del("questions:all"),
        ];

        if (question?.quiz?.id) {
          invalidations.push(
            this.valkeyRepository.del(`quiz:questions:${question.quiz.id}`),
          );
        }

        await Promise.all(invalidations);
      } catch (cacheError) {
        logger.warn(
          { error: /** @type {Error} */ (cacheError), id },
          "Valkey cache invalidation failed during delete",
        );
      }

      logger.info({ id }, "Question deleted successfully");
    } catch (error) {
      logger.error(
        { error: /** @type {Error} */ (error), id },
        "Error deleting question",
      );
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }
}
