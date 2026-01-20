export interface User {
  id: string;
  githubId: string;
  username: string;
  avatar?: string;
  accessToken?: string;
  createdAt: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface GitHubProfile {
  id: string;
  login: string;
  avatar_url?: string;
  access_token?: string;
}
