import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Settings, Save, Info, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface LevelConfig {
  id: string;
  plan_name: 'free' | 'professional' | 'premium';
  plan_display_name: string;
  access_level: number;
  panel_type: 'simple' | 'master';
  delivery_features: boolean;
  menu_management: boolean;
  user_management: boolean;
  system_config: boolean;
  active: boolean;
}

const AdminLevelConfig = () => {
  const [configs, setConfigs] = useState<LevelConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { isAdminMaster, isAdminDelivery } = useAuth();

  const planInfo = {
    free: { name: 'Gratuito', color: 'bg-gray-100 text-gray-800' },
    professional: { name: 'Profissional', color: 'bg-blue-100 text-blue-800' },
    premium: { name: 'Premium', color: 'bg-purple-100 text-purple-800' }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setIsLoading(true);
      
      // Buscar configurações existentes
      const { data, error } = await supabase
        .from('plan_level_configs')
        .select('*')
        .order('access_level', { ascending: true });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setConfigs(data as LevelConfig[]);
      } else {
        // Criar configurações padrão se não existirem
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
            panel_type: 'simple', // Mudado para simples como solicitado
            delivery_features: true,
            menu_management: true,
            user_management: false,
            system_config: false,
            active: true
          }
        ];

        // Inserir configurações padrão
        const { error: insertError } = await supabase
          .from('plan_level_configs')
          .insert(defaultConfigs);

        if (insertError) {
          throw insertError;
        }

        setConfigs(defaultConfigs);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações de níveis',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = (plan_name: string, field: keyof LevelConfig, value: any) => {
    setConfigs(prev => prev.map(config => 
      config.plan_name === plan_name ? { ...config, [field]: value } : config
    ));
  };

  const saveConfigs = async () => {
    try {
      setIsSaving(true);

      // Atualizar cada configuração
      for (const config of configs) {
        const { error } = await supabase
          .from('plan_level_configs')
          .upsert(config);

        if (error) {
          throw error;
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  // Verificar se é admin master para acessar esta página
  if (!isAdminMaster) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Restrito</h1>
          <p className="text-gray-600 mb-4">
            {isAdminDelivery ? "❌ Admin não consegue ver configurações de outros usuários" : "Apenas administradores master podem acessar esta página."}
          </p>
          <Button onClick={() => navigate("/admin")}>
            Voltar ao Painel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin/selector')}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Settings className="h-8 w-8 text-purple-600" />
                Configuração de Níveis e Planos
              </h1>
              <p className="mt-2 text-gray-600">
                Configure quais planos têm acesso ao painel simples ou master
              </p>
            </div>
            <Button 
              onClick={saveConfigs} 
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Informação Importante */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Info className="h-5 w-5" />
              Importante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700">
              O plano Premium (nível 3) agora fica no <strong>painel simples</strong> conforme solicitado. 
              O painel master continua com acesso total para administradores master.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {configs.map((config) => (
            <Card key={config.plan_name} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{config.plan_display_name}</CardTitle>
                  <Badge className={planInfo[config.plan_name].color}>
                    {planInfo[config.plan_name].name}
                  </Badge>
                </div>
                <CardDescription>
                  Nível {config.access_level} • Painel {config.panel_type === 'master' ? 'Master' : 'Simples'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${config.plan_name}-active`}>Plano Ativo</Label>
                  <Switch
                    id={`${config.plan_name}-active`}
                    checked={config.active}
                    onCheckedChange={(checked) => updateConfig(config.plan_name, 'active', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor={`${config.plan_name}-panel`}>Acesso ao Painel Master</Label>
                  <Switch
                    id={`${config.plan_name}-panel`}
                    checked={config.panel_type === 'master'}
                    onCheckedChange={(checked) => updateConfig(config.plan_name, 'panel_type', checked ? 'master' : 'simple')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor={`${config.plan_name}-delivery`}>Funcionalidades de Delivery</Label>
                  <Switch
                    id={`${config.plan_name}-delivery`}
                    checked={config.delivery_features}
                    onCheckedChange={(checked) => updateConfig(config.plan_name, 'delivery_features', checked)}
                    disabled={config.plan_name === 'free'}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor={`${config.plan_name}-menu`}>Gerenciamento de Cardápios</Label>
                  <Switch
                    id={`${config.plan_name}-menu`}
                    checked={config.menu_management}
                    onCheckedChange={(checked) => updateConfig(config.plan_name, 'menu_management', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor={`${config.plan_name}-users`}>Gerenciamento de Usuários</Label>
                  <Switch
                    id={`${config.plan_name}-users`}
                    checked={config.user_management}
                    onCheckedChange={(checked) => updateConfig(config.plan_name, 'user_management', checked)}
                    disabled={config.panel_type !== 'master'}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor={`${config.plan_name}-system`}>Configurações do Sistema</Label>
                  <Switch
                    id={`${config.plan_name}-system`}
                    checked={config.system_config}
                    onCheckedChange={(checked) => updateConfig(config.plan_name, 'system_config', checked)}
                    disabled={config.panel_type !== 'master'}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminLevelConfig;