import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface SimpleOnlyRouteProps {
  children: React.ReactNode;
}

export const SimpleOnlyRoute: React.FC<SimpleOnlyRouteProps> = ({ children }) => {
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const location = useLocation();

  if (loading || (user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-lg">Verificando permissões...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Permite apenas admin simples
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
