import { describe, it, expect } from "vitest";
import { ParticipantMapper } from "./participant.mapper.js";
import {
  createParticipantEntity,
  createParticipantModel,
} from "../../services/test-helpers.js";
import { ParticipantEntity } from "../../core/entities/participant.entity.js";

describe("ParticipantMapper unit tests", () => {
  describe("toEntity", () => {
    it("should transform DB model to domain entity", () => {
      const model = createParticipantModel();
      const entity = ParticipantMapper.toEntity(model);

      expect(entity).toBeInstanceOf(ParticipantEntity);
      expect(entity.id).toBe(model.id);
      expect(entity.nickname).toBe(model.nickname);
      expect(entity.sessionId).toBe(model.session_id);
    });
  });

  describe("toModel", () => {
    it("should transform domain entity to DB model", () => {
      const entity = createParticipantEntity();
      const model = ParticipantMapper.toModel(entity);

      expect(model.id).toBe(entity.id);
      expect(model.nickname).toBe(entity.nickname);
      expect(model.session_id).toBe(entity.sessionId);
    });
  });
});
