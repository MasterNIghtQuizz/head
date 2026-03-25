export const messageType = {
  CREATE_ROOM: "create_room",
  START_ROOM: "start_room",
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",
  CHAT_MESSAGE: "chat_message",
  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",
  ROOM_CREATED: "room_created",
  ROOM_STARTED: "room_started",
  ROOM_OWNER_CHANGED: "room_owner_changed",
  JOINED_ROOM: "joined_room",
  MESSAGE_DELIVERED: "message_delivered",
  MESSAGE_NOT_DELIVERED: "message_not_delivered",
  ERROR: "error",
};

export const roomState = {
  NOT_FULL: "not_full",
  FULL: "full",
  STARTED: "started",
};

export const errorType = {
  INVALID_JSON: "invalid_json",
  INVALID_PAYLOAD: "invalid_payload",
  MISSING_ROOM_ID: "missing_room_id",
  MISSING_RECEIVER_ID: "missing_receiver_id",
  MISSING_OR_INVALID_MAX_USERS: "missing_or_invalid_max_users",
  ROOM_NOT_FOUND: "room_not_found",
  ROOM_FULL: "room_full",
  ROOM_ALREADY_EXISTS: "room_already_exists",
  ROOM_STARTED: "room_started",
  ROOM_ALREADY_STARTED: "room_already_started",
  NOT_ROOM_OWNER: "not_room_owner",
  CREATE_ROOM_FAILED: "create_room_failed",
  START_ROOM_FAILED: "start_room_failed",
  JOIN_ROOM_FAILED: "join_room_failed",
  UNSUPPORTED_MESSAGE_TYPE: "unsupported_message_type",
};
