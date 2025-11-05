import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionPlan = 'free' | 'professional' | 'premium';

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  mercado_pago_subscription_id?: string;
  mercado_pago_payment_id?: string;
  status: string;
  started_at: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export const useSubscription = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data as Subscription;
    },
    enabled: !!user,
  });

  const updateSubscription = useMutation({
    mutationFn: async (updates: Partial<Subscription>) => {
      if (!subscription) throw new Error("Subscription not loaded");

      const { data, error } = await supabase
        .from("subscriptions")
        .update(updates)
        .eq("id", subscription.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast({
        title: "Plano atualizado",
        description: "Seu plano foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar plano",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    subscription,
    isLoading,
    updateSubscription: updateSubscription.mutate,
    isPremium: subscription?.plan === 'premium',
    isProfessional: subscription?.plan === 'professional',
    isFree: subscription?.plan === 'free',
  };
};