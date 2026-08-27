import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

/**
 * Authentication hook for managing user session
 * @returns {Object} Auth state and methods
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const token = authService.getToken();
      if (token) {
        const isValid = await authService.checkToken();
        if (isValid) {
          const userData = authService.getUser();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          await authService.logout();
        }
      }
    } catch {
      await authService.logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return { user, loading, isAuthenticated, login, logout, checkAuth };
}