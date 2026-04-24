export const messageType = {
  CREATE_SESSION: "create_session",
  START_SESSION: "start_session",
  JOIN_SESSION: "join_session",
  LEAVE_SESSION: "leave_session",
  CHAT_MESSAGE: "chat_message",
  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",
  SESSION_CREATED: "session_created",
  SESSION_STARTED: "session_started",
  SESSION_OWNER_CHANGED: "session_owner_changed",
  JOINED_SESSION: "joined_session",
  MESSAGE_DELIVERED: "message_delivered",
  MESSAGE_NOT_DELIVERED: "message_not_delivered",
  SESSION_ENDED: "session_ended",
  SESSION_DELETED: "session_deleted",
  SESSION_NEXT_QUESTION: "session_next_question",
  ERROR: "error",
};

export const sessionState = {
  NOT_FULL: "not_full",
  FULL: "full",
  STARTED: "started",
};

export const errorType = {
  INVALID_JSON: "invalid_json",
  INVALID_PAYLOAD: "invalid_payload",
  MISSING_SESSION_ID: "missing_session_id",
  MISSING_RECEIVER_ID: "missing_receiver_id",
  MISSING_OR_INVALID_MAX_USERS: "missing_or_invalid_max_users",
  SESSION_NOT_FOUND: "session_not_found",
  SESSION_FULL: "session_full",
  SESSION_ALREADY_EXISTS: "session_already_exists",
  SESSION_STARTED: "session_started",
  SESSION_ALREADY_STARTED: "session_already_started",
  NOT_SESSION_OWNER: "not_session_owner",
  CREATE_SESSION_FAILED: "create_session_failed",
  START_SESSION_FAILED: "start_session_failed",
  JOIN_SESSION_FAILED: "join_session_failed",
  UNSUPPORTED_MESSAGE_TYPE: "unsupported_message_type",
};
