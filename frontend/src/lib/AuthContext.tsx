import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from './api.js';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'CHEF_CAISSE' | 'CASHIER' | 'CAISSIER' | 'DIRECTEUR';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  entrepriseId?: string | null;
  entrepriseName?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('kaissur_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('kaissur_token');
  });

  const login = async (email: string, password: string) => {
    try {
      const data = await api.login({ email, password });
      if (data && data.token && data.user) {
        localStorage.setItem('kaissur_token', data.token);
        localStorage.setItem('kaissur_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      } else {
        throw new Error('Données de connexion invalides.');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('kaissur_token');
    localStorage.removeItem('kaissur_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
