import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type Role = 'ADMIN' | 'CASHIER';

interface User {
  id: string;
  name: string;
  role: Role;
}

interface AuthContextType {
  user: User;
  switchRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>({
    id: 'user-test-id',
    name: 'Demo User',
    role: 'ADMIN' // Default to admin for testing
  });

  const switchRole = (role: Role) => {
    setUser(prev => ({ ...prev, role }));
  };

  return (
    <AuthContext.Provider value={{ user, switchRole }}>
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
