import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { TOKEN_KEY, USER_KEY } from "../api/client";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [booting, setBooting] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const persist = useCallback((token, nextUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // Re-validate a stored token on load
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      })
      .catch(() => logout())
      .finally(() => setBooting(false));
  }, [logout]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post("/auth/login", { email, password });
      persist(data.token, data.user);
      return data.user;
    },
    [persist]
  );

  const signup = useCallback(
    async (payload) => {
      const { data } = await api.post("/auth/signup", payload);
      persist(data.token, data.user);
      return data.user;
    },
    [persist]
  );

  const value = useMemo(
    () => ({ user, booting, login, signup, logout }),
    [user, booting, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
