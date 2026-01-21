import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

export const useAuth = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  const { data, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.getProfile,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data !== undefined) {
      setUser(data);
    }
  }, [data, setUser]);

  const { mutateAsync: logoutAsync } = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearUser();
      queryClient.setQueryData(["auth", "me"], null);
    },
  });

  const login = useCallback(() => {
    authApi.githubLogin();
  }, []);

  const logout = useCallback(async () => {
    await logoutAsync();
  }, [logoutAsync]);

  return {
    user,
    loading: isLoading,
    login,
    logout,
  };
};
