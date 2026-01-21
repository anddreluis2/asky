import axios from "axios";
import {
  User,
  UserSchema,
  Repository,
  RepositorySchema,
  IndexStatus,
  IndexStatusSchema,
  IndexResult,
  IndexResultSchema,
  ChatResponse,
  ChatResponseSchema,
  ChatMessage,
} from "@asky/shared-types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Interceptor para tratar erros 401 (não autenticado)
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "status" in error.response &&
      error.response.status === 401
    ) {
      // Se receber 401, limpar dados de autenticação e redirecionar para login
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  getProfile: async (): Promise<User | null> => {
    try {
      const response = await api.get("/auth/me");
      if (!response.data) {
        return null;
      }

      const parsed = UserSchema.safeParse(response.data);
      if (!parsed.success) {
        return null;
      }

      return parsed.data;
    } catch {
      return null;
    }
  },

  logout: async (): Promise<void> => {
    await api.get("/auth/logout");
  },

  githubLogin: () => {
    window.location.href = `${API_URL}/auth/github`;
  },
};

export const reposApi = {
  getRepositories: async (): Promise<Repository[]> => {
    const response = await api.get("/repos");
    const data = response.data;

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((repo: unknown) => {
      const parsed = RepositorySchema.safeParse(repo);
      if (!parsed.success) {
        throw new Error("Invalid repository data");
      }
      return parsed.data;
    });
  },

  getIndexStatus: async (fullName: string): Promise<IndexStatus> => {
    const response = await api.get(`/repos/${fullName}/index/status`);
    const parsed = IndexStatusSchema.safeParse(response.data);
    if (!parsed.success) {
      throw new Error("Invalid index status data");
    }
    return parsed.data;
  },

  indexRepository: async (fullName: string): Promise<IndexResult> => {
    const response = await api.post(`/repos/${fullName}/index`);
    const parsed = IndexResultSchema.safeParse(response.data);
    if (!parsed.success) {
      throw new Error("Invalid index result data");
    }
    return parsed.data;
  },

  chat: async (
    fullName: string,
    question: string,
    conversationHistory: ChatMessage[] = [],
  ): Promise<ChatResponse> => {
    const response = await api.post(`/repos/${fullName}/chat`, {
      question,
      conversationHistory,
    });
    const parsed = ChatResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      throw new Error("Invalid chat response data");
    }
    return parsed.data;
  },
};
