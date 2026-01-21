import axios from "axios";
import { User, UserSchema } from "@asky/shared-types";

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
