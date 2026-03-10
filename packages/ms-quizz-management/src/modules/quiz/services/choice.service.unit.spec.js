import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ChoiceService } from "./choice.service.js";
import { ChoiceRepository } from "../repositories/choice.repository.js";
import { createChoiceMock } from "../../../tests/factories/choice.factory.js";
import { CreateChoiceRequestDto } from "../contracts/choice.dto.js";
import {
  NotFoundError,
  ConflictError,
  InternalServerError,
} from "common-errors";

/**
 * @typedef {import('../models/choice.model.js').Choice} Choice
 * @typedef {import('vitest').Mocked<ChoiceRepository>} ChoiceRepositoryMock
 */

describe("ChoiceService Unit Tests", () => {
  /** @type {ChoiceService} */
  let choiceService;

  /** @type {ChoiceRepositoryMock} */
  let choiceRepositoryMock;

  beforeEach(() => {
    choiceRepositoryMock = /** @type {ChoiceRepositoryMock} */ (
      Object.create(ChoiceRepository.prototype)
    );
    choiceService = new ChoiceService(choiceRepositoryMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAllChoices", () => {
    it("should return all choices", async () => {
      const choices = [createChoiceMock({ id: "1" })];
      const spy = vi
        .spyOn(choiceRepositoryMock, "findAll")
        .mockResolvedValue(choices);

      const result = await choiceService.getAllChoices();

      expect(spy).toHaveBeenCalled();
      expect(result).toHaveLength(1);
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
    it("should return a choice by id", async () => {
      const choice = createChoiceMock({ id: "1" });
      const spy = vi
        .spyOn(choiceRepositoryMock, "findOne")
        .mockResolvedValue(choice);

      const result = await choiceService.getChoiceById("1");

      expect(spy).toHaveBeenCalledWith("1");
      expect(result.id).toBe("1");
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
    it("should return choices for a question", async () => {
      const choices = [createChoiceMock({ id: "1" })];
      const spy = vi
        .spyOn(choiceRepositoryMock, "findByQuestionId")
        .mockResolvedValue(choices);

      const result = await choiceService.getChoicesByQuestionId("q1");

      expect(spy).toHaveBeenCalledWith("q1");
      expect(result).toHaveLength(1);
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
    it("should create and return a choice", async () => {
      const data = { text: "Yes", is_correct: true, question_id: "q1" };
      const created = createChoiceMock({ id: "c1", ...data });
      const spy = vi
        .spyOn(choiceRepositoryMock, "create")
        .mockResolvedValue(created);

      const result = await choiceService.createChoice(
        new CreateChoiceRequestDto(data),
      );

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ text: "Yes" }),
      );
      expect(result.id).toBe("c1");
      expect(result.text).toBe("Yes");
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
    it("should update and return a choice", async () => {
      const choice = createChoiceMock({ id: "1", text: "Updated" });
      const spy = vi
        .spyOn(choiceRepositoryMock, "update")
        .mockResolvedValue(choice);

      const result = await choiceService.updateChoice("1", {
        text: "Updated",
        is_correct: undefined,
      });

      expect(spy).toHaveBeenCalledWith("1", { text: "Updated" });
      expect(result.text).toBe("Updated");
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
    it("should call delete on repository", async () => {
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
