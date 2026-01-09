import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getStoredUser } from '../lib/api';

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard that only allows Super Admin users
 * Redirects to /login if not authenticated
 * Redirects to /app/dashboard if authenticated but not Super Admin
 */
const SuperAdminRoute: React.FC<SuperAdminRouteProps> = ({ children }) => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const checkAccess = () => {
      if (!isAuthenticated()) {
        setIsChecking(false);
        return;
      }

      const user = getStoredUser();
      setIsSuperAdmin(user?.isSuperAdmin === true);
      setIsChecking(false);
    };

    checkAccess();
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isSuperAdmin) {
    // User is authenticated but not Super Admin - redirect to user dashboard
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
};

export default SuperAdminRoute;
