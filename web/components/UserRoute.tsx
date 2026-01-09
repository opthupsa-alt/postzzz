import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getStoredUser } from '../lib/api';

interface UserRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard that only allows regular users (non-Super Admin)
 * Redirects to /login if not authenticated
 * Redirects to /admin if authenticated but is Super Admin
 */
const UserRoute: React.FC<UserRouteProps> = ({ children }) => {
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
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isSuperAdmin) {
    // User is Super Admin - redirect to admin panel
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default UserRoute;
