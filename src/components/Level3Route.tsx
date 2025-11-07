import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserLevel } from '@/hooks/useUserLevel';
import { useToast } from '@/hooks/use-toast';

interface Level3RouteProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

export const Level3Route: React.FC<Level3RouteProps> = ({ 
  children, 
  fallbackPath = '/admin/products' 
}) => {
  const { isLevel3 } = useUserLevel();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!isLevel3) {
      toast({
        title: 'Acesso Negado',
        description: 'Esta funcionalidade está disponível apenas para usuários nível 3.',
        variant: 'destructive'
      });
    }
  }, [isLevel3, toast]);

  if (!isLevel3) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};