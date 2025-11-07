import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Settings {
  id: string;
  company_name: string;
  logo_url?: string;
  favicon_url?: string;
  logo_size?: number;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  title_font: string;
  body_font: string;
  show_sunday: boolean;
  show_monday: boolean;
  show_tuesday: boolean;
  show_wednesday: boolean;
  show_thursday: boolean;
  show_friday: boolean;
  show_saturday: boolean;
  donation_enabled: boolean;
  donation_url?: string;
  donation_text: string;
  plan_level?: number;
}

export const useSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .single();

      if (error) throw error;
       
      // Buscar plan_level do restaurante a partir do user_id (id do restaurante)
      try {
        console.log('=== USESETTINGS - Iniciando busca ===');
        console.log('User ID:', data.user_id);
        console.log('Restaurant ID do URL:', window.location.pathname.split('/')[1]);
        
        // Método 1: Verificar user_roles table (Admin Master - Acesso total)
        // Usando a MESMA lógica do AuthContext
        console.log('Executando query user_roles para user_id:', data.user_id);
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user_id)
          .eq('role', 'admin')
          .maybeSingle();
        
        console.log('Resultado user_roles query:');
        console.log('- data:', roleData);
        console.log('- error:', roleError);
        console.log('- role encontrada:', roleData?.role);
        console.log('- é admin?', roleData?.role === 'admin');
        
        if (!roleError && roleData?.role === 'admin') {
          console.log(`✅ Admin master detectado para usuário ${data.user_id}, nível 3 liberado`);
          data.plan_level = 3;
        } else {
          // Método 2: Verificar profiles table is_admin field (Admin Delivery)
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', data.user_id)
            .maybeSingle();
          
          console.log('Dados profiles:', profileData);
          console.log('Erro profiles:', profileError);
          
          if (!profileError && profileData?.is_admin) {
            console.log(`✅ Admin Delivery detectado para usuário ${data.user_id}, nível 2 liberado`);
            data.plan_level = 2;
          } else {
            // Método 3: Buscar na tabela subscriptions (plano do usuário)
            console.log('Buscando plano do usuário na tabela subscriptions...');
            console.log('User ID para busca:', data.user_id);
            const { data: subscriptionData, error: subscriptionError } = await supabase
              .from("subscriptions")
              .select("plan")
              .eq("user_id", data.user_id)
              .maybeSingle();

            console.log('Dados da subscription:', subscriptionData);
            console.log('Erro na busca de subscription:', subscriptionError);
            
            if (!subscriptionError && subscriptionData?.plan) {
              console.log(`Plano encontrado: ${subscriptionData.plan}`);
              
              // Agora buscar o access_level correspondente ao plano
              const { data: planData, error: planError } = await supabase
                .from("plan_level_configs")
                .select("access_level")
                .eq("plan_name", subscriptionData.plan)
                .eq("active", true)
                .single();
              
              console.log(`Dados do plano:`, planData);
              console.log(`Erro ao buscar plano:`, planError);
              
              if (!planError && planData?.access_level) {
                data.plan_level = planData.access_level;
                console.log(`✅ Nível do plano encontrado para usuário ${data.user_id}:`, planData.access_level);
              } else {
                console.log(`⚠️ Plano ${subscriptionData.plan} não encontrado em plan_level_configs, usando padrão 1`);
                console.log(`Query usada: plan_name=${subscriptionData.plan}, active=true`);
                data.plan_level = 1;
              }
            } else {
              console.log('⚠️ Nenhuma assinatura encontrada para o usuário, usando plano free (nível 1)');
              console.log(`Erro na subscription:`, subscriptionError);
              console.log(`Dados da subscription:`, subscriptionData);
              data.plan_level = 1;
            }
          }
        }
      } catch (planError) {
        console.log('⚠️ Erro ao buscar nível do plano, usando padrão 1:', planError);
        data.plan_level = 1;
      }
       
      return data as Settings;
    },
  });

  // Função para buscar o nível do plano de um restaurante específico
  const getRestaurantPlanLevel = async (restaurantId: string) => {
    try {
      console.log(`Buscando nível do plano para restaurante: ${restaurantId}`);
      
      // Método 1: Verificar user_roles table (Admin Master - Acesso total)
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', restaurantId)
        .eq('role', 'admin')
        .maybeSingle();
      
      console.log('Dados user_roles:', roleData);
      console.log('Erro user_roles:', roleError);
      
      if (!roleError && roleData?.role === 'admin') {
        console.log(`Admin master detectado para restaurante ${restaurantId}, nível 3 liberado`);
        return 3;
      }
      
      // Método 2: Verificar profiles table is_admin field (Admin Delivery)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', restaurantId)
        .maybeSingle();
      
      console.log('Dados profiles:', profileData);
      console.log('Erro profiles:', profileError);
      
      if (!profileError && profileData?.is_admin) {
        console.log(`Admin Delivery detectado para restaurante ${restaurantId}, nível 2 liberado`);
        return 2;
      }
      
      // Método 3: Buscar na tabela subscriptions (plano do usuário)
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("user_id", restaurantId)
        .maybeSingle();
      
      if (subscriptionError || !subscriptionData?.plan) {
        console.log(`Nenhuma assinatura encontrada para restaurante ${restaurantId}, usando plano free (nível 1)`);
        return 1;
      }
      
      // Buscar o access_level correspondente ao plano
      const { data: planData, error: planError } = await supabase
        .from("plan_level_configs")
        .select("access_level")
        .eq("plan_name", subscriptionData.plan)
        .eq("active", true)
        .single();
      
      if (planError || !planData?.access_level) {
        console.log(`Plano ${subscriptionData.plan} não encontrado em plan_level_configs, usando padrão 1`);
        return 1;
      }
      
      console.log(`Nível do plano ${planData.access_level} encontrado para restaurante ${restaurantId}`);
      return planData.access_level;
      
    } catch (error) {
      console.log('Erro ao buscar nível do plano:', error);
      return 1;
    }
  };

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<Settings>) => {
      if (!settings) throw new Error("Settings not loaded");

      const { data, error } = await supabase
        .from("settings")
        .update(updates)
        .eq("id", settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({
        title: "Configurações atualizadas",
        description: "As configurações foram salvas com sucesso.",
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
    updateSettings: updateSettings.mutate,
  };
};
