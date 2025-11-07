import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAdminStatus = () => {
  const { user } = useAuth();

  const { data: hasAdminRole, isLoading: isLoadingRole } = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      console.log('=== useAdminStatus - Verificando user_roles ===');
      console.log('User ID:', user.id);
      console.log('URL atual:', window.location.pathname);
      console.log('Restaurant ID do URL:', window.location.pathname.split('/')[1]);

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      console.log('user_roles query resultado:');
      console.log('- data:', data);
      console.log('- error:', error);
      console.log('- role encontrada:', data?.role);
      console.log('- é admin?', data?.role === 'admin');

      if (error && error.code !== "PGRST116") {
        console.error("Erro ao verificar role de admin:", error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.id,
  });

  const { data: isProfileAdmin, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profile-admin-status", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Erro ao verificar status de admin do perfil:", error);
        return false;
      }

      return data?.is_admin || false;
    },
    enabled: !!user?.id,
  });

  // Master Admin precisa ter ambos: is_admin = true E role = 'admin'
  const isMasterAdmin = (hasAdminRole || false) && (isProfileAdmin || false);

  return {
    isMasterAdmin,
    hasAdminRole: hasAdminRole || false,
    isProfileAdmin: isProfileAdmin || false,
    isLoading: isLoadingRole || isLoadingProfile,
  };
};