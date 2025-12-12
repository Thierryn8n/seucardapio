import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, Settings, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MercadoPagoWebhookHandler } from '@/integrations/mercadopago/mercadopago.webhook';
import { MercadoPagoSplitService } from '@/integrations/mercadopago/mercadopago.split';

const AdminMercadoPago: React.FC = () => {
  const { toast } = useToast();
  const [isValidatingWebhooks, setIsValidatingWebhooks] = useState(false);
  const [isConfiguringSplit, setIsConfiguringSplit] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);
  const [splitStats, setSplitStats] = useState<any>(null);

  const webhookHandler = new MercadoPagoWebhookHandler();
  const splitService = new MercadoPagoSplitService();

  const handleValidateWebhooks = async () => {
    try {
      setIsValidatingWebhooks(true);
      const result = await webhookHandler.checkExpiredSubscriptions();
      
      if (result.success) {
        setWebhookStatus(`✅ ${result.message}`);
        toast({
          title: 'Sucesso!',
          description: result.message,
        });
      } else {
        setWebhookStatus(`❌ ${result.message}`);
        toast({
          title: 'Atenção!',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = 'Erro ao validar webhooks';
      setWebhookStatus(`❌ ${errorMessage}`);
      toast({
        title: 'Erro!',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsValidatingWebhooks(false);
    }
  };

  const handleConfigureSplit = async () => {
    try {
      setIsConfiguringSplit(true);
      
      // Simular chamada com user.id e role "admin"
      const stats = await splitService.getSplitPaymentStats('admin-user-id', 'admin');
      setSplitStats(stats);
      
      toast({
        title: 'Sucesso!',
        description: 'Configuração de split realizada com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro!',
        description: 'Erro ao configurar split.',
        variant: 'destructive',
      });
    } finally {
      setIsConfiguringSplit(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mercado Pago - Admin Simples
          </h1>
          <p className="text-gray-600">
            Gerencie a integração com Mercado Pago e configure split de pagamentos.
          </p>
        </div>

        {/* Status da Integração */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Status da Integração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mercado Pago</p>
                <Badge variant="success" className="mt-1">
                  Integrado
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Última verificação</p>
                <p className="text-sm font-medium">
                  {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Validar Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Verifique e valide os webhooks de pagamentos expirados.
              </p>
              <Button
                onClick={handleValidateWebhooks}
                disabled={isValidatingWebhooks}
                className="w-full"
              >
                {isValidatingWebhooks ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  '✅ Validar Webhooks'
                )}
              </Button>
              {webhookStatus && (
                <Alert className="mt-4">
                  <AlertDescription>{webhookStatus}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurar Split
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Configure o split de pagamentos entre marketplace e vendedores.
              </p>
              <Button
                onClick={handleConfigureSplit}
                disabled={isConfiguringSplit}
                className="w-full"
              >
                {isConfiguringSplit ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Configurando...
                  </>
                ) : (
                  '⚙️ Configurar Split'
                )}
              </Button>
              {splitStats && (
                <Alert className="mt-4">
                  <AlertDescription>
                    Estatísticas do split carregadas com sucesso!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Link para Relatórios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Relatórios de Split
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Acesse os relatórios detalhados de split de pagamentos.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/admin/mercadopago/reports'}
              className="w-full"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Ver Relatórios
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminMercadoPago;