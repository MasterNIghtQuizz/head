export type SessionStatusType =
  | "CREATED"
  | "LOBBY"
  | "QUESTION_ACTIVE"
  | "QUESTION_CLOSED"
  | "FINISHED";

export declare const SessionStatus: {
  CREATED: "CREATED";
  LOBBY: "LOBBY";
  QUESTION_ACTIVE: "QUESTION_ACTIVE";
  QUESTION_CLOSED: "QUESTION_CLOSED";
  FINISHED: "FINISHED";
};

export type ParticipantRolesType = "moderator" | "user" | "HOST" | "PLAYER";
export declare const ParticipantRoles: {
  MODERATOR: "moderator";
  USER: "user";
  HOST: "HOST";
  PLAYER: "PLAYER";
};

export interface CreateSessionRequest {
  quiz_id: string;
}

export interface CreateSessionResponse {
  session_id: string;
  public_key: string;
  game_token: string;
}

export interface JoinSessionRequest {
  session_public_key: string;
  participant_nickname: string;
}

export interface JoinSessionResponse {
  participant_id: string;
  game_token: string;
}

export interface LeaveSessionRequest {}

export interface GetSessionRequest {}


export interface GetSessionResponse {
  session_id: string;
  public_key: string;
  status: SessionStatusType | null;
  current_question_id: string | null;
  quizz_id: string | null;
  host_id: string | null;
  participants: Participant[];
  activated_at?: number | null;
  has_answered?: boolean;
}

export interface GetCurrentQuestionResponse {
  question_id: string;
  label: string;
  type: string;
  timer_seconds: number;
  choices: {
    id: string;
    text: string;
  }[];
  current_buzzer: {
    id: string;
    username: string;
    pressed_at: number;
  } | null;
}


export interface StartSessionRequest {}

export interface NextQuestionRequest {}

export interface EndSessionRequest {}

export interface Participant {
  participant_id: string;
  nickname: string;
  role: ParticipantRolesType;
}
