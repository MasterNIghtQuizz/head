/* eslint-disable no-unused-vars */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ChoiceService } from "./choice.service.js";
import { ChoiceRepository } from "../repositories/choice.repository.js";
import { ValkeyRepository } from "common-valkey";
import { createChoiceMock } from "../../../tests/factories/choice.factory.js";
import { createQuestionMock } from "../../../tests/factories/question.factory.js";
import { CreateChoiceRequestDto } from "../contracts/choice.dto.js";
import {
  NotFoundError,
  ConflictError,
  InternalServerError,
} from "common-errors";

/**
 * @typedef {import('../models/choice.model.js').Choice} Choice
 * @typedef {import('vitest').Mocked<ChoiceRepository>} ChoiceRepositoryMock
 * @typedef {import('vitest').Mocked<ValkeyRepository>} ValkeyRepositoryMock
 */

describe("ChoiceService Unit Tests", () => {
  /** @type {ChoiceService} */
  let choiceService;

  /** @type {ChoiceRepositoryMock} */
  let choiceRepositoryMock;

  /** @type {ValkeyRepositoryMock} */
  let valkeyRepositoryMock;

  const CACHE_TTL = 3600;

  beforeEach(() => {
    choiceRepositoryMock = /** @type {ChoiceRepositoryMock} */ (
      Object.create(ChoiceRepository.prototype)
    );
    valkeyRepositoryMock = /** @type {ValkeyRepositoryMock} */ ({
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      delByPattern: vi.fn(),
    });
    choiceService = new ChoiceService(
      choiceRepositoryMock,
      valkeyRepositoryMock,
      CACHE_TTL,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAllChoices", () => {
    it("should return all choices from DB if cache is empty", async () => {
      const choices = [createChoiceMock({ id: "1" })];
      valkeyRepositoryMock.get.mockResolvedValue(null);
      const spy = vi
        .spyOn(choiceRepositoryMock, "findAll")
        .mockResolvedValue(choices);

      const result = await choiceService.getAllChoices();

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith("choices:all");
      expect(spy).toHaveBeenCalled();
      expect(valkeyRepositoryMock.set).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("should return all choices from cache if available", async () => {
      const cached = [{ id: "1", text: "Cached" }];
      valkeyRepositoryMock.get.mockResolvedValue(cached);
      const spy = vi.spyOn(choiceRepositoryMock, "findAll");

      const result = await choiceService.getAllChoices();

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith("choices:all");
      expect(spy).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it("should throw DATABASE_ERROR if fetch fails", async () => {
      vi.spyOn(choiceRepositoryMock, "findAll").mockRejectedValue(
        new Error("Fails"),
      );
      await expect(choiceService.getAllChoices()).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe("getChoiceById", () => {
    it("should return a choice from cache if available", async () => {
      const cached = { id: "1", text: "Cached" };
      valkeyRepositoryMock.get.mockResolvedValue(cached);
      const findOneSpy = vi.spyOn(choiceRepositoryMock, "findOne");

      const result = await choiceService.getChoiceById("1");

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith("choice:1");
      expect(findOneSpy).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it("should return choice from DB and populate cache if cache is empty", async () => {
      const choice = createChoiceMock({ id: "1" });
      valkeyRepositoryMock.get.mockResolvedValue(null);
      vi.spyOn(choiceRepositoryMock, "findOne").mockResolvedValue(choice);

      const result = await choiceService.getChoiceById("1");

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith("choice:1");
      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        "choice:1",
        expect.any(Object),
        CACHE_TTL,
      );
      expect(result.id).toBe("1");
    });

    it("should fallback to DB if cache GET fails", async () => {
      const choice = createChoiceMock({ id: "1" });
      valkeyRepositoryMock.get.mockRejectedValue(new Error("Cache Down"));
      vi.spyOn(choiceRepositoryMock, "findOne").mockResolvedValue(choice);

      const result = await choiceService.getChoiceById("1");

      expect(result.id).toBe("1");
      expect(choiceRepositoryMock.findOne).toHaveBeenCalledWith("1");
    });

    it("should throw CHOICE_NOT_FOUND if choice does not exist", async () => {
      vi.spyOn(choiceRepositoryMock, "findOne").mockResolvedValue(null);

      await expect(choiceService.getChoiceById("99")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should throw DATABASE_ERROR if fetch fails", async () => {
      vi.spyOn(choiceRepositoryMock, "findOne").mockRejectedValue(
        new Error("Fails"),
      );
      await expect(choiceService.getChoiceById("1")).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe("getChoicesByQuestionId", () => {
    it("should return choices from cache if available", async () => {
      const cached = [{ id: "1", text: "Cached" }];
      valkeyRepositoryMock.get.mockResolvedValue(cached);
      const findByQuestionIdSpy = vi.spyOn(
        choiceRepositoryMock,
        "findByQuestionId",
      );

      const result = await choiceService.getChoicesByQuestionId("q1");

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith(
        "question:choices:q1",
      );
      expect(findByQuestionIdSpy).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it("should return choices from DB and populate cache if cache is empty", async () => {
      const choices = [createChoiceMock({ id: "1" })];
      valkeyRepositoryMock.get.mockResolvedValue(null);
      vi.spyOn(choiceRepositoryMock, "findByQuestionId").mockResolvedValue(
        choices,
      );

      const result = await choiceService.getChoicesByQuestionId("q1");

      expect(valkeyRepositoryMock.get).toHaveBeenCalledWith(
        "question:choices:q1",
      );
      expect(valkeyRepositoryMock.set).toHaveBeenCalledWith(
        "question:choices:q1",
        expect.any(Array),
        CACHE_TTL,
      );
      expect(result).toHaveLength(1);
    });

    it("should fallback to DB if cache GET fails", async () => {
      const choices = [createChoiceMock({ id: "1" })];
      valkeyRepositoryMock.get.mockRejectedValue(new Error("Cache Down"));
      vi.spyOn(choiceRepositoryMock, "findByQuestionId").mockResolvedValue(
        choices,
      );

      const result = await choiceService.getChoicesByQuestionId("q1");

      expect(result).toHaveLength(1);
      expect(choiceRepositoryMock.findByQuestionId).toHaveBeenCalledWith("q1");
    });

    it("should throw DATABASE_ERROR if fetch fails", async () => {
      vi.spyOn(choiceRepositoryMock, "findByQuestionId").mockRejectedValue(
        new Error("Fails"),
      );
      await expect(choiceService.getChoicesByQuestionId("q1")).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe("createChoice", () => {
    it("should invalidate cache on create", async () => {
      const data = { text: "Yes", is_correct: true, question_id: "q1" };
      const created = createChoiceMock({ id: "c1", ...data });
      vi.spyOn(choiceRepositoryMock, "create").mockResolvedValue(created);

      await choiceService.createChoice(new CreateChoiceRequestDto(data));

      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("choices:all");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(
        "question:choices:q1",
      );
    });

    it("should throw CHOICE_CONFLICT if text already exists", async () => {
      const error = new Error("Conflict");
      // @ts-ignore
      error.code = "23505";
      vi.spyOn(choiceRepositoryMock, "create").mockRejectedValue(error);

      await expect(
        choiceService.createChoice(
          new CreateChoiceRequestDto({
            text: "Existing",
            is_correct: true,
            question_id: "q1",
          }),
        ),
      ).rejects.toThrow(ConflictError);
    });

    it("should throw DATABASE_ERROR if create fails", async () => {
      vi.spyOn(choiceRepositoryMock, "create").mockRejectedValue(
        new Error("Fatal"),
      );

      await expect(
        choiceService.createChoice(
          new CreateChoiceRequestDto({
            text: "Error",
            is_correct: true,
            question_id: "q1",
          }),
        ),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("updateChoice", () => {
    it("should invalidate cache on update", async () => {
      const choice = createChoiceMock({
        id: "1",
        text: "Updated",
        question: createQuestionMock({ id: "q1" }),
      });
      vi.spyOn(choiceRepositoryMock, "update").mockResolvedValue(choice);

      await choiceService.updateChoice("1", {
        text: "Updated",
        is_correct: true,
      });

      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("choice:1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("choices:all");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(
        "question:choices:q1",
      );
    });

    it("should throw CHOICE_NOT_FOUND if choice to update exists", async () => {
      // @ts-ignore
      vi.spyOn(choiceRepositoryMock, "update").mockResolvedValue(null);

      await expect(
        choiceService.updateChoice("99", {
          text: "Missing",
          is_correct: false,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw CHOICE_CONFLICT if duplicate text", async () => {
      const error = new Error("Conflict");
      // @ts-ignore
      error.code = "23505";
      vi.spyOn(choiceRepositoryMock, "update").mockRejectedValue(error);

      await expect(
        choiceService.updateChoice("1", { text: "Dup", is_correct: false }),
      ).rejects.toThrow(ConflictError);
    });

    it("should throw DATABASE_ERROR on failure", async () => {
      vi.spyOn(choiceRepositoryMock, "update").mockRejectedValue(
        new Error("Fail"),
      );

      await expect(
        choiceService.updateChoice("1", { text: "Error", is_correct: false }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("deleteChoice", () => {
    it("should invalidate cache on delete", async () => {
      const choice = createChoiceMock({
        id: "1",
        question: createQuestionMock({ id: "q1" }),
      });
      vi.spyOn(choiceRepositoryMock, "findOne").mockResolvedValue(choice);
      vi.spyOn(choiceRepositoryMock, "delete").mockResolvedValue(undefined);

      await choiceService.deleteChoice("1");

      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("choice:1");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith("choices:all");
      expect(valkeyRepositoryMock.del).toHaveBeenCalledWith(
        "question:choices:q1",
      );
    });

    it("should succeed even if cache invalidation fails on delete", async () => {
      const choice = createChoiceMock({ id: "1" });
      vi.spyOn(choiceRepositoryMock, "findOne").mockResolvedValue(choice);
      vi.spyOn(choiceRepositoryMock, "delete").mockResolvedValue(undefined);
      valkeyRepositoryMock.del.mockRejectedValue(new Error("Cache Down"));

      await choiceService.deleteChoice("1");

      expect(choiceRepositoryMock.delete).toHaveBeenCalledWith("1");
    });

    it("should call delete on repository", async () => {
      const choice = createChoiceMock({ id: "1" });
      vi.spyOn(choiceRepositoryMock, "findOne").mockResolvedValue(choice);
      const spy = vi
        .spyOn(choiceRepositoryMock, "delete")
        .mockResolvedValue(undefined);
      await choiceService.deleteChoice("1");
      expect(spy).toHaveBeenCalledWith("1");
    });

    it("should throw DATABASE_ERROR if delete fails", async () => {
      vi.spyOn(choiceRepositoryMock, "delete").mockRejectedValue(
        new Error("Fatal"),
      );

      await expect(choiceService.deleteChoice("1")).rejects.toThrow(
        InternalServerError,
      );
    });
  });
});
