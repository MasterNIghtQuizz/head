export interface SocketContext {
  userId: string;
  userName: string;
  sessionId: string | null;
  role: string | null;
}

export declare const messageType: {
  CREATE_SESSION: "create_session";
  START_SESSION: "start_session";
  JOIN_SESSION: "join_session";
  LEAVE_SESSION: "leave_session";
  CHAT_MESSAGE: "chat_message";
  USER_ONLINE: "user_online";
  USER_OFFLINE: "user_offline";
  SESSION_CREATED: "session_created";
  SESSION_STARTED: "session_started";
  SESSION_OWNER_CHANGED: "session_owner_changed";
  JOINED_SESSION: "joined_session";
  MESSAGE_DELIVERED: "message_delivered";
  MESSAGE_NOT_DELIVERED: "message_not_delivered";
  SESSION_ENDED: "session_ended";
  SESSION_NEXT_QUESTION: "session_next_question";
  SESSION_DELETED: "session_deleted";
  PARTICIPANTS_UPDATE: "participants_update";
  SESSION_RESULTS_DISPLAYED: "session_results_displayed";
  ERROR: "error";
};


export type MessageType = (typeof messageType)[keyof typeof messageType];

export declare const sessionState: {
  NOT_FULL: "not_full";
  FULL: "full";
  STARTED: "started";
};

export type SessionState = (typeof sessionState)[keyof typeof sessionState];

export declare const errorType: {
  INVALID_JSON: "invalid_json";
  INVALID_PAYLOAD: "invalid_payload";
  MISSING_SESSION_ID: "missing_session_id";
  MISSING_RECEIVER_ID: "missing_receiver_id";
  MISSING_OR_INVALID_MAX_USERS: "missing_or_invalid_max_users";
  SESSION_NOT_FOUND: "session_not_found";
  SESSION_FULL: "session_full";
  SESSION_ALREADY_EXISTS: "session_already_exists";
  SESSION_STARTED: "session_started";
  SESSION_ALREADY_STARTED: "session_already_started";
  NOT_SESSION_OWNER: "not_session_owner";
  CREATE_SESSION_FAILED: "create_session_failed";
  START_SESSION_FAILED: "start_session_failed";
  JOIN_SESSION_FAILED: "join_session_failed";
  UNSUPPORTED_MESSAGE_TYPE: "unsupported_message_type";
};

export type ErrorType = (typeof errorType)[keyof typeof errorType];

export interface CreateSessionPayload {
  sessionId: string;
  max_users: number;
}

export interface JoinSessionPayload {
  sessionId: string;
}

export interface StartSessionPayload {
  sessionId: string;
}

export interface ChatMessagePayload {
  receiverId: string;
  senderId?: string;
  content?: string;
  [key: string]: unknown;
}

export interface SessionPresencePayload {
  participant_id: string;
  nickname?: string;
  role?: string | null;
}


export interface SessionCreatedPayload {
  sessionId: string;
  max_users: number;
}

export interface SessionStartedPayload {
  sessionId: string;
  ownerId?: string;
  activated_at?: number | null;
}

export interface SessionNextQuestionPayload {
  sessionId: string;
  question_id: string;
  activated_at?: number | null;
}

export interface SessionOwnerChangedPayload {
  sessionId: string;
  ownerId: string;
}

export interface JoinedSessionPayload {
  sessionId: string;
  participants?: Array<SessionPresencePayload>;
  activated_at?: number | null;
}

export interface ParticipantsUpdatePayload {
  sessionId: string;
  participants: Array<SessionPresencePayload>;
  activated_at?: number | null;
}



export interface SessionIdPayload {
  sessionId: string;
}

export interface SessionResultsDisplayedPayload {
  sessionId: string;
  questionId: string;
}



export interface DeliveryPayload {
  receiverId: string;
}

export interface ErrorPayload {
  reason: ErrorType;
  value?: string;
}

export type ClientToServerMessage =
  | { type: typeof messageType.CREATE_SESSION; payload: CreateSessionPayload }
  | { type: typeof messageType.START_SESSION; payload: StartSessionPayload }
  | { type: typeof messageType.JOIN_SESSION; payload: JoinSessionPayload }
  | { type: typeof messageType.CHAT_MESSAGE; payload: ChatMessagePayload };

export type ServerToClientMessage =
  | { type: typeof messageType.SESSION_CREATED; payload: SessionCreatedPayload }
  | { type: typeof messageType.SESSION_STARTED; payload: SessionStartedPayload }
  | {
    type: typeof messageType.SESSION_OWNER_CHANGED;
    payload: SessionOwnerChangedPayload;
  }
  | { type: typeof messageType.JOINED_SESSION; payload: JoinedSessionPayload }
  | {
    type: typeof messageType.PARTICIPANTS_UPDATE;
    payload: ParticipantsUpdatePayload;
  }
  | { type: typeof messageType.USER_ONLINE; payload: SessionPresencePayload }
  | { type: typeof messageType.USER_OFFLINE; payload: SessionPresencePayload }
  | { type: typeof messageType.CHAT_MESSAGE; payload: ChatMessagePayload }
  | { type: typeof messageType.MESSAGE_DELIVERED; payload: DeliveryPayload }
  | {
    type: typeof messageType.MESSAGE_NOT_DELIVERED;
    payload: DeliveryPayload;
  }
  | { type: typeof messageType.SESSION_ENDED; payload: SessionIdPayload }
  | { type: typeof messageType.SESSION_DELETED; payload: SessionIdPayload }

  | {
    type: typeof messageType.SESSION_NEXT_QUESTION;
    payload: SessionNextQuestionPayload;
  }
  | {
    type: typeof messageType.SESSION_RESULTS_DISPLAYED;
    payload: SessionResultsDisplayedPayload;
  }
  | { type: typeof messageType.ERROR; payload: ErrorPayload };

