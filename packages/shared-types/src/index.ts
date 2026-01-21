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

// Index types
export const IndexStatusSchema = z.object({
  indexed: z.boolean(),
  lastIndexedAt: z.coerce.date().optional(),
  chunksCount: z.number().optional(),
});

export type IndexStatus = z.infer<typeof IndexStatusSchema>;

export const IndexResultSchema = z.object({
  success: z.boolean(),
  filesIndexed: z.number(),
  chunksCreated: z.number(),
});

export type IndexResult = z.infer<typeof IndexResultSchema>;

// Chat types
export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const CodeSourceSchema = z.object({
  filePath: z.string(),
  content: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  similarity: z.number(),
});

export type CodeSource = z.infer<typeof CodeSourceSchema>;

export const ChatResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(CodeSourceSchema),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const ChatRequestSchema = z.object({
  question: z.string(),
  conversationHistory: z.array(ChatMessageSchema).optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// JWT Payload types
export const JwtPayloadSchema = z.object({
  sub: z.string(), // userId
  githubId: z.string(),
  username: z.string(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

// Express User type (from Passport)
export interface ExpressUser {
  userId: string;
  githubId: string;
  username: string;
}

// GitHub API Repository response (raw from API)
export const GitHubRepositoryResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  private: z.boolean(),
  html_url: z.string(),
  owner: z.object({
    login: z.string(),
    avatar_url: z.string().nullable().optional(),
  }),
});

export type GitHubRepositoryResponse = z.infer<typeof GitHubRepositoryResponseSchema>;
