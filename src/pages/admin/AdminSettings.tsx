import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useSettings, type Settings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Palette, Type, Calendar, Heart, Image, Loader2, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { extractPaletteFromImage, hexToHslString, hslStringToHex } from "@/lib/color-utils";

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hslStringToHex(value || "0 0% 50%")}
          onChange={(e) => onChange(hexToHslString(e.target.value))}
          className="h-10 w-16 shrink-0 cursor-pointer rounded border"
          aria-label={`Selecionar ${label}`}
        />
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="20 85% 55%" className="flex-1" />
      </div>
      <div className="h-12 w-full rounded-lg border shadow-sm" style={{ backgroundColor: `hsl(${value})` }} />
    </div>
  );
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { isMasterAdmin, isProfileAdmin, isLoading: isLoadingAdminStatus } = useAdminStatus();
  const isAdminMaster = isMasterAdmin;
  const isAdminDelivery = isProfileAdmin && !isMasterAdmin;
  const { settings, isLoading: isLoadingSettings, updateSettings } = useSettings();
  const isLoading = isLoadingSettings || isLoadingAdminStatus;
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    if (!user) navigate("/auth");
    if (!isAdmin) navigate("/admin");
  }, [user, isAdmin, navigate]);

  const [formData, setFormData] = useState({
    company_name: "",
    logo_size: 150,
    primary_color: "",
    secondary_color: "",
    accent_color: "",
    show_company_name: true,
    menu_background_color: "",
    menu_foreground_color: "",
    menu_card_color: "",
    title_font: "",
    body_font: "",
    show_sunday: false,
    show_monday: true,
    show_tuesday: true,
    show_wednesday: true,
    show_thursday: true,
    show_friday: true,
    show_saturday: false,
    donation_enabled: false,
    donation_url: "",
    donation_text: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name,
        logo_size: settings.logo_size || 150,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        accent_color: settings.accent_color,
        show_company_name: settings.show_company_name ?? true,
        menu_background_color: settings.menu_background_color || "30 25% 98%",
        menu_foreground_color: settings.menu_foreground_color || "25 30% 15%",
        menu_card_color: settings.menu_card_color || "0 0% 100%",
        title_font: settings.title_font,
        body_font: settings.body_font,
        show_sunday: settings.show_sunday,
        show_monday: settings.show_monday,
        show_tuesday: settings.show_tuesday,
        show_wednesday: settings.show_wednesday,
        show_thursday: settings.show_thursday,
        show_friday: settings.show_friday,
        show_saturday: settings.show_saturday,
        donation_enabled: settings.donation_enabled,
        donation_url: settings.donation_url || "",
        donation_text: settings.donation_text,
      });
    }
  }, [settings]);

  const handleImageUpload = async (file: File, type: "logo" | "favicon") => {
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("menu-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("menu-images")
        .getPublicUrl(filePath);

      const updates: Partial<Settings> = {
        [type === "logo" ? "logo_url" : "favicon_url"]: publicUrl,
      };

      let paletteGenerated = false;
      if (type === "logo") {
        try {
          const palette = await extractPaletteFromImage(publicUrl);
          Object.assign(updates, {
            primary_color: palette.primary,
            secondary_color: palette.secondary,
            accent_color: palette.accent,
            menu_background_color: palette.background,
            menu_foreground_color: palette.foreground,
            menu_card_color: palette.card,
          });
          setFormData((prev) => ({
            ...prev,
            primary_color: palette.primary,
            secondary_color: palette.secondary,
            accent_color: palette.accent,
            menu_background_color: palette.background,
            menu_foreground_color: palette.foreground,
            menu_card_color: palette.card,
          }));
          paletteGenerated = true;
        } catch {
          // Extração de paleta é best-effort; mantém as cores atuais se falhar.
        }
      }

      updateSettings(updates);

      toast({
        title: "Imagem enviada",
        description:
          type === "logo"
            ? paletteGenerated
              ? "Logo atualizada e paleta de cores gerada automaticamente a partir dela."
              : "Logo atualizada com sucesso."
            : "Favicon atualizado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleExtractPalette = async () => {
    if (!settings?.logo_url) return;
    setExtracting(true);
    try {
      const palette = await extractPaletteFromImage(settings.logo_url);
      setFormData((prev) => ({
        ...prev,
        primary_color: palette.primary,
        secondary_color: palette.secondary,
        accent_color: palette.accent,
        menu_background_color: palette.background,
        menu_foreground_color: palette.foreground,
        menu_card_color: palette.card,
      }));
      toast({
        title: "Paleta extraída da logo",
        description: "Revise as cores geradas e clique em Salvar Configurações para aplicar.",
      });
    } catch (error: any) {
      toast({
        title: "Não foi possível extrair a paleta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Verificar se é admin master para acessar esta página
  if (!isAdminMaster) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-4">
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
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <h1 className="text-4xl font-bold text-foreground mb-8">
          Configurações do Sistema
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Informações da Empresa
              </CardTitle>
              <CardDescription>
                Configure o nome e identidade visual da empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="company_name">Nome da Empresa</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                  placeholder="Nome da sua empresa"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logo">Logo</Label>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, "logo");
                    }}
                    disabled={uploading}
                  />
                  {settings?.logo_url && (
                    <img
                      src={settings.logo_url}
                      alt="Logo"
                      className="mt-2 w-full h-auto object-contain"
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="favicon">Favicon</Label>
                  <Input
                    id="favicon"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, "favicon");
                    }}
                    disabled={uploading}
                  />
                  {settings?.favicon_url && (
                    <img
                      src={settings.favicon_url}
                      alt="Favicon"
                      className="mt-2 h-8 object-contain"
                    />
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="logo_size">Tamanho da Logo (px)</Label>
                <Input
                  id="logo_size"
                  type="number"
                  min="50"
                  max="500"
                  value={formData.logo_size}
                  onChange={(e) =>
                    setFormData({ ...formData, logo_size: parseInt(e.target.value) || 150 })
                  }
                  placeholder="150"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Defina o tamanho da logo em pixels (50-500px)
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="show_company_name">Mostrar nome da empresa no cardápio</Label>
                  <p className="text-xs text-muted-foreground">
                    Desative se o nome já aparece na sua logo, para não duplicar a informação.
                  </p>
                </div>
                <Switch
                  id="show_company_name"
                  checked={formData.show_company_name}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, show_company_name: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Cores do Cardápio
              </CardTitle>
              <CardDescription>
                Personalize todas as cores do painel e do cardápio, ou gere uma paleta automaticamente a partir da sua logo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleExtractPalette}
                disabled={!settings?.logo_url || extracting}
                className="gap-2"
              >
                {extracting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Extrair paleta da logo
              </Button>
              {!settings?.logo_url && (
                <p className="text-xs text-muted-foreground">
                  Envie uma logo acima para poder gerar a paleta automaticamente.
                </p>
              )}

              <div>
                <h4 className="mb-3 text-sm font-semibold text-foreground">Cores da marca</h4>
                <div className="grid md:grid-cols-3 gap-6">
                  <ColorField
                    id="primary_color"
                    label="Cor Primária"
                    value={formData.primary_color}
                    onChange={(v) => setFormData({ ...formData, primary_color: v })}
                  />
                  <ColorField
                    id="secondary_color"
                    label="Cor Secundária"
                    value={formData.secondary_color}
                    onChange={(v) => setFormData({ ...formData, secondary_color: v })}
                  />
                  <ColorField
                    id="accent_color"
                    label="Cor de Destaque"
                    value={formData.accent_color}
                    onChange={(v) => setFormData({ ...formData, accent_color: v })}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="mb-3 text-sm font-semibold text-foreground">Cores da página do cardápio</h4>
                <div className="grid md:grid-cols-3 gap-6">
                  <ColorField
                    id="menu_background_color"
                    label="Fundo"
                    value={formData.menu_background_color}
                    onChange={(v) => setFormData({ ...formData, menu_background_color: v })}
                  />
                  <ColorField
                    id="menu_foreground_color"
                    label="Texto"
                    value={formData.menu_foreground_color}
                    onChange={(v) => setFormData({ ...formData, menu_foreground_color: v })}
                  />
                  <ColorField
                    id="menu_card_color"
                    label="Cartões"
                    value={formData.menu_card_color}
                    onChange={(v) => setFormData({ ...formData, menu_card_color: v })}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="mb-3 text-sm font-semibold text-foreground">Pré-visualização</h4>
                <div
                  className="rounded-xl border p-4 transition-colors"
                  style={{
                    backgroundColor: `hsl(${formData.menu_background_color})`,
                    color: `hsl(${formData.menu_foreground_color})`,
                  }}
                >
                  <div
                    className="flex items-center gap-3 rounded-lg p-3 shadow-sm"
                    style={{ backgroundColor: `hsl(${formData.menu_card_color})` }}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
                      {settings?.logo_url ? (
                        <img src={settings.logo_url} alt="Prévia da logo" className="h-full w-full object-contain p-0.5" />
                      ) : (
                        <Image className="h-5 w-5 opacity-50" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0">
                      {formData.show_company_name && (
                        <p className="truncate font-semibold">{formData.company_name || "Sua Marmitaria"}</p>
                      )}
                      <p className="text-xs opacity-70">Cardápio de hoje</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    tabIndex={-1}
                    className="mt-3 w-full cursor-default rounded-full px-4 py-2 text-center text-sm font-semibold text-white shadow-sm"
                    style={{ backgroundColor: `hsl(${formData.primary_color})` }}
                  >
                    Adicionar marmita
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fonts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Fontes
              </CardTitle>
              <CardDescription>
                Configure as fontes utilizadas no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title_font">Fonte dos Títulos</Label>
                  <Input
                    id="title_font"
                    value={formData.title_font}
                    onChange={(e) =>
                      setFormData({ ...formData, title_font: e.target.value })
                    }
                    placeholder="Playfair Display"
                  />
                </div>
                <div>
                  <Label htmlFor="body_font">Fonte do Corpo</Label>
                  <Input
                    id="body_font"
                    value={formData.body_font}
                    onChange={(e) =>
                      setFormData({ ...formData, body_font: e.target.value })
                    }
                    placeholder="Poppins"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Days of Week */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Dias da Semana
              </CardTitle>
              <CardDescription>
                Selecione os dias em que há cardápio disponível
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { key: "show_sunday", label: "Domingo" },
                  { key: "show_monday", label: "Segunda" },
                  { key: "show_tuesday", label: "Terça" },
                  { key: "show_wednesday", label: "Quarta" },
                  { key: "show_thursday", label: "Quinta" },
                  { key: "show_friday", label: "Sexta" },
                  { key: "show_saturday", label: "Sábado" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between space-x-2">
                    <Label htmlFor={key}>{label}</Label>
                    <Switch
                      id={key}
                      checked={formData[key as keyof typeof formData] as boolean}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, [key]: checked })
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Donation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Doações
              </CardTitle>
              <CardDescription>
                Configure o botão de doações no rodapé
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="donation_enabled">Habilitar Doações</Label>
                <Switch
                  id="donation_enabled"
                  checked={formData.donation_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, donation_enabled: checked })
                  }
                />
              </div>

              {formData.donation_enabled && (
                <>
                  <div>
                    <Label htmlFor="donation_url">Link de Doação</Label>
                    <Input
                      id="donation_url"
                      value={formData.donation_url}
                      onChange={(e) =>
                        setFormData({ ...formData, donation_url: e.target.value })
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="donation_text">Texto do Botão</Label>
                    <Input
                      id="donation_text"
                      value={formData.donation_text}
                      onChange={(e) =>
                        setFormData({ ...formData, donation_text: e.target.value })
                      }
                      placeholder="Apoie nosso trabalho"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg">
            Salvar Configurações
          </Button>
        </form>
      </div>
    </div>
  );
}
