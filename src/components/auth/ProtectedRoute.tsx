import React, { useEffect } from 'react';
import { Navigate, useLocation } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin' | 'developer';
  requireEmailVerification?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requireEmailVerification = false,
  redirectTo = '/auth/login'
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        search={{ 
          redirect: location.pathname 
        }} 
      />
    );
  }

  // Check email verification requirement
  if (requireEmailVerification && !user?.emailVerified) {
    return (
      <Navigate 
        to="/auth/verify-email" 
        search={{ 
          redirect: location.pathname 
        }} 
      />
    );
  }

  // Check role requirement
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have the required permissions to access this page.
            {requiredRole && (
              <span className="block mt-2 text-sm">
                Required role: <span className="font-medium">{requiredRole}</span>
              </span>
            )}
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
};

// Hook to check if user has required role
export const useHasRole = (requiredRole: 'user' | 'admin' | 'developer'): boolean => {
  const { user } = useAuth();
  
  if (!user) return false;
  
  // Admins have access to everything
  if (user.role === 'admin') return true;
  
  // Check specific role
  return user.role === requiredRole;
};

// Hook to check if user has any of the required roles
export const useHasAnyRole = (roles: Array<'user' | 'admin' | 'developer'>): boolean => {
  const { user } = useAuth();
  
  if (!user) return false;
  
  // Admins have access to everything
  if (user.role === 'admin') return true;
  
  // Check if user has any of the required roles
  return roles.includes(user.role);
};
