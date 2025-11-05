import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { mercadoPagoService } from '@/integrations/mercadopago';

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
        const subscriptionStatus = await mercadoPagoService.getSubscription(
          subscription.mercado_pago_subscription_id
        );

        if (subscriptionStatus && subscriptionStatus.status) {
          const isValid = subscriptionStatus.status === 'active' || 
                         subscriptionStatus.status === 'pending';

          // Atualizar status no banco de dados se diferente
          if (subscriptionStatus.status !== subscription.status) {
            await supabase
              .from('subscriptions')
              .update({ 
                status: subscriptionStatus.status,
                updated_at: new Date().toISOString()
              })
              .eq('id', subscription.id);
          }

          setValidation({
            isValid,
            isLoading: false,
            planStatus: subscriptionStatus.status as any,
            lastValidation: new Date(),
            error: null,
          });
        } else {
          throw new Error('Não foi possível validar a assinatura');
        }
      } else if (subscription.mercado_pago_payment_id) {
        // Validação para pagamento único (planos lifetime)
        const paymentStatus = await mercadoPagoService.getPayment(
          subscription.mercado_pago_payment_id
        );

        if (paymentStatus && paymentStatus.status) {
          const isValid = paymentStatus.status === 'approved';

          setValidation({
            isValid,
            isLoading: false,
            planStatus: paymentStatus.status === 'approved' ? 'active' : 'cancelled',
            lastValidation: new Date(),
            error: null,
          });
        } else {
          throw new Error('Não foi possível validar o pagamento');
        }
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