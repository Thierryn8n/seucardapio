import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface MercadoPagoSettings {
  id: string;
  user_id: string;
  access_token: string;
  public_key?: string;
  webhook_secret?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const useMercadoPago = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["mercadoPagoSettings", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("mercado_pago_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as MercadoPagoSettings | null;
    },
    enabled: !!user,
  });

  const createSettings = useMutation({
    mutationFn: async (newSettings: Omit<MercadoPagoSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("mercado_pago_settings")
        .insert({
          user_id: user.id,
          ...newSettings
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mercadoPagoSettings"] });
      toast({
        title: "Configurações salvas",
        description: "Suas chaves do Mercado Pago foram configuradas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<MercadoPagoSettings>) => {
      if (!settings) throw new Error("Settings not loaded");

      const { data, error } = await supabase
        .from("mercado_pago_settings")
        .update(updates)
        .eq("id", settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mercadoPagoSettings"] });
      toast({
        title: "Configurações atualizadas",
        description: "Suas chaves foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    createSettings: createSettings.mutate,
    updateSettings: updateSettings.mutate,
    hasSettings: !!settings,
  };
};
