export interface SocketContext {
  userId: string;
  userName: string;
  roomId: string | null;
}

export declare const messageType: {
  CREATE_ROOM: "create_room";
  START_ROOM: "start_room";
  JOIN_ROOM: "join_room";
  LEAVE_ROOM: "leave_room";
  CHAT_MESSAGE: "chat_message";
  USER_ONLINE: "user_online";
  USER_OFFLINE: "user_offline";
  ROOM_CREATED: "room_created";
  ROOM_STARTED: "room_started";
  ROOM_OWNER_CHANGED: "room_owner_changed";
  JOINED_ROOM: "joined_room";
  MESSAGE_DELIVERED: "message_delivered";
  MESSAGE_NOT_DELIVERED: "message_not_delivered";
  ERROR: "error";
};

export type MessageType = (typeof messageType)[keyof typeof messageType];

export declare const roomState: {
  NOT_FULL: "not_full";
  FULL: "full";
  STARTED: "started";
};

export type RoomState = (typeof roomState)[keyof typeof roomState];

export declare const errorType: {
  INVALID_JSON: "invalid_json";
  INVALID_PAYLOAD: "invalid_payload";
  MISSING_ROOM_ID: "missing_room_id";
  MISSING_RECEIVER_ID: "missing_receiver_id";
  MISSING_OR_INVALID_MAX_USERS: "missing_or_invalid_max_users";
  ROOM_NOT_FOUND: "room_not_found";
  ROOM_FULL: "room_full";
  ROOM_ALREADY_EXISTS: "room_already_exists";
  ROOM_STARTED: "room_started";
  ROOM_ALREADY_STARTED: "room_already_started";
  NOT_ROOM_OWNER: "not_room_owner";
  CREATE_ROOM_FAILED: "create_room_failed";
  START_ROOM_FAILED: "start_room_failed";
  JOIN_ROOM_FAILED: "join_room_failed";
  UNSUPPORTED_MESSAGE_TYPE: "unsupported_message_type";
};

export type ErrorType = (typeof errorType)[keyof typeof errorType];

export interface CreateRoomPayload {
  roomId: string;
  max_users: number;
}

export interface JoinRoomPayload {
  roomId: string;
}

export interface StartRoomPayload {
  roomId: string;
}

export interface ChatMessagePayload {
  receiverId: string;
  senderId?: string;
  content?: string;
  [key: string]: unknown;
}

export interface RoomPresencePayload {
  userId: string;
  userName: string;
}

export interface RoomCreatedPayload {
  roomId: string;
  max_users: number;
}

export interface RoomStartedPayload {
  roomId: string;
  ownerId: string;
}

export interface RoomOwnerChangedPayload {
  roomId: string;
  ownerId: string;
}

export interface JoinedRoomPayload {
  roomId: string;
}

export interface DeliveryPayload {
  receiverId: string;
}

export interface ErrorPayload {
  reason: ErrorType;
  value?: string;
}

export type ClientToServerMessage =
  | { type: typeof messageType.CREATE_ROOM; payload: CreateRoomPayload }
  | { type: typeof messageType.START_ROOM; payload: StartRoomPayload }
  | { type: typeof messageType.JOIN_ROOM; payload: JoinRoomPayload }
  | { type: typeof messageType.CHAT_MESSAGE; payload: ChatMessagePayload };

export type ServerToClientMessage =
  | { type: typeof messageType.ROOM_CREATED; payload: RoomCreatedPayload }
  | { type: typeof messageType.ROOM_STARTED; payload: RoomStartedPayload }
  | {
      type: typeof messageType.ROOM_OWNER_CHANGED;
      payload: RoomOwnerChangedPayload;
    }
  | { type: typeof messageType.JOINED_ROOM; payload: JoinedRoomPayload }
  | { type: typeof messageType.USER_ONLINE; payload: RoomPresencePayload }
  | { type: typeof messageType.USER_OFFLINE; payload: RoomPresencePayload }
  | { type: typeof messageType.CHAT_MESSAGE; payload: ChatMessagePayload }
  | { type: typeof messageType.MESSAGE_DELIVERED; payload: DeliveryPayload }
  | {
      type: typeof messageType.MESSAGE_NOT_DELIVERED;
      payload: DeliveryPayload;
    }
  | { type: typeof messageType.ERROR; payload: ErrorPayload };
