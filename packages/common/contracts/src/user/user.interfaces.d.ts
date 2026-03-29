export interface RegisterRequest {
  email: string;
  password: string;
}
export interface LoginRequest {
  email: string;
  password: string;
}
export interface GrantPermissionRequest {
  user_id: string;
  role: string;
}

export interface UserResponse {
  id: string;
  email: string;
  role: string;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  role?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}


