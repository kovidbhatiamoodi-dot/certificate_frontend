import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [admin, setAdmin] = useState(null);

  // Decode JWT payload to get admin info
  const decodeToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        department_id: payload.department_id,
        department_name: payload.department_name,
        role: payload.role,
      };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        // Check if token is expired
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp * 1000 < Date.now()) {
          logout();
          return;
        }
        setAdmin(decoded);
      } else {
        logout();
      }
    }
  }, [token]);

  const login = (newToken, adminData) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setAdmin(adminData || decodeToken(newToken));
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ token, admin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;