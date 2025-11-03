import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

export const useSafeNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const safeNavigate = useCallback((path: string, options?: { replace?: boolean }) => {
    try {
      // Verifica se o path é válido
      if (!path || typeof path !== 'string') {
        console.warn('Invalid navigation path:', path);
        return;
      }

      // Remove múltiplas barras e normaliza o path
      const normalizedPath = path.replace(/\/+/g, '/');
      
      // Navegação segura com tratamento de erro
      navigate(normalizedPath, { 
        replace: options?.replace || false,
        state: { 
          from: location.pathname,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback para home em caso de erro
      navigate('/', { replace: true });
    }
  }, [navigate, location.pathname]);

  const safeGoBack = useCallback(() => {
    try {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Go back error:', error);
      navigate('/');
    }
  }, [navigate]);

  const safeReplace = useCallback((path: string) => {
    safeNavigate(path, { replace: true });
  }, [safeNavigate]);

  return {
    navigate: safeNavigate,
    goBack: safeGoBack,
    replace: safeReplace,
    currentPath: location.pathname
  };
};