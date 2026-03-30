import { ParticipantRoles } from "packages/ms-session/src/modules/session/core/entities/participant-roles.js";
import { SessionStatus } from "packages/ms-session/src/modules/session/core/entities/session-status.js";

export interface CreateSessionRequest {
  host_id: string;
  quiz_id: string;
}

export interface CreateSessionResponse {
  session_id: string;
  public_key: string;
}

export interface JoinSessionRequest {
  session_public_key: string;
  participant_nickname: string;
  participant_id: string;
}

export interface JoinSessionResponse {
  participant_id: string;
}

export interface LeaveSessionRequest {
  session_public_key: string;
  participant_id: string;
}

export interface GetSessionRequest {
  session_public_key: string;
}

export interface GetSessionResponse {
  session_id: string;
  public_key: string;
  status: SessionStatus | null;
  current_question_id: string | null;
  quizz_id: string | null;
  host_id: string | null;
  participants: Participant[];
}

export interface StartSessionRequest {
  session_id: string;
}

export interface NextQuestionRequest {
  session_id: string;
}

export interface EndSessionRequest {
  session_id: string;
}

export interface Participant {
  participant_id: string;
  nickname: string;
  role: ParticipantRoles;
}
