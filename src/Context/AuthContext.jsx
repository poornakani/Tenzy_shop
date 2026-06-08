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
    // Store raw refresh token for silent renewal (comes from userObj.refreshHasToken)
    const rt = userObj?.refreshHasToken;
    if (rt) localStorage.setItem("refreshToken", rt);
    // Keep legacy adminAuth key so AdminGuard still works
    if ([1, 3, 4].includes(Number(userObj?.roleId))) localStorage.setItem("adminAuth", "true");
    setUser(userObj);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    // data = { accessToken, expiresAtUtc, user: { ..., refreshHasToken } }
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
    localStorage.removeItem("refreshToken");
    setUser(null);
  }, []);

  const roleId       = Number(user?.roleId ?? 0);
  const isAdmin      = [1, 3, 4].includes(roleId); // 1=Admin 3=SuperAdmin 4=Manager
  const isSuperAdmin = roleId === 3;                // SuperAdmin only

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAdmin, isSuperAdmin, roleId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
