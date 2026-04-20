import { describe, it, expect } from "vitest";
import { SessionMapper } from "./session.mapper.js";
import {
  createSessionEntity,
  createSessionModel,
} from "../../services/test-helpers.js";
import { SessionEntity } from "../../core/entities/session.entity.js";

describe("SessionMapper unit tests", () => {
  describe("toEntity", () => {
    it("should transform DB model to domain entity", () => {
      const model = createSessionModel();
      const entity = SessionMapper.toEntity(model);

      expect(entity).toBeInstanceOf(SessionEntity);
      expect(entity.id).toBe(model.id);
      expect(entity.publicKey).toBe(model.public_key);
      expect(entity.status).toBe(model.status);
    });
  });

  describe("toModel", () => {
    it("should transform domain entity to DB model", () => {
      const entity = createSessionEntity();
      const model = SessionMapper.toModel(entity);

      expect(model.id).toBe(entity.id);
      expect(model.public_key).toBe(entity.publicKey);
      expect(model.status).toBe(entity.status);
    });
  });
});
