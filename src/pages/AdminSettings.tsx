import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Palette, Type, Calendar, Heart, Image, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { settings, isLoading, updateSettings } = useSettings();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

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

      updateSettings({
        [type === "logo" ? "logo_url" : "favicon_url"]: publicUrl,
      });

      toast({
        title: "Imagem enviada",
        description: `${type === "logo" ? "Logo" : "Favicon"} atualizado com sucesso.`,
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
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Cores do Sistema
              </CardTitle>
              <CardDescription>
                Personalize as cores do tema com seletores visuais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Cor Primária</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={`#${formData.primary_color.split(' ').map((v, i) => {
                        const num = parseFloat(v.replace('%', ''));
                        if (i === 0) return Math.round(num * 255 / 360).toString(16).padStart(2, '0');
                        if (i === 1) return Math.round(num * 255 / 100).toString(16).padStart(2, '0');
                        return Math.round(num * 255 / 100).toString(16).padStart(2, '0');
                      }).join('')}`}
                      onChange={(e) => {
                        const hex = e.target.value.replace('#', '');
                        const r = parseInt(hex.substr(0, 2), 16);
                        const g = parseInt(hex.substr(2, 2), 16);
                        const b = parseInt(hex.substr(4, 2), 16);
                        const h = Math.round(Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI);
                        const s = Math.round(Math.sqrt(3) * Math.abs(g - b) / (r + g + b) * 100);
                        const l = Math.round((r + g + b) / 7.65);
                        setFormData({ ...formData, primary_color: `${h} ${s}% ${l}%` });
                      }}
                      className="w-16 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      id="primary_color"
                      value={formData.primary_color}
                      onChange={(e) =>
                        setFormData({ ...formData, primary_color: e.target.value })
                      }
                      placeholder="20 85% 55%"
                      className="flex-1"
                    />
                  </div>
                  <div 
                    className="w-full h-12 rounded-lg border shadow-sm"
                    style={{ backgroundColor: `hsl(${formData.primary_color})` }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Cor Secundária</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={`#${formData.secondary_color.split(' ').map((v, i) => {
                        const num = parseFloat(v.replace('%', ''));
                        if (i === 0) return Math.round(num * 255 / 360).toString(16).padStart(2, '0');
                        if (i === 1) return Math.round(num * 255 / 100).toString(16).padStart(2, '0');
                        return Math.round(num * 255 / 100).toString(16).padStart(2, '0');
                      }).join('')}`}
                      onChange={(e) => {
                        const hex = e.target.value.replace('#', '');
                        const r = parseInt(hex.substr(0, 2), 16);
                        const g = parseInt(hex.substr(2, 2), 16);
                        const b = parseInt(hex.substr(4, 2), 16);
                        const h = Math.round(Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI);
                        const s = Math.round(Math.sqrt(3) * Math.abs(g - b) / (r + g + b) * 100);
                        const l = Math.round((r + g + b) / 7.65);
                        setFormData({ ...formData, secondary_color: `${h} ${s}% ${l}%` });
                      }}
                      className="w-16 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      id="secondary_color"
                      value={formData.secondary_color}
                      onChange={(e) =>
                        setFormData({ ...formData, secondary_color: e.target.value })
                      }
                      placeholder="140 45% 50%"
                      className="flex-1"
                    />
                  </div>
                  <div 
                    className="w-full h-12 rounded-lg border shadow-sm"
                    style={{ backgroundColor: `hsl(${formData.secondary_color})` }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accent_color">Cor de Destaque</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={`#${formData.accent_color.split(' ').map((v, i) => {
                        const num = parseFloat(v.replace('%', ''));
                        if (i === 0) return Math.round(num * 255 / 360).toString(16).padStart(2, '0');
                        if (i === 1) return Math.round(num * 255 / 100).toString(16).padStart(2, '0');
                        return Math.round(num * 255 / 100).toString(16).padStart(2, '0');
                      }).join('')}`}
                      onChange={(e) => {
                        const hex = e.target.value.replace('#', '');
                        const r = parseInt(hex.substr(0, 2), 16);
                        const g = parseInt(hex.substr(2, 2), 16);
                        const b = parseInt(hex.substr(4, 2), 16);
                        const h = Math.round(Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI);
                        const s = Math.round(Math.sqrt(3) * Math.abs(g - b) / (r + g + b) * 100);
                        const l = Math.round((r + g + b) / 7.65);
                        setFormData({ ...formData, accent_color: `${h} ${s}% ${l}%` });
                      }}
                      className="w-16 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      id="accent_color"
                      value={formData.accent_color}
                      onChange={(e) =>
                        setFormData({ ...formData, accent_color: e.target.value })
                      }
                      placeholder="15 90% 60%"
                      className="flex-1"
                    />
                  </div>
                  <div 
                    className="w-full h-12 rounded-lg border shadow-sm"
                    style={{ backgroundColor: `hsl(${formData.accent_color})` }}
                  />
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
