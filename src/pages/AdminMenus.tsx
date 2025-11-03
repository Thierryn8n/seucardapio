import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Plus, Download, Link2, Copy, Image, Upload, Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Menu {
  id: string;
  week_start_date: string;
  day_of_week: number;
  meal_number: number;
  meal_name: string;
  description: string;
  image_url: string;
}

const mealLabels = ["Café da Manhã", "Almoço", "Lanche", "Jantar"];
const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const AdminMenus = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [showTranscribeDialog, setShowTranscribeDialog] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/admin");
    }
  }, [user, isAdmin, loading, navigate]);

  const { data: menus, isLoading: menusLoading } = useQuery({
    queryKey: ["admin-menus", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .eq("user_id", user?.id)
        .order("week_start_date", { ascending: false })
        .order("day_of_week")
        .order("meal_number");

      if (error) throw error;
      return data as Menu[];
    },
    enabled: !!user && isAdmin,
  });

  const duplicateMutation = useMutation({
    mutationFn: async (menuId: string) => {
      const menuToDuplicate = menus?.find(m => m.id === menuId);
      if (!menuToDuplicate) throw new Error("Menu not found");

      const { error } = await supabase.from("menus").insert({
        user_id: user?.id,
        week_start_date: menuToDuplicate.week_start_date,
        day_of_week: menuToDuplicate.day_of_week,
        meal_number: menuToDuplicate.meal_number,
        meal_name: menuToDuplicate.meal_name,
        description: menuToDuplicate.description,
        image_url: menuToDuplicate.image_url,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
      toast({
        title: "Menu duplicado",
        description: "O menu foi duplicado com sucesso.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("menus")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
      setDeleteId(null);
      toast({
        title: "Cardápio excluído",
        description: "O cardápio foi excluído com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportToCSV = () => {
    if (!menus || menus.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Adicione cardápios antes de exportar.",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Semana", "Dia", "Refeição", "Nome do Prato", "Descrição", "Link da Imagem"];
    const rows = menus.map(menu => [
      format(new Date(menu.week_start_date), "dd/MM/yyyy"),
      weekDays[menu.day_of_week],
      mealLabels[menu.meal_number - 1],
      menu.meal_name,
      menu.description || "",
      menu.image_url || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `cardapios_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Exportação concluída",
      description: "Arquivo CSV baixado com sucesso.",
    });
  };

  const copyPublicLink = () => {
    const publicLink = `${window.location.origin}/${user?.id}/cardapio`;
    navigator.clipboard.writeText(publicLink);
    toast({
      title: "Link copiado!",
      description: "O link público foi copiado para a área de transferência.",
    });
  };

  const downloadCSVTemplate = () => {
    const headers = ["data_inicio_semana", "dia_da_semana", "numero_refeicao", "nome_refeicao", "descricao", "url_imagem"];
    const example = ["2025-01-27", "1", "1", "Arroz com Feijão", "Prato tradicional brasileiro", "https://exemplo.com/imagem.jpg"];
    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "exemplo_cardapio.csv";
    a.click();
    toast({
      title: "Template baixado",
      description: "Arquivo de exemplo baixado com sucesso.",
    });
  };

  const handleImportCSV = async (file: File) => {
    if (!user?.id) return;

    try {
      const text = await file.text();
      const lines = text.split("\n").slice(1);
      
      const menusToInsert = lines
        .filter(line => line.trim())
        .map(line => {
          const [week_start_date, day_of_week, meal_number, meal_name, description, image_url] = line.split(",");
          return {
            user_id: user.id,
            week_start_date: week_start_date.trim(),
            day_of_week: parseInt(day_of_week.trim()),
            meal_number: parseInt(meal_number.trim()),
            meal_name: meal_name.trim(),
            description: description?.trim() || null,
            image_url: image_url?.trim() || null,
          };
        });

      const { error } = await supabase.from("menus").insert(menusToInsert);
      
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
      toast({
        title: "Cardápios importados",
        description: `${menusToInsert.length} cardápios foram importados com sucesso.`,
      });
    } catch (error: any) {
      console.error("Error importing CSV:", error);
      toast({
        title: "Erro ao importar",
        description: "Verifique o formato do arquivo CSV.",
        variant: "destructive",
      });
    }
  };

  const handleTranscribeImage = async (file: File) => {
    if (!user?.id) return;
    
    setTranscribing(true);
    
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      await new Promise((resolve) => {
        reader.onload = resolve;
      });
      
      const imageBase64 = reader.result as string;
      setImagePreview(imageBase64);

      // Call edge function to transcribe
      const { data, error } = await supabase.functions.invoke('transcribe-menu', {
        body: { imageBase64 }
      });

      if (error) throw error;

      if (!data || !data.weekStartDate || !data.menus) {
        throw new Error('Dados inválidos retornados pela IA');
      }

      // Insert menus into database
      const menusToInsert = data.menus.map((menu: any) => ({
        user_id: user.id,
        week_start_date: data.weekStartDate,
        day_of_week: menu.dayOfWeek,
        meal_number: menu.mealNumber,
        meal_name: menu.mealName,
        description: menu.description || null,
        image_url: null,
      }));

      const { error: insertError } = await supabase.from("menus").insert(menusToInsert);
      
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
      
      toast({
        title: "Cardápio transcrito com sucesso!",
        description: `${menusToInsert.length} refeições foram adicionadas.`,
      });
      
      setShowTranscribeDialog(false);
      setImagePreview(null);
    } catch (error: any) {
      console.error("Error transcribing image:", error);
      toast({
        title: "Erro ao transcrever",
        description: error.message || "Não foi possível processar a imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setTranscribing(false);
    }
  };

  if (loading || menusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </Button>
                </Link>
                <h1 className="text-2xl font-bold">Gerenciar Cardápios</h1>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowTranscribeDialog(true)}
                  className="gap-2 bg-gradient-to-r from-primary to-accent"
                >
                  <Camera className="w-4 h-4" />
                  Transcrever Foto
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin/gallery")}
                  className="gap-2"
                >
                  <Image className="w-4 h-4" />
                  Galeria
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPublicLink}
                  className="gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  Copiar Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadCSVTemplate}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exemplo CSV
                </Button>
                <label>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportCSV(file);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                  >
                    <Upload className="w-4 h-4" />
                    Importar CSV
                  </Button>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </Button>
                <Link to="/admin/menus/new">
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Novo
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Link público:</span>
              <Input 
                readOnly 
                value={`${window.location.origin}/${user?.id}/cardapio`}
                className="flex-1 h-8 text-xs bg-background"
                onClick={(e) => e.currentTarget.select()}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!menus || menus.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Nenhum cardápio cadastrado ainda
              </p>
              <Link to="/admin/menus/new">
                <Button>Criar primeiro cardápio</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menus.map((menu) => (
              <Card key={menu.id} className="overflow-hidden">
                {menu.image_url && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={menu.image_url}
                      alt={menu.meal_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex gap-2 mb-2">
                    <Badge variant="outline">
                      {weekDays[menu.day_of_week]}
                    </Badge>
                    <Badge>
                      {mealLabels[menu.meal_number - 1]}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{menu.meal_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Semana de {format(new Date(menu.week_start_date), "d 'de' MMMM", { locale: ptBR })}
                  </p>
                </CardHeader>
                <CardContent>
                  {menu.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {menu.description}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateMutation.mutate(menu.id)}
                      title="Duplicar"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Link to={`/admin/menus/${menu.id}`}>
                      <Button variant="outline" size="sm" title="Editar">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(menu.id)}
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cardápio? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showTranscribeDialog} onOpenChange={setShowTranscribeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Transcrever Cardápio de Foto
            </DialogTitle>
            <DialogDescription>
              Tire uma foto ou selecione uma imagem do cardápio escrito à mão. A IA irá transcrever automaticamente todas as refeições, dias da semana e descrições.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {imagePreview && (
              <div className="rounded-lg overflow-hidden border">
                <img src={imagePreview} alt="Preview" className="w-full h-auto" />
              </div>
            )}
            
            {!transcribing ? (
              <div className="grid grid-cols-2 gap-4">
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleTranscribeImage(file);
                    }}
                  />
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => {
                      const input = document.querySelector<HTMLInputElement>('input[accept="image/*"][capture="environment"]');
                      input?.click();
                    }}
                  >
                    <Camera className="w-4 h-4" />
                    Tirar Foto
                  </Button>
                </label>
                
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleTranscribeImage(file);
                    }}
                  />
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => {
                      const input = document.querySelectorAll<HTMLInputElement>('input[accept="image/*"]')[1];
                      input?.click();
                    }}
                  >
                    <Image className="w-4 h-4" />
                    Escolher da Galeria
                  </Button>
                </label>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-muted-foreground text-center">
                  Analisando imagem e transcrevendo cardápio...<br />
                  <span className="text-xs">Isso pode levar alguns segundos</span>
                </p>
              </div>
            )}

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">💡 Dicas para melhor resultado:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Certifique-se de que o texto está legível e bem iluminado</li>
                <li>Evite sombras e reflexos na imagem</li>
                <li>Tire a foto de forma que todo o cardápio esteja visível</li>
                <li>A IA reconhece dias da semana, refeições e descrições automaticamente</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMenus;
