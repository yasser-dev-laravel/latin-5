
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { saveToLocalStorage, getFromLocalStorage } from "@/utils/localStorage";

type Role = "admin" | "employee" | "teacher" | "student";

interface User {
  id: string;
  name: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AUTH_STORAGE_KEY = "latin_academy_user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check if user is already logged in
  useEffect(() => {
    const storedUser = getFromLocalStorage<User | null>(AUTH_STORAGE_KEY, null);
    if (storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
    }
  }, []);

  // Mock login function - in a real app, this would communicate with a backend
  const login = async (username: string, password: string): Promise<boolean> => {
    // Default users for each role
    const defaultUsers = [
      { id: "admin-1", username: "admin", password: "admin123", name: "مدير النظام", role: "admin" as Role },
      { id: "emp-1", username: "employee", password: "employee123", name: "موظف الاستقبال", role: "employee" as Role },
      { id: "teacher-1", username: "teacher", password: "teacher123", name: "أحمد محمود", role: "teacher" as Role },
      { id: "student-1", username: "student", password: "student123", name: "محمد علي", role: "student" as Role },
    ];

    console.log("Attempting login with:", username, password);
    
    const matchedUser = defaultUsers.find(
      (user) => user.username === username && user.password === password
    );

    console.log("Matched user:", matchedUser);

    if (matchedUser) {
      const { id, name, role } = matchedUser;
      const userData = { id, name, role };
      
      setUser(userData);
      setIsAuthenticated(true);
      saveToLocalStorage(AUTH_STORAGE_KEY, userData);
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
