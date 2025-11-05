import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanValidation } from './usePlanValidation';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PlanRestriction {
  canAccessDelivery: boolean;
  canAccessPremiumFeatures: boolean;
  maxProducts: number;
  maxOrdersPerMonth: number;
  canUseCoupons: boolean;
  canAccessAnalytics: boolean;
  restrictionReason: string | null;
}

export const usePlanRestrictions = () => {
  const { user, subscription } = useAuth();
  const { isValid, planStatus, isLoading } = usePlanValidation();
  const { toast } = useToast();
  const [restrictions, setRestrictions] = useState<PlanRestriction>({
    canAccessDelivery: false,
    canAccessPremiumFeatures: false,
    maxProducts: 0,
    maxOrdersPerMonth: 0,
    canUseCoupons: false,
    canAccessAnalytics: false,
    restrictionReason: null,
  });

  const planLimits = {
    free: {
      maxProducts: 5,
      maxOrdersPerMonth: 50,
      canUseCoupons: false,
      canAccessAnalytics: false,
      canAccessPremiumFeatures: false,
    },
    professional: {
      maxProducts: 50,
      maxOrdersPerMonth: 500,
      canUseCoupons: true,
      canAccessAnalytics: true,
      canAccessPremiumFeatures: true,
    },
    premium: {
      maxProducts: -1, // ilimitado
      maxOrdersPerMonth: -1, // ilimitado
      canUseCoupons: true,
      canAccessAnalytics: true,
      canAccessPremiumFeatures: true,
    },
  };

  const checkRestrictions = async () => {
    if (!user || !subscription) {
      setRestrictions({
        canAccessDelivery: false,
        canAccessPremiumFeatures: false,
        maxProducts: 0,
        maxOrdersPerMonth: 0,
        canUseCoupons: false,
        canAccessAnalytics: false,
        restrictionReason: 'Usuário não autenticado',
      });
      return;
    }

    // Se estiver carregando a validação, manter estado atual
    if (isLoading) {
      return;
    }

    // Verificar se o plano é válido
    if (!isValid) {
      let restrictionReason = 'Plano inválido ou expirado';
      
      if (planStatus === 'expired') {
        restrictionReason = 'Seu plano expirou. Renove para continuar usando os recursos.';
      } else if (planStatus === 'cancelled') {
        restrictionReason = 'Sua assinatura foi cancelada.';
      } else if (planStatus === 'pending') {
        restrictionReason = 'Aguardando confirmação de pagamento.';
      }

      setRestrictions({
        canAccessDelivery: false,
        canAccessPremiumFeatures: false,
        maxProducts: 0,
        maxOrdersPerMonth: 0,
        canUseCoupons: false,
        canAccessAnalytics: false,
        restrictionReason,
      });

      // Notificar usuário sobre restrição
      toast({
        title: 'Acesso Restrito',
        description: restrictionReason,
        variant: 'destructive',
      });

      return;
    }

    // Obter limites do plano atual
    const planConfig = planLimits[subscription.plan as keyof typeof planLimits];
    
    if (!planConfig) {
      setRestrictions({
        canAccessDelivery: false,
        canAccessPremiumFeatures: false,
        maxProducts: 0,
        maxOrdersPerMonth: 0,
        canUseCoupons: false,
        canAccessAnalytics: false,
        restrictionReason: 'Plano desconhecido',
      });
      return;
    }

    // Para planos pagos, verificar uso atual
    let currentProducts = 0;
    let currentOrdersThisMonth = 0;

    if (subscription.plan !== 'free') {
      try {
        // Contar produtos do usuário
        const { count: productCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        currentProducts = productCount || 0;

        // Contar pedidos do mês atual
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: orderCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth.toISOString());

        currentOrdersThisMonth = orderCount || 0;
      } catch (error) {
        console.error('Erro ao verificar uso do plano:', error);
      }
    }

    // Calcular restrições
    const canAccessDelivery = true; // Todos os planos têm acesso básico
    const maxProducts = planConfig.maxProducts === -1 ? Infinity : planConfig.maxProducts;
    const maxOrdersPerMonth = planConfig.maxOrdersPerMonth === -1 ? Infinity : planConfig.maxOrdersPerMonth;
    
    const hasReachedProductLimit = currentProducts >= maxProducts;
    const hasReachedOrderLimit = currentOrdersThisMonth >= maxOrdersPerMonth;

    let restrictionReason = null;
    
    if (hasReachedProductLimit && subscription.plan !== 'premium') {
      restrictionReason = `Você atingiu o limite de ${maxProducts} produtos do seu plano.`;
    } else if (hasReachedOrderLimit && subscription.plan !== 'premium') {
      restrictionReason = `Você atingiu o limite de ${maxOrdersPerMonth} pedidos deste mês.`;
    }

    setRestrictions({
      canAccessDelivery,
      canAccessPremiumFeatures: planConfig.canAccessPremiumFeatures,
      maxProducts: maxProducts === Infinity ? -1 : maxProducts,
      maxOrdersPerMonth: maxOrdersPerMonth === Infinity ? -1 : maxOrdersPerMonth,
      canUseCoupons: planConfig.canUseCoupons,
      canAccessAnalytics: planConfig.canAccessAnalytics,
      restrictionReason,
    });
  };

  // Verificar restrições quando houver mudanças
  useEffect(() => {
    checkRestrictions();
  }, [user?.id, subscription?.id, subscription?.plan, subscription?.status, isValid, isLoading]);

  // Verificar restrições periodicamente (a cada minuto)
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && subscription && subscription.plan !== 'free') {
        checkRestrictions();
      }
    }, 60 * 1000); // 1 minuto

    return () => clearInterval(interval);
  }, [user?.id, subscription?.id, subscription?.plan]);

  return {
    ...restrictions,
    checkRestrictions,
  };
};