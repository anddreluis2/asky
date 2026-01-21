import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  githubId: z.string(),
  username: z.string(),
  avatar: z.string().optional(),
  accessToken: z.string().optional(),
  createdAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;

export const AuthResponseSchema = z.object({
  user: UserSchema,
  token: z.string(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const GitHubProfileSchema = z.object({
  id: z.string(),
  login: z.string(),
  avatar_url: z.string().optional(),
  access_token: z.string().optional(),
});

export type GitHubProfile = z.infer<typeof GitHubProfileSchema>;
