import { randomBytes } from "node:crypto";
import { SessionStatus } from "./session-status.js";

export const generateSessionKey = () => randomBytes(6).toString("base64url");

export class SessionEntity {
  /**
   * @param {Object} params
   * @param {string|null} params.id
   * @param {string|null} params.publicKey
   * @param {SessionStatus|null} params.status
   * @param {string|null} params.currentQuestionId
   * @param {string|null} params.quizzId
   * @param {string|null} params.hostId
   */
  constructor({ id, publicKey, status, currentQuestionId, quizzId, hostId }) {
    this.id = id ?? crypto.randomUUID();
    this.publicKey = publicKey ?? generateSessionKey();
    this.status = status;
    this.currentQuestionId = currentQuestionId;
    this.quizzId = quizzId;
    this.hostId = hostId;
  }
}
