export interface CreateQuestionRequest {
  label: string;
  type: string;
  order_index: number;
  timer_seconds: number;
  quiz_id: string;
}

export interface UpdateQuestionRequest {
  label?: string;
  type?: string;
  order_index?: number;
  timer_seconds?: number;
}

export interface QuestionResponse {
  id: string;
  label: string;
  type: string;
  order_index: number;
  timer_seconds: number;
}
