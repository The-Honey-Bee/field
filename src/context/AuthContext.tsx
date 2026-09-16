import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isFieldStaff: boolean;
  isSupervisor: boolean;
  isManager: boolean;
  login: (email: string, role?: UserRole) => void;
  signUp: (name: string, email: string, phone: string, role: UserRole) => void;
  quickLogin: (role: UserRole) => void;
  setRole: (role: UserRole) => void;
  updateProfile: (updated: Partial<UserProfile>) => void;
  logout: () => void;
}

const DEMO_USERS: Record<UserRole, UserProfile> = {
  field_staff: {
    id: 'user-field-1',
    name: 'Ali Hassan',
    email: 'ali.hassan@zamzam.com',
    phone: '+255 712 998 877',
    role: 'field_staff',
    employeeId: 'ZZ-2024-001',
  },
  supervisor: {
    id: 'user-sup-1',
    name: 'Tariq Al-Mansoor',
    email: 'tariq.mansoor@zamzam.com',
    phone: '+255 784 112 334',
    role: 'supervisor',
    employeeId: 'ZZ-2024-050',
  },
  manager: {
    id: 'user-mgr-1',
    name: 'Khadija Mwinyi',
    email: 'khadija.mwinyi@zamzam.com',
    phone: '+255 754 445 566',
    role: 'manager',
    employeeId: 'ZZ-2024-100',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('zamzam_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEMO_USERS.field_staff;
      }
    }
    return DEMO_USERS.field_staff;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('zamzam_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('zamzam_current_user');
    }
  }, [user]);

  const role: UserRole = user?.role || 'field_staff';

  const login = (email: string, specifiedRole?: UserRole) => {
    const selectedRole = specifiedRole || 'field_staff';
    const demo = DEMO_USERS[selectedRole];
    setUser({
      ...demo,
      email: email || demo.email,
    });
  };

  const quickLogin = (selectedRole: UserRole) => {
    setUser(DEMO_USERS[selectedRole]);
  };

  const signUp = (name: string, email: string, phone: string, selectedRole: UserRole) => {
    const newUser: UserProfile = {
      id: 'user-' + Date.now(),
      name,
      email,
      phone,
      role: selectedRole,
      employeeId: 'ZZ-' + Math.floor(1000 + Math.random() * 9000),
    };
    setUser(newUser);
  };

  const setRole = (newRole: UserRole) => {
    if (user) {
      setUser({ ...user, role: newRole });
    } else {
      setUser(DEMO_USERS[newRole]);
    }
  };

  const updateProfile = (updated: Partial<UserProfile>) => {
    if (user) {
      setUser({ ...user, ...updated });
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isFieldStaff: role === 'field_staff',
        isSupervisor: role === 'supervisor' || role === 'manager',
        isManager: role === 'manager',
        login,
        signUp,
        quickLogin,
        setRole,
        updateProfile,
        logout,
      }}
    >
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
