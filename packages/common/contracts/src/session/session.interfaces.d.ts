export interface CreateSessionRequest {
  host_id: string;
  quiz_id: string;
}

export interface CreateSessionResponse {
  session_id: string;
  public_key: string;
}
