
import {
  createContext,
  useContext,
  useState
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", {
      email,
      password,
    });

    sessionStorage.setItem("token", data.token);
    sessionStorage.setItem("user", JSON.stringify(data.user));

    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", {
      name,
      email,
      password,
    });

    sessionStorage.setItem("token", data.token);
    sessionStorage.setItem("user", JSON.stringify(data.user));

    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
