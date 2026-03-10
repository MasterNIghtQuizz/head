import { BaseService } from "common-core";
import logger from "common-logger";
import { ChoiceMapper } from "../mappers/choice.mapper.js";
import { CHOICE_NOT_FOUND, CHOICE_CONFLICT } from "../errors/choice.errors.js";
import { DATABASE_ERROR } from "../errors/internal.errors.js";

export class ChoiceService extends BaseService {
  /**
   * @param {import('../repositories/choice.repository.js').ChoiceRepository} choiceRepository
   */
  constructor(choiceRepository) {
    super();
    /** @type {import('../repositories/choice.repository.js').ChoiceRepository} */
    this.choiceRepository = choiceRepository;
  }

  async getAllChoices() {
    logger.info("Fetching all choices...");
    try {
      const choices = await this.choiceRepository.findAll();
      logger.info({ count: choices.length }, "Choices fetched successfully");
      return choices.map(ChoiceMapper.toResponse);
    } catch (error) {
      logger.error({ error }, "Error fetching all choices");
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} id
   */
  async getChoiceById(id) {
    logger.info({ id }, "Fetching choice by id...");
    let choice;
    try {
      choice = await this.choiceRepository.findOne(id);
    } catch (error) {
      logger.error({ error, id }, "Error fetching choice by id");
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
    if (!choice) {
      logger.warn({ id }, "Choice not found");
      throw CHOICE_NOT_FOUND(id);
    }
    logger.info({ id }, "Choice fetched successfully");
    return ChoiceMapper.toResponse(choice);
  }

  /**
   * @param {string} questionId
   */
  async getChoicesByQuestionId(questionId) {
    logger.info({ questionId }, "Fetching choices for question...");
    try {
      const choices = await this.choiceRepository.findByQuestionId(questionId);
      logger.info(
        { questionId, count: choices.length },
        "Choices for question fetched",
      );
      return choices.map(ChoiceMapper.toResponse);
    } catch (error) {
      logger.error(
        { error, questionId },
        "Error fetching choices for question",
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
      logger.error({ error, data }, "Error creating choice");
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }

  /**
   * @param {string} id
   * @param {import('../contracts/choice.dto.js').UpdateChoiceRequestDto} data
   */
  async updateChoice(id, data) {
    logger.info({ id }, "Updating choice...");
    let choice;
    try {
      choice = await this.choiceRepository.update(id, data);
    } catch (error) {
      // @ts-ignore
      if (error?.code === "23505") {
        logger.warn({ id, text: data.text }, "Choice update conflict");
        throw CHOICE_CONFLICT(data.text || id);
      }
      logger.error({ error, id, data }, "Error updating choice");
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
    if (!choice) {
      logger.warn({ id }, "Choice not found for update");
      throw CHOICE_NOT_FOUND(id);
    }
    logger.info({ id }, "Choice updated successfully");
    return ChoiceMapper.toResponse(choice);
  }

  /**
   * @param {string} id
   */
  async deleteChoice(id) {
    logger.info({ id }, "Deleting choice...");
    try {
      await this.choiceRepository.delete(id);
      logger.info({ id }, "Choice deleted successfully");
    } catch (error) {
      logger.error({ error, id }, "Error deleting choice");
      throw DATABASE_ERROR(/** @type {Error} */ (error));
    }
  }
}
