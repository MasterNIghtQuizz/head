import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { QuestionRepository } from "./question.repository.js";
import { createQuestionMock } from "../../../tests/factories/question.factory.js";

/**
 * @typedef {import('typeorm').DataSource} DataSource
 * @typedef {import('typeorm').Repository<import('../models/question.model.js').Question>} QuestionRepo
 * @typedef {import('vitest').Mocked<QuestionRepo>} QuestionRepoMock
 */

describe("QuestionRepository Unit Tests", () => {
  /** @type {QuestionRepository} */
  let questionRepository;

  /** @type {import('vitest').Mocked<DataSource>} */
  let dataSourceMock;

  /** @type {QuestionRepoMock} */
  let typeormRepoMock;

  beforeEach(() => {
    typeormRepoMock = /** @type {QuestionRepoMock} */ (
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

    questionRepository = new QuestionRepository(
      /** @type {import('typeorm').DataSource} */ (dataSourceMock),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("findByIds", () => {
    it("should call find with correct in-ids filter", async () => {
      const ids = ["uuid-1", "uuid-2"];
      const questions = [
        createQuestionMock({ id: "uuid-1" }),
        createQuestionMock({ id: "uuid-2" }),
      ];
      const spy = vi
        .spyOn(typeormRepoMock, "find")
        .mockResolvedValue(questions);

      const result = await questionRepository.findByIds(ids);

      expect(spy).toHaveBeenCalled();
      expect(result).toEqual(questions);
    });

    it("should return empty array when no IDs provided or found", async () => {
      const spy = vi.spyOn(typeormRepoMock, "find").mockResolvedValue([]);

      const result = await questionRepository.findByIds([]);

      expect(spy).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe("findByQuizId", () => {
    it("should call find with quiz-id filter", async () => {
      const quizId = "quiz-123";
      const questions = [createQuestionMock({ id: "uuid-1" })];
      const spy = vi
        .spyOn(typeormRepoMock, "find")
        .mockResolvedValue(questions);

      const result = await questionRepository.findByQuizId(quizId);

      expect(spy).toHaveBeenCalled();
      expect(result).toEqual(questions);
    });
  });

  describe("create", () => {
    it("should create and save a new question", async () => {
      const questionData = { label: "What is 1+1?", quiz_id: "q123" };
      const questionInstance = createQuestionMock(questionData);
      const createSpy = vi
        .spyOn(typeormRepoMock, "create")
        .mockReturnValue(questionInstance);
      const saveSpy = vi
        .spyOn(typeormRepoMock, "save")
        .mockResolvedValue(questionInstance);

      const result = await questionRepository.create(
        /** @type {import('typeorm').DeepPartial<import('../models/question.model.js').Question>} */
        questionData,
      );

      expect(createSpy).toHaveBeenCalledWith({
        label: "What is 1+1?",
        quiz: { id: "q123" },
      });
      expect(saveSpy).toHaveBeenCalledWith(questionInstance);
      expect(result).toEqual(questionInstance);
    });
  });

  describe("delete", () => {
    it("should call delete on typeorm repository", async () => {
      const id = "uuid-123";
      const spy = vi
        .spyOn(typeormRepoMock, "delete")
        .mockResolvedValue({ affected: 1, raw: [] });

      await questionRepository.delete(id);

      expect(spy).toHaveBeenCalledWith(id);
    });
  });
});
