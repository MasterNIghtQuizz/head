import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ParticipantRoles } from "common-contracts";
import { messageType } from "common-websocket";

// Mock connection-store
vi.mock("../../lib/connection-store.js", () => ({
  getSessionSockets: vi.fn(),
  getSocketContext: vi.fn(),
  setSocketSession: vi.fn(),
  addParticipant: vi.fn(),
  removeParticipant: vi.fn(),
  getParticipants: vi.fn(),
  clearPendingDeparture: vi.fn(),
  registerPendingDeparture: vi.fn(),
  deleteParticipants: vi.fn(),
}));

// Mock messaging
vi.mock("../../lib/messaging.js", () => ({
  broadcastToSession: vi.fn(),
}));

// Mock timers
vi.mock("../../lib/session-timer-store.js", () => ({
  getSessionActivatedAt: vi.fn(),
  deleteSessionTimer: vi.fn(),
}));

// Mock capacity store
vi.mock("../../lib/session-capacity-store.js", () => ({
  deleteSessionCapacity: vi.fn(),
  getSessionCapacity: vi.fn(),
  getSessionOwnerId: vi.fn(),
  getSessionState: vi.fn(),
  setSessionCapacity: vi.fn(),
  setSessionOwnerId: vi.fn(),
  setSessionStarted: vi.fn(),
}));

import { handleSessionDeparture } from "../../handlers/session-membership.handler.js";
import {
  getSessionSockets,
  getSocketContext,
  deleteParticipants,
} from "../../lib/connection-store.js";
import { broadcastToSession } from "../../lib/messaging.js";
import { deleteSessionTimer } from "../../lib/session-timer-store.js";
import {
  getSessionOwnerId,
  deleteSessionCapacity,
} from "../../lib/session-capacity-store.js";

/**
 * @param {unknown} ws
 * @returns {import("ws").WebSocket}
 */
function asWebSocket(ws) {
  return /** @type {import("ws").WebSocket} */ (ws);
}

describe("Host Departure Logic", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should kick everyone and delete session data when the owner leaves", () => {
    const sessionId = "session-123";
    const ownerId = "owner-456";
    const otherUserId = "player-789";

    const mockSocket = { close: vi.fn() };

    // Setup mocks
    vi.mocked(getSessionOwnerId).mockReturnValue(ownerId);
    vi.mocked(getSessionSockets).mockReturnValue(new Set([mockSocket]));
    
    // Trigger host departure
    handleSessionDeparture(sessionId, ownerId);

    // Fast-forward 2 seconds (the grace period)
    vi.advanceTimersByTime(2000);

    // 1. Check if SESSION_DELETED was broadcast
    expect(broadcastToSession).toHaveBeenCalledWith(
      sessionId,
      expect.objectContaining({
        type: messageType.SESSION_DELETED,
        payload: { sessionId }
      }),
      null
    );

    // 2. Check if remaining sockets were closed
    expect(mockSocket.close).toHaveBeenCalledWith(4001, "owner_left");

    // 3. Check if all session data was purged
    expect(deleteParticipants).toHaveBeenCalledWith(sessionId);
    expect(deleteSessionCapacity).toHaveBeenCalledWith(sessionId);
    expect(deleteSessionTimer).toHaveBeenCalledWith(sessionId);
  });

  it("should NOT kick everyone if a regular player leaves", () => {
    const sessionId = "session-123";
    const ownerId = "owner-456";
    const playerId = "player-789";

    // Setup mocks
    vi.mocked(getSessionOwnerId).mockReturnValue(ownerId);
    vi.mocked(getSessionSockets).mockReturnValue(new Set([asWebSocket({})]));
    
    // Trigger player departure
    handleSessionDeparture(sessionId, playerId);

    // Fast-forward
    vi.advanceTimersByTime(2000);

    // Should NOT broadcast SESSION_DELETED
    expect(broadcastToSession).not.toHaveBeenCalledWith(
      sessionId,
      expect.objectContaining({ type: messageType.SESSION_DELETED }),
      expect.anything()
    );

    // Should broadcast USER_OFFLINE as usual
    expect(broadcastToSession).toHaveBeenCalledWith(
      sessionId,
      expect.objectContaining({
        type: messageType.USER_OFFLINE,
        payload: { participant_id: playerId }
      }),
      null
    );
  });
});
