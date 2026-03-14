export interface CreateQuizRequest {
  title: string;
  description?: string;
}

export interface UpdateQuizRequest {
  title?: string;
  description?: string;
}

export interface QuizResponse {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
