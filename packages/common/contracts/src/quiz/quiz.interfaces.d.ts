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

export interface QuizAnswersResponse {
  answers: {
    questionId: string;
    choiceId: string;
  }[];
}

export interface GetQuizRequest {
  quizId: string;
}

export interface FullQuizResponse {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  questions: {
    id: string;
    label: string;
    type: string;
    order_index: number;
    timer_seconds: number;
    choices: {
      id: string;
      text: string;
      is_correct: boolean;
    }[];
  }[];
}

export interface QuizIdsResponse {
  quizId: string;
  questions: {
    id: string;
    choices: {
      id: string;
    }[];
  }[];
}

export type Quizz = FullQuizResponse;
export type Quiz = FullQuizResponse;

