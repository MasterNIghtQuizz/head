import { BaseService } from "common-core";
import logger from "common-logger";
import { QuizMapper } from "../mappers/quiz.mapper.js";
import { QUIZ_NOT_FOUND, QUIZ_CONFLICT } from "../errors/quiz.errors.js";
import { DATABASE_ERROR } from "../errors/internal.errors.js";

export class QuizService extends BaseService {
  /**
   * @param {import('../repositories/quiz.repository.js').QuizRepository} quizRepository
   */
  constructor(quizRepository) {
    super();
    /** @type {import('../repositories/quiz.repository.js').QuizRepository} */
    this.quizRepository = quizRepository;
  }

  async getAllQuizzes() {
    logger.info("Fetching all quizzes...");
    try {
      const quizzes = await this.quizRepository.findAll();
      logger.info({ count: quizzes.length }, "Quizzes fetched successfully");
      return quizzes.map(QuizMapper.toResponse);
    } catch (error) {
      logger.error({ error }, "Error fetching all quizzes");
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} id
   */
  async getQuizById(id) {
    logger.info({ id }, "Fetching quiz by id...");
    let quiz;
    try {
      quiz = await this.quizRepository.findOne(id);
    } catch (error) {
      logger.error({ error, id }, "Error fetching quiz by id");
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
    if (!quiz) {
      logger.warn({ id }, "Quiz not found");
      throw QUIZ_NOT_FOUND(id);
    }
    logger.info({ id }, "Quiz fetched successfully");
    return QuizMapper.toResponse(quiz);
  }

  /**
   * @param {import('../contracts/quiz.dto.js').CreateQuizRequestDto} data
   */
  async createQuiz(data) {
    logger.info({ title: data.title }, "Creating new quiz...");
    try {
      const quiz = await this.quizRepository.create(data);
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
      logger.error({ error, data }, "Error creating quiz");
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} id
   * @param {import('../contracts/quiz.dto.js').UpdateQuizRequestDto} data
   */
  async updateQuiz(id, data) {
    logger.info({ id }, "Updating quiz...");
    let quiz;
    try {
      quiz = await this.quizRepository.update(id, data);
    } catch (error) {
      // @ts-ignore
      if (error?.code === "23505") {
        logger.warn({ id, title: data.title }, "Quiz update conflict");
        throw QUIZ_CONFLICT(data.title || id);
      }
      logger.error({ error, id, data }, "Error updating quiz");
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
    if (!quiz) {
      logger.warn({ id }, "Quiz not found for update");
      throw QUIZ_NOT_FOUND(id);
    }
    logger.info({ id }, "Quiz updated successfully");
    return QuizMapper.toResponse(quiz);
  }

  /**
   * @param {string} id
   */
  async deleteQuiz(id) {
    logger.info({ id }, "Deleting quiz...");
    try {
      await this.quizRepository.delete(id);
      logger.info({ id }, "Quiz deleted successfully");
    } catch (error) {
      logger.error({ error, id }, "Error deleting quiz");
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }
}
