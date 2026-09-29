import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { decryptUserRole } from '@/lib/role-encryption';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  roleLoading: boolean;
  userPlan: 'free' | 'professional' | 'premium' | null;
  updateUserRole: (userId: string, newRole: string) => Promise<{ success: boolean; error?: any }>;
  levelConfigs: LevelConfig[] | null;
  refreshLevelConfigs: () => Promise<void>;
}

interface LevelConfig {
  id: string;
  plan_name: string;
  plan_display_name: string;
  access_level: number;
  panel_type: 'simple' | 'master';
  delivery_features: boolean;
  menu_management: boolean;
  user_management: boolean;
  system_config: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPlan, setUserPlan] = useState<'free' | 'professional' | 'premium' | null>(null);
  const [levelConfigs, setLevelConfigs] = useState<LevelConfig[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Check admin status and subscription
        if (session?.user) {
          setRoleLoading(true);
          const userId = session.user.id;
          // Defer to avoid running inside the onAuthStateChange callback itself
          setTimeout(async () => {
            await Promise.all([
              checkAdminStatus(userId),
              checkUserSubscription(userId),
              refreshLevelConfigs(),
            ]);
            setRoleLoading(false);
          }, 0);
        } else {
          setIsAdmin(false);
          setUserPlan(null);
          setLevelConfigs(null);
          setRoleLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await Promise.all([
          checkAdminStatus(session.user.id),
          checkUserSubscription(session.user.id),
          refreshLevelConfigs(),
        ]);
      }
      setRoleLoading(false);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    // Check if user has admin role
    let isUserAdmin = false;

    // Method 1: Check profiles table is_admin field
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .maybeSingle();
      
      if (!profileError && profileData?.is_admin) {
        isUserAdmin = true;
      }
    } catch (error) {
      console.error('Erro ao verificar profile is_admin:', error);
    }

    // Method 2: Check encrypted role from users table (fallback)
    if (!isUserAdmin) {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role_encrypted')
          .eq('id', userId)
          .maybeSingle();
        
        if (!userError && userData?.role_encrypted) {
          const decryptedRole = decryptUserRole(userData.role_encrypted, userId);
          if (decryptedRole === 'admin') {
            isUserAdmin = true;
          }
        }
      } catch (error) {
        console.error('Erro ao verificar role criptografado:', error);
      }
    }

    setIsAdmin(isUserAdmin);
  };

  const checkUserSubscription = async (userId: string) => {
    // Get user subscription plan
    try {
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Erro ao buscar subscription:', error);
        setUserPlan('free');
        return;
      }
      
      if (subscription && subscription.length > 0) {
        setUserPlan(subscription[0].plan as 'free' | 'professional' | 'premium');
      } else {
        // Se não houver subscription, assumir plano free
        setUserPlan('free');
      }
    } catch (error) {
      console.error('Erro ao verificar subscription:', error);
      setUserPlan('free'); // Fallback para free em caso de erro
    }
  };

  const refreshLevelConfigs = async () => {
    try {
      // Tentar buscar configurações da tabela plan_level_configs
      const { data, error } = await supabase
        .from('plan_level_configs')
        .select('*')
        .eq('active', true)
        .order('access_level', { ascending: true });

      if (error) {
        console.warn('Configurações de níveis não encontradas, usando padrões:', error.message);
      }

      if (data && data.length > 0) {
        setLevelConfigs(data as LevelConfig[]);
      } else {
        // Usar configurações padrão
        const defaultConfigs: LevelConfig[] = [
          {
            id: 'free-config',
            plan_name: 'free',
            plan_display_name: 'Gratuito',
            access_level: 1,
            panel_type: 'simple',
            delivery_features: false,
            menu_management: true,
            user_management: false,
            system_config: false,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'professional-config',
            plan_name: 'professional',
            plan_display_name: 'Profissional',
            access_level: 2,
            panel_type: 'simple',
            delivery_features: false,
            menu_management: true,
            user_management: false,
            system_config: false,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'premium-config',
            plan_name: 'premium',
            plan_display_name: 'Premium',
            access_level: 3,
            panel_type: 'master',
            delivery_features: true,
            menu_management: true,
            user_management: true,
            system_config: true,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setLevelConfigs(defaultConfigs);
      }
    } catch (error) {
      console.warn('Erro ao buscar configurações de níveis, usando padrões:', error);
      // Em caso de erro, usar configurações padrão
      const defaultConfigs: LevelConfig[] = [
        {
          id: 'free-config',
          plan_name: 'free',
          plan_display_name: 'Gratuito',
          access_level: 1,
          panel_type: 'simple',
          delivery_features: false,
          menu_management: true,
          user_management: false,
          system_config: false,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'professional-config',
          plan_name: 'professional',
          plan_display_name: 'Profissional',
          access_level: 2,
          panel_type: 'simple',
          delivery_features: false,
          menu_management: true,
          user_management: false,
          system_config: false,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'premium-config',
          plan_name: 'premium',
          plan_display_name: 'Premium',
          access_level: 3,
          panel_type: 'master',
          delivery_features: true,
          menu_management: true,
          user_management: true,
          system_config: true,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setLevelConfigs(defaultConfigs);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      // Redirecionar para o seletor de painéis após login bem-sucedido
      navigate('/admin/selector');
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl =
      import.meta.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setUserPlan(null);
    setLevelConfigs(null);
    navigate('/');
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { encryptUserRole } = await import('@/lib/role-encryption');
      const encryptedRole = encryptUserRole(newRole, userId);
      
      const { error } = await supabase
        .from('users')
        .update({
          role_encrypted: encryptedRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      // Atualizar estado local se for o usuário atual
      if (user?.id === userId) {
        setIsAdmin(newRole === 'admin');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar role do usuário:', error);
      return { success: false, error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, isAdmin, roleLoading, userPlan, updateUserRole, levelConfigs, refreshLevelConfigs }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
