import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { syncSubscription } from '@/lib/mercadopago';

interface PlanValidation {
  isValid: boolean;
  isLoading: boolean;
  planStatus: 'active' | 'expired' | 'pending' | 'cancelled' | null;
  lastValidation: Date | null;
  error: string | null;
}

export const usePlanValidation = () => {
  const { user, subscription } = useAuth();
  const [validation, setValidation] = useState<PlanValidation>({
    isValid: false,
    isLoading: true,
    planStatus: null,
    lastValidation: null,
    error: null,
  });

  const validatePlan = async () => {
    if (!user || !subscription) {
      setValidation({
        isValid: false,
        isLoading: false,
        planStatus: null,
        lastValidation: null,
        error: 'Usuário ou assinatura não encontrados',
      });
      return;
    }

    setValidation(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Se for plano gratuito, sempre válido
      if (subscription.plan === 'free') {
        setValidation({
          isValid: true,
          isLoading: false,
          planStatus: 'active',
          lastValidation: new Date(),
          error: null,
        });
        return;
      }

      // Para planos pagos, validar com Mercado Pago
      if (subscription.mercado_pago_subscription_id) {
        const { subscription: synced } = await syncSubscription();
        const status = (synced?.status as string | undefined) ?? subscription.status;

        setValidation({
          isValid: status === 'active' || status === 'pending',
          isLoading: false,
          planStatus: status as PlanValidation['planStatus'],
          lastValidation: new Date(),
          error: null,
        });
      } else {
        // Se não tem ID do Mercado Pago, verificar status local
        const isValid = subscription.status === 'active' || 
                       subscription.status === 'pending';

        setValidation({
          isValid,
          isLoading: false,
          planStatus: subscription.status as any,
          lastValidation: new Date(),
          error: null,
        });
      }
    } catch (error) {
      console.error('Erro na validação do plano:', error);
      
      // Em caso de erro, usar o status local como fallback
      const isValid = subscription.status === 'active' || 
                     subscription.status === 'pending';

      setValidation({
        isValid,
        isLoading: false,
        planStatus: subscription.status as any,
        lastValidation: new Date(),
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  // Validar plano quando o componente montar ou quando subscription mudar
  useEffect(() => {
    validatePlan();
  }, [user?.id, subscription?.id, subscription?.status]);

  // Configurar validação periódica (a cada 5 minutos)
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && subscription && subscription.plan !== 'free') {
        validatePlan();
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [user?.id, subscription?.id, subscription?.plan]);

  return {
    ...validation,
    validatePlan,
  };
};
