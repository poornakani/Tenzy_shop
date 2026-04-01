import { createContext, useContext, useState, useCallback } from "react";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("authUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const saveSession = useCallback((accessToken, userObj) => {
    localStorage.setItem("authToken", accessToken);
    localStorage.setItem("authUser", JSON.stringify(userObj));
    // Keep legacy adminAuth key so AdminGuard still works
    if (userObj?.roleId === 1) localStorage.setItem("adminAuth", "true");
    setUser(userObj);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    // data = { accessToken, expiresAtUtc, user }
    saveSession(data.accessToken, data.user);
    return data.user;
  }, [saveSession]);

  const register = useCallback(async (email, password, displayName) => {
    const data = await authApi.register(email, password, displayName);
    saveSession(data.accessToken, data.user);
    return data.user;
  }, [saveSession]);

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    localStorage.removeItem("adminAuth");
    setUser(null);
  }, []);

  const isAdmin = user?.roleId === 1;

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
