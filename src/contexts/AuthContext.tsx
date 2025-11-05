import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { decryptUserRole } from '@/integrations/mercadopago/mercadopago.encryption';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isAdminMaster: boolean;
  isAdminDelivery: boolean;
  userPlan: 'free' | 'professional' | 'premium' | null;
  updateUserRole: (userId: string, newRole: string) => Promise<{ success: boolean; error?: any }>;
  levelConfigs: LevelConfig[] | null;
  refreshLevelConfigs: () => Promise<void>;
  getPanelForPlan: (plan: string) => 'simple' | 'master' | null;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminMaster, setIsAdminMaster] = useState(false);
  const [isAdminDelivery, setIsAdminDelivery] = useState(false);
  const [userPlan, setUserPlan] = useState<'free' | 'professional' | 'premium' | null>(null);
  const [levelConfigs, setLevelConfigs] = useState<LevelConfig[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check admin status and subscription
        if (session?.user) {
          setTimeout(() => {
            checkAdminStatus(session.user.id);
            checkUserSubscription(session.user.id);
            refreshLevelConfigs();
          }, 0);
        } else {
          setIsAdmin(false);
          setIsAdminMaster(false);
          setIsAdminDelivery(false);
          setUserPlan(null);
          setLevelConfigs(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        checkUserSubscription(session.user.id);
        refreshLevelConfigs();
      } else {
        setIsAdminMaster(false);
        setIsAdminDelivery(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    // Check if user has admin role using multiple methods
    let isUserAdmin = false;
    let isUserAdminMaster = false;
    let isUserAdminDelivery = false;

    // Method 1: Check user_roles table (Admin Master - Acesso total)
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!roleError && roleData?.role === 'admin') {
        isUserAdmin = true;
        isUserAdminMaster = true;
      }
    } catch (error) {
      console.error('Erro ao verificar user_roles:', error);
    }

    // Method 2: Check profiles table is_admin field (Admin Delivery)
    if (!isUserAdminMaster) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', userId)
          .maybeSingle();
        
        if (!profileError && profileData?.is_admin) {
          isUserAdmin = true;
          isUserAdminDelivery = true;
        }
      } catch (error) {
        console.error('Erro ao verificar profile is_admin:', error);
      }
    }

    // Method 3: Check encrypted role from users table (fallback)
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
            isUserAdminDelivery = true;
          }
        }
      } catch (error) {
        console.error('Erro ao verificar role criptografado:', error);
      }
    }

    setIsAdmin(isUserAdmin);
    setIsAdminMaster(isUserAdminMaster);
    setIsAdminDelivery(isUserAdminDelivery);
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
            active: true
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
            active: true
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
            active: true
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
          active: true
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
          active: true
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
          active: true
        }
      ];
      setLevelConfigs(defaultConfigs);
    }
  };

  const getPanelForPlan = (plan: string): 'simple' | 'master' | null => {
    if (!levelConfigs) return null;
    
    const config = levelConfigs.find(config => config.plan_name === plan && config.active);
    return config ? config.panel_type : null;
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
    const redirectUrl = `${window.location.origin}/`;
    
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
    setIsAdminMaster(false);
    setIsAdminDelivery(false);
    setUserPlan(null);
    setLevelConfigs(null);
    navigate('/');
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { encryptUserRole } = await import('@/integrations/mercadopago/mercadopago.encryption');
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
        setIsAdminMaster(newRole === 'admin');
        setIsAdminDelivery(newRole === 'admin');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar role do usuário:', error);
      return { success: false, error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, isAdmin, isAdminMaster, isAdminDelivery, userPlan, updateUserRole, levelConfigs, refreshLevelConfigs, getPanelForPlan }}>
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
