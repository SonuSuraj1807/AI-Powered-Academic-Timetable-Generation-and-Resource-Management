/**
 * useAuthGuard — Route protection hook
 * 
 * Redirects unauthenticated users to landing page.
 * Redirects users to their correct dashboard if role doesn't match the current route.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

const ROLE_ROUTES = {
  admin: '/admin',
  faculty: '/faculty',
  student: '/student',
};

export default function useAuthGuard(requiredRole = null) {
  const navigate = useNavigate();
  const { user, role, loading, initialized } = useAuthStore();

  useEffect(() => {
    if (!initialized || loading) return;

    // Not logged in → redirect to landing
    if (!user) {
      navigate('/', { replace: true });
      return;
    }

    // Logged in but wrong role for this route
    if (requiredRole && role !== requiredRole) {
      const correctRoute = ROLE_ROUTES[role] || '/';
      navigate(correctRoute, { replace: true });
    }
  }, [user, role, loading, initialized, requiredRole, navigate]);

  return { user, role, loading, initialized };
}
