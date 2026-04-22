export interface CreateResponseRequest {
  participantId: string;
  questionId: string;
  sessionId: string;
  choiceId?: string | null;
  isCorrect?: boolean | null;
  latencyMs: number | null;
  submittedAt?: Date;
}

export interface AnswerEvent {
  participantId: string;
  sessionId: string;
  questionId?: string | null;
  choiceId?: string | null;
  isCorrect?: boolean | null;
  latencyMs: number;
}

export interface Response {
  id: string;
  participantId: string;
  questionId: string;
  sessionId: string;
  choiceId: string | null;
  isCorrect: boolean | null;
  submittedAt: Date;
}

export type CreateResponse = Omit<Response, "id">;

export interface ResponseProps {
  id?: string;
  participantId: string;
  questionId: string;
  sessionId: string;
  choiceId: string | null;
  isCorrect: boolean | null;
  submittedAt: Date;
}
