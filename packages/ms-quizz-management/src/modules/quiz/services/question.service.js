import { BaseService } from "common-core";
import logger from "common-logger";
import { QuestionMapper } from "../mappers/question.mapper.js";
import {
  QUESTION_NOT_FOUND,
  QUESTION_CONFLICT,
} from "../errors/question.errors.js";
import { DATABASE_ERROR } from "../errors/internal.errors.js";

export class QuestionService extends BaseService {
  /**
   * @param {import('../repositories/question.repository.js').QuestionRepository} questionRepository
   */
  constructor(questionRepository) {
    super();
    /** @type {import('../repositories/question.repository.js').QuestionRepository} */
    this.questionRepository = questionRepository;
  }

  async getAllQuestions() {
    logger.info("Fetching all questions...");
    try {
      const questions = await this.questionRepository.findAll();
      logger.info(
        { count: questions.length },
        "Questions fetched successfully",
      );
      return questions.map(QuestionMapper.toResponse);
    } catch (error) {
      logger.error({ error }, "Error fetching all questions");
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} id
   */
  async getQuestionById(id) {
    logger.info({ id }, "Fetching question by id...");
    let question;
    try {
      question = await this.questionRepository.findOne(id);
    } catch (error) {
      logger.error({ error, id }, "Error fetching question by id");
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
    if (!question) {
      logger.warn({ id }, "Question not found");
      throw QUESTION_NOT_FOUND(id);
    }
    logger.info({ id }, "Question fetched successfully");
    return QuestionMapper.toResponse(question);
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
      logger.error({ error, ids }, "Error fetching questions by ids");
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} quizId
   */
  async getQuestionsByQuizId(quizId) {
    logger.info({ quizId }, "Fetching questions for quiz...");
    try {
      const questions = await this.questionRepository.findByQuizId(quizId);
      logger.info(
        { quizId, count: questions.length },
        "Questions for quiz fetched",
      );
      return questions.map(QuestionMapper.toResponse);
    } catch (error) {
      logger.error({ error, quizId }, "Error fetching questions for quiz");
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
      logger.info({ id: question.id }, "Question created successfully");
      return QuestionMapper.toResponse(question);
    } catch (error) {
      // @ts-ignore
      if (error?.code === "23505") {
        logger.warn({ label: data.label }, "Question conflict");
        throw QUESTION_CONFLICT(data.label || "unknown");
      }
      logger.error({ error, data }, "Error creating question");
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} id
   * @param {import('../contracts/question.dto.js').UpdateQuestionRequestDto} data
   */
  async updateQuestion(id, data) {
    logger.info({ id }, "Updating question...");
    let question;
    try {
      question = await this.questionRepository.update(id, data);
    } catch (error) {
      // @ts-ignore
      if (error?.code === "23505") {
        logger.warn({ id, label: data.label }, "Question update conflict");
        throw QUESTION_CONFLICT(data.label || id);
      }
      logger.error({ error, id, data }, "Error updating question");
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
    if (!question) {
      logger.warn({ id }, "Question not found for update");
      throw QUESTION_NOT_FOUND(id);
    }
    logger.info({ id }, "Question updated successfully");
    return QuestionMapper.toResponse(question);
  }

  /**
   * @param {string} id
   */
  async deleteQuestion(id) {
    logger.info({ id }, "Deleting question...");
    try {
      await this.questionRepository.delete(id);
      logger.info({ id }, "Question deleted successfully");
    } catch (error) {
      logger.error({ error, id }, "Error deleting question");
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }
}
