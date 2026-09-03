import { createContext, useContext, useState, useEffect } from "react";
import { setAccessToken } from "./api";
import { saveRefreshToken, clearRefreshToken, getRefreshToken } from "./auth-storage";

interface User {
  id: string;
  username: string;
  avatarUrl: string;
  bio: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkExistingSession = async () => {
      const refreshToken = await getRefreshToken();
      setIsLoading(false);
    };
    checkExistingSession();
  }, []);

  const login = async (accessToken: string, refreshToken: string, user: User) => {
    setAccessToken(accessToken);
    await saveRefreshToken(refreshToken);
    setUser(user);
  };

  const logout = async () => {
    await clearRefreshToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};