import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [role, setRole] = useState(localStorage.getItem('user_role') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user_data')) || null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('user_role'));

  const login = (selectedRole, email) => {
    const userData = {
      email,
      name: email.split('@')[0].toUpperCase(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
    };
    
    localStorage.setItem('user_role', selectedRole);
    localStorage.setItem('user_data', JSON.stringify(userData));
    setRole(selectedRole);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const loginWithOAuth = (selectedRole, googleUser) => {
    const userData = {
      ...googleUser,
      role: selectedRole,
    };

    localStorage.removeItem('user_role');
    localStorage.removeItem('user_data');
    localStorage.setItem('user_role', selectedRole);
    localStorage.setItem('user_data', JSON.stringify(userData));
    setRole(selectedRole);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_data');
    setRole(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const permissions = {
    canManageModels: role?.toLowerCase() === 'admin',
    canReviewTransactions: role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'risk analyst',
    canViewAuditLogs: role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'auditor',
    canChangeThresholds: role?.toLowerCase() === 'admin'
  };

  return (
    <AuthContext.Provider value={{ role, user, isAuthenticated, login, loginWithOAuth, logout, permissions }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
