import { useEffect, useState } from "react";
import { BACKEND } from "./api";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("mc_token") || "");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    token ? me() : setReady(true);
  }, []);

  async function me() {
    try {
      const r = await fetch(BACKEND + "/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setUser(await r.json());
      else logout();
    } catch {
      logout();
    }
    setReady(true);
  }

  const login = (t, u) => {
    setToken(t);
    setUser(u);
    localStorage.setItem("mc_token", t);
  };

  const logout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("mc_token");
  };

  return { user, token, ready, login, logout };
}
