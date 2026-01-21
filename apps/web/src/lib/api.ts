import axios from "axios";
import { User, UserSchema, Repository, RepositorySchema } from "@asky/shared-types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

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
    } catch (error) {
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
};
