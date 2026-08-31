import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

export const saveRefreshToken = async (token: string) => {
  if (isWeb) {
    window.localStorage.setItem("refreshToken", token);
    return;
  }
  await SecureStore.setItemAsync("refreshToken", token);
};

export const getRefreshToken = async () => {
  if (isWeb) {
    return window.localStorage.getItem("refreshToken");
  }
  return await SecureStore.getItemAsync("refreshToken");
};

export const clearRefreshToken = async () => {
  if (isWeb) {
    window.localStorage.removeItem("refreshToken");
    return;
  }
  await SecureStore.deleteItemAsync("refreshToken");
};
