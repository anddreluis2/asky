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

export const RepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  private: z.boolean(),
  html_url: z.string(),
  owner: z.object({
    login: z.string(),
    avatar_url: z.string().optional(),
  }),
});

export type Repository = z.infer<typeof RepositorySchema>;
