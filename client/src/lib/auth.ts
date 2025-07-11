import { apiRequest } from "./queryClient";

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/login", { email, password });
    return response.json();
  },

  register: async (userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    const response = await apiRequest("POST", "/api/auth/register", userData);
    return response.json();
  },

  getMe: async () => {
    const response = await apiRequest("GET", "/api/auth/me");
    return response.json();
  },
};
