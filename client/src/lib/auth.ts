import { apiRequest } from "./queryClient";

export const login = async (email: string, password: string) => {
  const response = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return response.json();
};

export const register = async (userData: any) => {
  const response = await apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
  return response.json();
};

export const getStoredToken = (): string | null => {
  return localStorage.getItem("authToken");
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem("authToken", token);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem("authToken");
};

export const logout = (): void => {
  removeStoredToken();
  localStorage.clear();
  window.location.href = "/login";
};
