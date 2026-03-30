import { ParticipantRoles } from "./participant-roles.js";

/**
 * @typedef {import('./participant-roles.js').ParticipantRolesType} ParticipantRolesType
 */

export class ParticipantEntity {
  /**
   * @param {Object} params
   * @param {string|null} params.id
   * @param {ParticipantRolesType} params.role
   * @param {string} params.sessionId
   * @param {string} params.nickname
   * @param {string} params.socketId
   */
  constructor({ id, role, sessionId, nickname, socketId }) {
    this.id = id ?? crypto.randomUUID();
    this.role = role;
    this.sessionId = sessionId;
    this.nickname = nickname;
    this.socketId = socketId;
  }
}
