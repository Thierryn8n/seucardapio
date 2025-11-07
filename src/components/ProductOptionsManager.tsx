import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useProductOptions, ProductOptionGroup as HookOptionGroup, ProductOption as HookOption } from '../hooks/useProductOptions';
import { Plus, Trash2, GripVertical, Edit2, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { useToast } from '../hooks/use-toast';

interface ProductOption {
  id?: string;
  name: string;
  additional_price: number;
  available: boolean;
  display_order: number;
  option_group_id?: string;
}

interface ProductOptionGroup {
  id?: string;
  name: string;
  min_selections: number;
  max_selections: number;
  required: boolean;
  display_order: number;
  product_id?: string;
  options: ProductOption[];
}

interface ProductOptionsManagerProps {
  productId: string;
  onSave?: () => void;
}

export const ProductOptionsManager: React.FC<ProductOptionsManagerProps> = ({ productId, onSave }) => {
  const {
    optionGroups: originalOptionGroups,
    loading,
    createOptionGroup,
    updateOptionGroup,
    deleteOptionGroup,
    createOption,
    updateOption,
    deleteOption,
  } = useProductOptions(productId);
  
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const { toast } = useToast();

  // Estado local para as opções (cópia das originais)
  const [optionGroups, setOptionGroups] = useState<HookOptionGroup[]>([]);

  // Estado para controlar alterações pendentes
  const [hasChanges, setHasChanges] = useState(false);

  // Atualiza o estado local quando as opções originais mudam
  useEffect(() => {
    setOptionGroups(originalOptionGroups);
  }, [originalOptionGroups]);

  const addOptionGroup = () => {
    const newGroup: Omit<HookOptionGroup, 'id'> = {
      product_id: productId,
      name: 'Novo Grupo',
      min_selections: 0,
      max_selections: 1,
      required: false,
      display_order: optionGroups.length,
    };
    createOptionGroup(newGroup);
  };

  const updateLocalGroup = (index: number, field: keyof HookOptionGroup, value: any) => {
    // Atualiza apenas localmente, sem salvar automaticamente
    const updatedGroups = [...optionGroups];
    updatedGroups[index] = { ...updatedGroups[index], [field]: value };
    setOptionGroups(updatedGroups);
    setHasChanges(true); // Marca que há alterações pendentes
  };

  const removeOptionGroup = (index: number) => {
    const group = optionGroups[index];
    if (group.id) {
      deleteOptionGroup(group.id);
    }
  };

  const addOptionToGroup = (groupIndex: number) => {
    const group = optionGroups[groupIndex];
    if (group.id) {
      const newOption: Omit<HookOption, 'id'> = {
        option_group_id: group.id,
        name: 'Nova Opção',
        additional_price: 0,
        available: true,
        display_order: group.options?.length || 0,
      };
      createOption(newOption);
    }
  };

  const updateLocalOption = (groupIndex: number, optionIndex: number, field: keyof HookOption, value: any) => {
    // Atualiza apenas localmente, sem salvar automaticamente
    const updatedGroups = [...optionGroups];
    if (!updatedGroups[groupIndex].options) {
      updatedGroups[groupIndex].options = [];
    }
    updatedGroups[groupIndex].options![optionIndex] = { 
      ...updatedGroups[groupIndex].options![optionIndex], 
      [field]: value 
    };
    setOptionGroups(updatedGroups);
    setHasChanges(true); // Marca que há alterações pendentes
  };

  const removeOption = (groupIndex: number, optionIndex: number) => {
    const group = optionGroups[groupIndex];
    const option = group.options?.[optionIndex];
    if (option?.id) {
      deleteOption(option.id);
    }
  };

  const saveAllOptions = async () => {
    setSaving(true);
    try {
      // Salvar cada grupo e suas opções
      for (const group of optionGroups) {
        if (group.id) {
          // Atualizar grupo
          await updateOptionGroup(group.id, {
            name: group.name,
            min_selections: group.min_selections,
            max_selections: group.max_selections,
            required: group.required,
            display_order: group.display_order
          });

          // Atualizar cada opção do grupo
          if (group.options) {
            for (const option of group.options) {
              if (option.id) {
                await updateOption(option.id, {
                  name: option.name,
                  additional_price: option.additional_price,
                  display_order: option.display_order,
                  available: option.available
                });
              }
            }
          }
        }
      }
      
      setHasChanges(false); // Limpa o indicador de alterações pendentes
      toast({
        title: 'Sucesso',
        description: 'Todas as opções foram salvas com sucesso!'
      });

      // Atualiza as opções originais com as alterações
      // Note: O hook useProductOptions deve atualizar automaticamente após as chamadas

      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Erro ao salvar opções:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar as opções. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Opções do Produto</h3>
          <p className="text-sm text-muted-foreground">
            Configure grupos de opções e escolhas disponíveis para este produto
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <div className="flex items-center text-sm text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse" />
              Alterações pendentes
            </div>
          )}
          <Button onClick={addOptionGroup} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Grupo
          </Button>
        </div>
      </div>

      {optionGroups.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum grupo de opções configurado ainda.
            </p>
            <Button onClick={addOptionGroup}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Grupo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {optionGroups.map((group, groupIndex) => (
            <Card key={groupIndex}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`group-name-${groupIndex}`} className="text-sm font-medium text-blue-600">
                      Nome do Grupo de Opções
                    </Label>
                    <Input
                      id={`group-name-${groupIndex}`}
                      value={group.name}
                      onChange={(e) => updateLocalGroup(groupIndex, 'name', e.target.value)}
                      className="font-semibold border-blue-200 focus:border-blue-500"
                      placeholder="Ex: Tamanho, Sabor, Acompanhamentos"
                    />
                    <p className="text-xs text-muted-foreground">
                      Categoria de opções que o cliente pode escolher
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOptionGroup(groupIndex)}
                    className="ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Configurações do Grupo */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor={`min-${groupIndex}`} className="text-sm font-medium text-blue-600 mb-1">
                      Mínimo de Seleções
                    </Label>
                    <Input
                      id={`min-${groupIndex}`}
                      type="number"
                      min="0"
                      value={group.min_selections}
                      onChange={(e) => updateLocalGroup(groupIndex, 'min_selections', parseInt(e.target.value) || 0)}
                      className="border-blue-200 focus:border-blue-500"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Mínimo que o cliente deve escolher (0 = opcional)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor={`max-${groupIndex}`} className="text-sm font-medium text-green-600 mb-1">
                      Máximo de Seleções
                    </Label>
                    <Input
                      id={`max-${groupIndex}`}
                      type="number"
                      min="0"
                      value={group.max_selections}
                      onChange={(e) => updateLocalGroup(groupIndex, 'max_selections', parseInt(e.target.value) || 1)}
                      className="border-green-200 focus:border-green-500"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Máximo permitido (1 = escolha única)
                    </p>
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center mb-1">
                      <Switch
                        id={`required-${groupIndex}`}
                        checked={group.required}
                        onCheckedChange={(checked) => updateLocalGroup(groupIndex, 'required', checked)}
                      />
                      <Label htmlFor={`required-${groupIndex}`} className="ml-2 text-sm font-medium text-orange-600">
                        Obrigatório
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cliente deve escolher pelo menos 1 opção
                    </p>
                  </div>
                  <div>
                    <Label htmlFor={`order-${groupIndex}`} className="text-sm font-medium text-purple-600 mb-1">
                      Ordem do Grupo
                    </Label>
                    <Input
                      id={`order-${groupIndex}`}
                      type="number"
                      value={group.display_order}
                      onChange={(e) => updateLocalGroup(groupIndex, 'display_order', parseInt(e.target.value) || 0)}
                      className="border-purple-200 focus:border-purple-500"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Posição na lista (1, 2, 3...)
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Opções do Grupo */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Opções</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addOptionToGroup(groupIndex)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Opção
                    </Button>
                  </div>

                  {group.options.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma opção adicionada ainda.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {group.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="flex-1 space-y-2">
                            <div>
                              <Label htmlFor={`option-name-${groupIndex}-${optionIndex}`} className="text-xs font-medium text-blue-600 mb-1">
                                Nome da Opção
                              </Label>
                              <Input
                                id={`option-name-${groupIndex}-${optionIndex}`}
                                value={option.name}
                                onChange={(e) => updateLocalOption(groupIndex, optionIndex, 'name', e.target.value)}
                                placeholder="Ex: Borda Recheada, Extra Queijo"
                                className="border-blue-200 focus:border-blue-500"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label htmlFor={`price-${groupIndex}-${optionIndex}`} className="text-xs font-medium text-green-600 mb-1">
                                  Preço Adicional (R$)
                                </Label>
                                <Input
                                  id={`price-${groupIndex}-${optionIndex}`}
                                  type="number"
                                  step="0.01"
                                  value={option.additional_price}
                                  onChange={(e) => updateLocalOption(groupIndex, optionIndex, 'additional_price', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="border-green-200 focus:border-green-500"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Valor extra cobrado por esta opção
                                </p>
                              </div>
                              <div>
                                <Label htmlFor={`order-${groupIndex}-${optionIndex}`} className="text-xs font-medium text-purple-600 mb-1">
                                  Ordem de Exibição
                                </Label>
                                <Input
                                  id={`order-${groupIndex}-${optionIndex}`}
                                  type="number"
                                  value={option.display_order}
                                  onChange={(e) => updateLocalOption(groupIndex, optionIndex, 'display_order', parseInt(e.target.value) || 0)}
                                  placeholder="1"
                                  className="border-purple-200 focus:border-purple-500 w-full"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Posição na lista (1, 2, 3...)
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              <Switch
                                id={`available-${groupIndex}-${optionIndex}`}
                                checked={option.available}
                                onCheckedChange={(checked) => updateLocalOption(groupIndex, optionIndex, 'available', checked)}
                              />
                              <Label htmlFor={`available-${groupIndex}-${optionIndex}`} className="ml-2 text-sm">
                                Ativo
                              </Label>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOption(groupIndex, optionIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={saveAllOptions} disabled={saving || !hasChanges}>
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Salvando...
            </>
          ) : (
            'Salvar Todas as Opções'
          )}
        </Button>
      </div>
    </div>
  );
};