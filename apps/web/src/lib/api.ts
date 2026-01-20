import axios from "axios";
import { User } from "@asky/shared-types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  getProfile: async (): Promise<User | null> => {
    try {
      const response = await api.get("/auth/me");
      return response.data;
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
