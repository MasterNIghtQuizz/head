export interface CreateChoiceRequest {
  text: string;
  is_correct: boolean;
  question_id: string;
}

export interface UpdateChoiceRequest {
  text?: string;
  is_correct?: boolean;
}

export interface ChoiceResponse {
  id: string;
  text: string;
  is_correct: boolean;
}
