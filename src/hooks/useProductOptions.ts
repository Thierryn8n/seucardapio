import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ProductOption {
  id?: string;
  option_group_id: string;
  name: string;
  additional_price: number;
  available: boolean;
  display_order: number;
}

export interface ProductOptionGroup {
  id?: string;
  product_id: string;
  name: string;
  min_selections: number;
  max_selections: number;
  required: boolean;
  display_order: number;
  options?: ProductOption[];
}

export interface UseProductOptionsReturn {
  optionGroups: ProductOptionGroup[];
  loading: boolean;
  error: string | null;
  loadOptionGroups: (productId: string) => Promise<void>;
  createOptionGroup: (group: Omit<ProductOptionGroup, 'id'>) => Promise<ProductOptionGroup | null>;
  updateOptionGroup: (id: string, group: Partial<ProductOptionGroup>) => Promise<boolean>;
  deleteOptionGroup: (id: string) => Promise<boolean>;
  createOption: (option: Omit<ProductOption, 'id'>) => Promise<ProductOption | null>;
  updateOption: (id: string, option: Partial<ProductOption>) => Promise<boolean>;
  deleteOption: (id: string) => Promise<boolean>;
  reorderGroups: (groups: ProductOptionGroup[]) => Promise<boolean>;
  reorderOptions: (options: ProductOption[]) => Promise<boolean>;
}

export function useProductOptions(productId?: string): UseProductOptionsReturn {
  const [optionGroups, setOptionGroups] = useState<ProductOptionGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOptionGroups = async (productId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: groupsData, error: groupsError } = await supabase
        .from('product_option_groups')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (groupsError) throw groupsError;

      const { data: optionsData, error: optionsError } = await supabase
        .from('product_options')
        .select('*')
        .in('option_group_id', groupsData?.map(g => g.id) || [])
        .order('display_order', { ascending: true });

      if (optionsError) throw optionsError;

      const groupsWithOptions = groupsData?.map(group => ({
        ...group,
        options: optionsData?.filter(option => option.option_group_id === group.id) || []
      })) || [];

      setOptionGroups(groupsWithOptions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar opções';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createOptionGroup = async (group: Omit<ProductOptionGroup, 'id'>) => {
    try {
      const { data, error: createError } = await supabase
        .from('product_option_groups')
        .insert([group])
        .select()
        .single();

      if (createError) throw createError;

      const newGroup = { ...data, options: [] } as ProductOptionGroup;
      setOptionGroups(prev => [...prev, newGroup]);
      
      toast({
        title: 'Sucesso',
        description: 'Grupo de opções criado com sucesso',
      });

      return newGroup;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar grupo';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateOptionGroup = async (id: string, group: Partial<ProductOptionGroup>) => {
    try {
      const { error: updateError } = await supabase
        .from('product_option_groups')
        .update(group)
        .eq('id', id);

      if (updateError) throw updateError;

      setOptionGroups(prev => prev.map(g => g.id === id ? { ...g, ...group } : g));
      
      toast({
        title: 'Sucesso',
        description: 'Grupo atualizado com sucesso',
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar grupo';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteOptionGroup = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('product_option_groups')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setOptionGroups(prev => prev.filter(g => g.id !== id));
      
      toast({
        title: 'Sucesso',
        description: 'Grupo removido com sucesso',
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover grupo';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  };

  const createOption = async (option: Omit<ProductOption, 'id'>) => {
    try {
      const { data, error: createError } = await supabase
        .from('product_options')
        .insert([option])
        .select()
        .single();

      if (createError) throw createError;

      setOptionGroups(prev => prev.map(group => 
        group.id === option.option_group_id 
          ? { ...group, options: [...(group.options || []), data] }
          : group
      ));
      
      toast({
        title: 'Sucesso',
        description: 'Opção criada com sucesso',
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar opção';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateOption = async (id: string, option: Partial<ProductOption>) => {
    try {
      const { error: updateError } = await supabase
        .from('product_options')
        .update(option)
        .eq('id', id);

      if (updateError) throw updateError;

      setOptionGroups(prev => prev.map(group => ({
        ...group,
        options: group.options?.map(opt => 
          opt.id === id ? { ...opt, ...option } : opt
        ) || []
      })));
      
      toast({
        title: 'Sucesso',
        description: 'Opção atualizada com sucesso',
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar opção';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteOption = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('product_options')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setOptionGroups(prev => prev.map(group => ({
        ...group,
        options: group.options?.filter(opt => opt.id !== id) || []
      })));
      
      toast({
        title: 'Sucesso',
        description: 'Opção removida com sucesso',
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover opção';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  };

  const reorderGroups = async (groups: ProductOptionGroup[]) => {
    try {
      const updates = groups.map((group, index) => ({
        id: group.id,
        display_order: index + 1
      }));

      const { error } = await supabase
        .from('product_option_groups')
        .upsert(updates);

      if (error) throw error;

      setOptionGroups(groups);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao reordenar grupos';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  };

  const reorderOptions = async (options: ProductOption[]) => {
    try {
      const updates = options.map((option, index) => ({
        id: option.id,
        display_order: index + 1
      }));

      const { error } = await supabase
        .from('product_options')
        .upsert(updates);

      if (error) throw error;

      setOptionGroups(prev => prev.map(group => 
        group.id === options[0]?.option_group_id
          ? { ...group, options }
          : group
      ));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao reordenar opções';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    if (productId) {
      loadOptionGroups(productId);
    }
  }, [productId]);

  return {
    optionGroups,
    loading,
    error,
    loadOptionGroups,
    createOptionGroup,
    updateOptionGroup,
    deleteOptionGroup,
    createOption,
    updateOption,
    deleteOption,
    reorderGroups,
    reorderOptions,
  };
}