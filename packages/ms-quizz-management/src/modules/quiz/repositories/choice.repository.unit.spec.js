import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ChoiceRepository } from "./choice.repository.js";
import { createChoiceMock } from "../../../tests/factories/choice.factory.js";

/**
 * @typedef {import('typeorm').DataSource} DataSource
 * @typedef {import('typeorm').Repository<import('../models/choice.model.js').Choice>} ChoiceRepo
 * @typedef {import('vitest').Mocked<ChoiceRepo>} ChoiceRepoMock
 */

describe("ChoiceRepository Unit Tests", () => {
  /** @type {ChoiceRepository} */
  let choiceRepository;

  /** @type {import('vitest').Mocked<DataSource>} */
  let dataSourceMock;

  /** @type {ChoiceRepoMock} */
  let typeormRepoMock;

  beforeEach(() => {
    typeormRepoMock = /** @type {ChoiceRepoMock} */ (
      /** @type {unknown} */ ({
        find: vi.fn(),
        findOneBy: vi.fn(),
        create: vi.fn(),
        save: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      })
    );

    dataSourceMock = /** @type {import('vitest').Mocked<DataSource>} */ (
      /** @type {unknown} */ ({
        getRepository: vi.fn().mockReturnValue(typeormRepoMock),
      })
    );

    choiceRepository = new ChoiceRepository(
      /** @type {import('typeorm').DataSource} */ (dataSourceMock),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("findByQuestionId", () => {
    it("should call find with correct question-id filter", async () => {
      const questionId = "q-123";
      const choices = [
        createChoiceMock({ id: "c1" }),
        createChoiceMock({ id: "c2" }),
      ];
      const spy = vi.spyOn(typeormRepoMock, "find").mockResolvedValue(choices);

      const result = await choiceRepository.findByQuestionId(questionId);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { question: { id: questionId } } }),
      );
      expect(result).toEqual(choices);
    });

    it("should return empty array when no choices found for question", async () => {
      const questionId = "non-existent";
      const spy = vi.spyOn(typeormRepoMock, "find").mockResolvedValue([]);

      const result = await choiceRepository.findByQuestionId(questionId);

      expect(spy).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("should create and save a new choice", async () => {
      const choiceData = { text: "Yes", is_correct: true, question_id: "q1" };
      const choiceInstance = createChoiceMock(choiceData);
      const createSpy = vi
        .spyOn(typeormRepoMock, "create")
        .mockReturnValue(choiceInstance);
      const saveSpy = vi
        .spyOn(typeormRepoMock, "save")
        .mockResolvedValue(choiceInstance);

      const result = await choiceRepository.create(choiceData);

      expect(createSpy).toHaveBeenCalledWith(choiceData);
      expect(saveSpy).toHaveBeenCalledWith(choiceInstance);
      expect(result).toEqual(choiceInstance);
    });
  });

  describe("delete", () => {
    it("should call delete on typeorm repository", async () => {
      const id = "uuid-123";
      const spy = vi
        .spyOn(typeormRepoMock, "delete")
        .mockResolvedValue({ affected: 1, raw: [] });

      await choiceRepository.delete(id);

      expect(spy).toHaveBeenCalledWith(id);
    });
  });
});
