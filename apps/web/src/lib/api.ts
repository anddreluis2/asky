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

  chatStream: async (
    fullName: string,
    question: string,
    conversationHistory: ChatMessage[] = [],
    handlers?: {
      onToken?: (token: string) => void;
      onDone?: (response: ChatResponse) => void;
      onError?: (message: string) => void;
    },
  ): Promise<ChatResponse> => {
    const res = await fetch(`${API_URL}/repos/${fullName}/chat/stream`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question, conversationHistory }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Stream request failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    let finalAnswer = "";
    let finalPayload: ChatResponse | null = null;

    const emitToken = (t: string) => {
      finalAnswer += t;
      handlers?.onToken?.(t);
    };

    const parseEventBlock = (block: string) => {
      // Expect SSE blocks like:
      // event: token
      // data: {"token":"..."}
      const lines = block.split("\n").map((l) => l.trimEnd());
      const eventLine = lines.find((l) => l.startsWith("event:"));
      const dataLine = lines.find((l) => l.startsWith("data:"));
      if (!eventLine || !dataLine) return;
      const event = eventLine.slice("event:".length).trim();
      const dataRaw = dataLine.slice("data:".length).trim();

      try {
        const data: unknown = JSON.parse(dataRaw);
        if (
          event === "token" &&
          data &&
          typeof data === "object" &&
          "token" in data &&
          typeof (data as { token: unknown }).token === "string"
        ) {
          emitToken((data as { token: string }).token);
        }
        if (event === "done") {
          finalPayload = data as ChatResponse;
        }
        if (event === "error") {
          const msg =
            data &&
            typeof data === "object" &&
            "message" in data &&
            typeof (data as { message: unknown }).message === "string"
              ? (data as { message: string }).message
              : "Stream error";
          handlers?.onError?.(msg);
        }
      } catch {
        // ignore parse errors
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Split by SSE separator
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);
        if (!block || block.startsWith(":")) continue; // comments/keepalive
        parseEventBlock(block);
      }
    }

    const response: ChatResponse =
      finalPayload ??
      ({
        answer: finalAnswer,
        sources: [],
      } as ChatResponse);

    const parsed = ChatResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new Error("Invalid chat response data");
    }
    handlers?.onDone?.(parsed.data);
    return parsed.data;
  },
};
