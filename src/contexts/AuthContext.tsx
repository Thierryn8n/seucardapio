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
          }, 0);
        } else {
          setIsAdmin(false);
          setIsAdminMaster(false);
          setIsAdminDelivery(false);
          setUserPlan(null);
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
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .single();
    
    if (subscription) {
      setUserPlan(subscription.plan as 'free' | 'professional' | 'premium');
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
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, isAdmin, isAdminMaster, isAdminDelivery, userPlan, updateUserRole }}>
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
