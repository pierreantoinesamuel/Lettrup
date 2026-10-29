import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../domain/user/UserRole';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090e1a] flex items-center justify-center text-slate-400 text-xs">
        Chargement de la session...
      </div>
    );
  }

  // If user is not logged in, redirect to auth login page
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles are required and user role doesn't match, redirect to their authorized panel
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role || 'job_seeker')) {
    const userRole = user.role || 'job_seeker';
    if (userRole === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (userRole === 'recruiter') {
      return <Navigate to="/recruiter" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
