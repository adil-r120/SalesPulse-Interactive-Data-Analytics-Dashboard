import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';

// Interface for component props
interface ProtectedRouteProps {
  children: ReactNode;
}

// Main ProtectedRoute component
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // Get authentication state from auth hook
  const { isAuthenticated, isLoading } = useAuth();
  // Get navigate function for routing
  const navigate = useNavigate();

  // Effect to redirect unauthenticated users to login page
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users (handled by useEffect)
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Render children if user is authenticated
  return <>{children}</>;
};

export default ProtectedRoute;