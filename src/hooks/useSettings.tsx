import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Settings {
  id: string;
  company_name: string;
  logo_url?: string;
  favicon_url?: string;
  logo_size: number;
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
      return data as Settings;
    },
  });

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
