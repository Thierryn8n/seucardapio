import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MercadoPagoSettings } from "./useMercadoPago";

export interface MercadoPagoSettingsWithUser extends MercadoPagoSettings {
  user_email?: string;
  user_name?: string;
}

export const useMercadoPagoMaster = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todas as configurações do Mercado Pago
  const { data: allSettings, isLoading } = useQuery({
    queryKey: ["mercadoPagoSettings", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mercado_pago_settings")
        .select(`
          *,
          users:user_id (email, raw_user_meta_data)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return data.map(item => ({
        ...item,
        user_email: item.users?.email,
        user_name: item.users?.raw_user_meta_data?.full_name
      })) as MercadoPagoSettingsWithUser[];
    },
  });

  // Buscar configurações de um usuário específico
  const getUserSettings = async (userId: string) => {
    const { data, error } = await supabase
      .from("mercado_pago_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data as MercadoPagoSettings | null;
  };

  // Criar configurações para um usuário
  const createUserSettings = useMutation({
    mutationFn: async ({ userId, settings }: { userId: string; settings: Omit<MercadoPagoSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> }) => {
      const { data, error } = await supabase
        .from("mercado_pago_settings")
        .insert({
          user_id: userId,
          ...settings
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mercadoPagoSettings", "all"] });
      toast({
        title: "Configurações criadas",
        description: "Configurações do Mercado Pago criadas com sucesso para o usuário.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Atualizar configurações de um usuário
  const updateUserSettings = useMutation({
    mutationFn: async ({ userId, settings }: { userId: string; settings: Partial<MercadoPagoSettings> }) => {
      const { data, error } = await supabase
        .from("mercado_pago_settings")
        .update(settings)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mercadoPagoSettings", "all"] });
      toast({
        title: "Configurações atualizadas",
        description: "Configurações do Mercado Pago atualizadas com sucesso.",
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

  // Deletar configurações de um usuário
  const deleteUserSettings = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("mercado_pago_settings")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mercadoPagoSettings", "all"] });
      toast({
        title: "Configurações removidas",
        description: "Configurações do Mercado Pago removidas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Testar conexão com Mercado Pago
  const testConnection = async (accessToken: string) => {
    try {
      const response = await fetch("https://api.mercadopago.com/v1/payment_methods", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Token inválido ou expirado");
      }

      const data = await response.json();
      return { success: true, methods: data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
    }
  };

  return {
    allSettings,
    isLoading,
    getUserSettings,
    createUserSettings: createUserSettings.mutate,
    updateUserSettings: updateUserSettings.mutate,
    deleteUserSettings: deleteUserSettings.mutate,
    testConnection,
  };
};