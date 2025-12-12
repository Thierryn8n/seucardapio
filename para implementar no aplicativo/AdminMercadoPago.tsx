import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMercadoPago } from "@/hooks/useMercadoPago";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, CreditCard, CheckCircle2, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const AdminMercadoPago = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { settings, isLoading, createSettings, updateSettings, hasSettings } = useMercadoPago();

  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (settings) {
      setAccessToken(settings.access_token);
      setPublicKey(settings.public_key || "");
      setWebhookSecret(settings.webhook_secret || "");
      setActive(settings.active);
    }
  }, [settings]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      access_token: accessToken,
      public_key: publicKey || undefined,
      webhook_secret: webhookSecret || undefined,
      active,
    };

    if (hasSettings) {
      updateSettings(data);
    } else {
      createSettings(data);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Configuração Mercado Pago
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure suas chaves para receber pagamentos via PIX e cartão
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Status da Integração
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {hasSettings && active ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-green-500 font-medium">Ativo - Recebendo Pagamentos</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Inativo - Configure suas chaves</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Configuration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Chaves de Acesso</CardTitle>
              <CardDescription>
                Insira suas chaves do Mercado Pago. Todas as vendas cairão diretamente na sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="accessToken">Access Token *</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    placeholder="APP_USR-..."
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Token de acesso para processar pagamentos
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="publicKey">Public Key (Opcional)</Label>
                  <Input
                    id="publicKey"
                    type="text"
                    placeholder="APP_USR-..."
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Chave pública para checkout transparente
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookSecret">Webhook Secret (Opcional)</Label>
                  <Input
                    id="webhookSecret"
                    type="password"
                    placeholder="Seu secret para validar webhooks"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Secret para validar notificações de pagamento
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Integração Ativa</Label>
                    <p className="text-xs text-muted-foreground">
                      Desative para pausar o recebimento de pagamentos
                    </p>
                  </div>
                  <Switch
                    checked={active}
                    onCheckedChange={setActive}
                  />
                </div>

                <Button type="submit" className="w-full">
                  {hasSettings ? "Atualizar Configurações" : "Salvar Configurações"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Instructions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Como obter suas chaves?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal list-inside space-y-2">
                <li>Acesse o painel do Mercado Pago</li>
                <li>Vá em "Configurações" → "Credenciais"</li>
                <li>Copie suas credenciais de produção (ou teste para homologação)</li>
                <li>Cole o Access Token no campo acima</li>
                <li>Salve e comece a receber pagamentos!</li>
              </ol>
              <p className="text-muted-foreground mt-4">
                ⚠️ Importante: Guarde suas chaves com segurança. Nunca compartilhe com terceiros.
              </p>
            </CardContent>
          </Card>

          {/* Transactions Section */}
          {hasSettings && (
            <Card>
              <CardHeader>
                <CardTitle>Suas Transações</CardTitle>
                <CardDescription>
                  Visualize e gerencie seus pedidos e pagamentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => navigate("/admin/dashboard")}>
                  Ver Dashboard de Vendas
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMercadoPago;
