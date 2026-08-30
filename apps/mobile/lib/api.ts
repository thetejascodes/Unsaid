import {
  saveRefreshToken,
  clearRefreshToken,
  getRefreshToken,
} from "./auth-storage";

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL || "http://localhost:8000";
let currentAccessToken: string = "";

export const setAccessToken = (token: string) => {
  return (currentAccessToken = token);
};

export const getAccessToken = () => currentAccessToken;

export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(BASE_URL + path, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${currentAccessToken}`,
    },
  });

  if (response.status === 401) {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      await clearRefreshToken();
      throw new Error("needs login");
    }
    try {
      const refreshResponse = await fetch(BASE_URL + "/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!refreshResponse.ok) {
        throw new Error("you need to login");
      }
      const { data } = await refreshResponse.json();
      currentAccessToken = data.accessToken;
      await saveRefreshToken(data.refreshToken);
      return apiFetch(path, options);
    } catch (error) {
      await clearRefreshToken();
      throw new Error("needs login");
    }
  }

  return response;
};