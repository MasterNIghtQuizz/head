import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { QuizRepository } from "./quiz.repository.js";
import { createQuizMock } from "../../../tests/factories/quiz.factory.js";

/**
 * @typedef {import('typeorm').DataSource} DataSource
 * @typedef {import('typeorm').Repository<import('../models/quiz.model.js').Quiz>} QuizRepo
 * @typedef {import('vitest').Mocked<QuizRepo>} QuizRepoMock
 */

describe("QuizRepository Unit Tests", () => {
  /** @type {QuizRepository} */
  let quizRepository;

  /** @type {import('vitest').Mocked<DataSource>} */
  let dataSourceMock;

  /** @type {QuizRepoMock} */
  let typeormRepoMock;

  beforeEach(() => {
    typeormRepoMock = /** @type {QuizRepoMock} */ (
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

    quizRepository = new QuizRepository(
      /** @type {import('typeorm').DataSource} */ (dataSourceMock),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("findAll", () => {
    it("should call find on typeorm repository", async () => {
      const quiz = createQuizMock();
      const expectedQuizzes = [quiz];
      const spy = vi
        .spyOn(typeormRepoMock, "find")
        .mockResolvedValue(expectedQuizzes);

      const result = await quizRepository.findAll();

      expect(spy).toHaveBeenCalled();
      expect(result).toEqual(expectedQuizzes);
    });

    it("should return empty array when no quizzes found", async () => {
      const spy = vi.spyOn(typeormRepoMock, "find").mockResolvedValue([]);

      const result = await quizRepository.findAll();

      expect(spy).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("should call findOneBy with correct id", async () => {
      const id = "uuid-123";
      const expectedQuiz = createQuizMock({ id });
      const spy = vi
        .spyOn(typeormRepoMock, "findOneBy")
        .mockResolvedValue(expectedQuiz);

      const result = await quizRepository.findOne(id);

      expect(spy).toHaveBeenCalledWith({ id });
      expect(result).toEqual(expectedQuiz);
    });

    it("should return null when quiz not found", async () => {
      const id = "non-existent";
      const spy = vi
        .spyOn(typeormRepoMock, "findOneBy")
        .mockResolvedValue(null);

      const result = await quizRepository.findOne(id);

      expect(spy).toHaveBeenCalledWith({ id });
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create and save a new quiz", async () => {
      const quizData = { title: "Test Quiz" };
      const quizInstance = createQuizMock(quizData);
      const createSpy = vi
        .spyOn(typeormRepoMock, "create")
        .mockReturnValue(quizInstance);
      const saveSpy = vi
        .spyOn(typeormRepoMock, "save")
        .mockResolvedValue(quizInstance);

      const result = await quizRepository.create(quizData);

      expect(createSpy).toHaveBeenCalledWith(quizData);
      expect(saveSpy).toHaveBeenCalledWith(quizInstance);
      expect(result).toEqual(quizInstance);
    });
  });

  describe("update", () => {
    it("should update and return the updated quiz", async () => {
      const id = "uuid-123";
      const updateData = { title: "Updated Title" };
      const updatedQuiz = createQuizMock({ id, ...updateData });
      const updateSpy = vi
        .spyOn(typeormRepoMock, "update")
        .mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      const findSpy = vi
        .spyOn(typeormRepoMock, "findOneBy")
        .mockResolvedValue(updatedQuiz);

      const result = await quizRepository.update(id, updateData);

      expect(updateSpy).toHaveBeenCalledWith(id, updateData);
      expect(findSpy).toHaveBeenCalledWith({ id });
      expect(result).toEqual(updatedQuiz);
    });
  });

  describe("delete", () => {
    it("should call delete on typeorm repository", async () => {
      const id = "uuid-123";
      const spy = vi.spyOn(typeormRepoMock, "delete").mockResolvedValue({
        affected: 1,
        raw: [],
      });

      await quizRepository.delete(id);

      expect(spy).toHaveBeenCalledWith(id);
    });
  });
});
