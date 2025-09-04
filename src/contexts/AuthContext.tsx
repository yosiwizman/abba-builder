import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin' | 'developer';
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Setup token refresh interval
  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh token every 45 minutes (before 1 hour expiry)
    const interval = setInterval(() => {
      refreshToken();
    }, 45 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Check if user has valid authentication
  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const refreshTokenValue = localStorage.getItem('refreshToken');
      
      if (!accessToken) {
        // Try to refresh if we have a refresh token
        if (refreshTokenValue) {
          await refreshToken();
        } else {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      // Verify the access token
      const response = await window.electron?.invoke('auth:verify-token', {
        token: accessToken
      });

      if (response?.success) {
        // Token is valid, get user data
        const userData = response.data;
        setUser({
          id: userData.sub,
          email: userData.email,
          username: userData.username || userData.email.split('@')[0],
          role: userData.role || 'user',
          emailVerified: userData.emailVerified || false
        });
      } else {
        // Token is invalid, try to refresh
        if (refreshTokenValue) {
          await refreshToken();
        } else {
          // No valid tokens, clear storage
          localStorage.removeItem('accessToken');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      const response = await window.electron?.invoke('auth:login', {
        email,
        password,
        rememberMe
      });

      if (response?.success) {
        const { user: userData, accessToken, refreshToken: refreshTokenValue, sessionId: sessionIdValue } = response.data;
        
        // Store tokens
        localStorage.setItem('accessToken', accessToken);
        if (rememberMe && refreshTokenValue) {
          localStorage.setItem('refreshToken', refreshTokenValue);
        }
        
        // Store session ID
        if (sessionIdValue) {
          setSessionId(sessionIdValue);
          sessionStorage.setItem('sessionId', sessionIdValue);
        }
        
        // Set user state
        setUser(userData);
        
        // Navigate to home or dashboard
        navigate({ to: '/' });
      } else {
        throw new Error(response?.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Signup function
  const signup = async (username: string, email: string, password: string) => {
    try {
      const response = await window.electron?.invoke('auth:signup', {
        username,
        email,
        password
      });

      if (response?.success) {
        const { user: userData, accessToken, refreshToken: refreshTokenValue, sessionId: sessionIdValue } = response.data;
        
        // Store tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshTokenValue);
        
        // Store session ID
        if (sessionIdValue) {
          setSessionId(sessionIdValue);
          sessionStorage.setItem('sessionId', sessionIdValue);
        }
        
        // Set user state
        setUser(userData);
        
        // Navigate to onboarding or home
        navigate({ to: '/onboarding' });
      } else {
        throw new Error(response?.error || 'Signup failed');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken');
      const sessionIdValue = sessionId || sessionStorage.getItem('sessionId');
      
      // Call logout handler
      await window.electron?.invoke('auth:logout', {
        sessionId: sessionIdValue,
        refreshToken: refreshTokenValue
      });
      
      // Clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('sessionId');
      
      // Clear state
      setUser(null);
      setSessionId(null);
      
      // Navigate to login
      navigate({ to: '/auth/login' });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('sessionId');
      setUser(null);
      setSessionId(null);
      navigate({ to: '/auth/login' });
    }
  };

  // Refresh token function
  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken');
      
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const response = await window.electron?.invoke('auth:refresh-token', {
        refreshToken: refreshTokenValue
      });

      if (response?.success) {
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        // Update tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        // Re-check auth to update user data
        await checkAuth();
      } else {
        throw new Error(response?.error || 'Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout
      await logout();
    }
  };

  // Update user data
  const updateUser = (userData: Partial<User>) => {
    setUser(current => {
      if (!current) return null;
      return { ...current, ...userData };
    });
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    refreshToken,
    updateUser,
    checkAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protected routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: 'user' | 'admin' | 'developer'
): React.FC<P> => {
  return (props: P) => {
    const { user, isLoading, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        navigate({ to: '/auth/login' });
      } else if (!isLoading && requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
        navigate({ to: '/unauthorized' });
      }
    }, [isLoading, isAuthenticated, user, navigate]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Unauthorized</h1>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};
