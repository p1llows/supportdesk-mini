import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'requester';
  department_id?: number | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, password_confirmation: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('auth_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Verify stored token on initial load
  const fetchCurrentUser = useCallback(async (authToken: string, isInitialLoad: boolean = true) => {
    if (isInitialLoad) setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.data.user;
        setUser(userData);
        localStorage.setItem('auth_user', JSON.stringify(userData));
      } else {
        // Token invalid or expired
        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    } catch {
      // Network error; clear loading state
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, [token, fetchCurrentUser]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        const authToken = data.data.token;
        const userData = data.data.user;

        setToken(authToken);
        setUser(userData);
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('auth_user', JSON.stringify(userData));

        return { success: true };
      } else {
        return {
          success: false,
          error: data.message || 'Failed to authenticate. Please check your credentials.',
        };
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error. Failed to connect to server.',
      };
    }
  };

  const register = async (name: string, email: string, password: string, password_confirmation: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ name, email, password, password_confirmation }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        const authToken = data.data.token;
        const userData = data.data.user;

        setToken(authToken);
        setUser(userData);
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('auth_user', JSON.stringify(userData));

        return { success: true };
      } else {
        const errorMessage = data.errors ? Object.values(data.errors).flat().join(' ') : (data.message || 'Registration failed.');
        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error. Failed to connect to server.',
      };
    }
  };

  const logout = async (): Promise<void> => {
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });
      } catch {
        // Ignore network errors on logout
      }
    }

    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const checkSession = async (): Promise<void> => {
    if (token) {
      await fetchCurrentUser(token, false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        loading,
        login,
        register,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
