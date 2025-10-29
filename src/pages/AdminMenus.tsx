import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Plus, Download, Link2, Copy, Image, Upload, Share2 } from "lucide-react";
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

  const exportMenusAsText = (weekStart?: string) => {
    const menusToExport = weekStart 
      ? menus?.filter(m => m.week_start_date === weekStart)
      : menus;
    
    const text = menusToExport?.map(m => 
      `${mealLabels[m.meal_number - 1]} - ${weekDays[m.day_of_week]}\n${m.meal_name}\n${m.description || ""}\n\n`
    ).join("");
    
    const blob = new Blob([text || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cardapio_${weekStart || "todos"}.txt`;
    a.click();
    
    toast({
      title: "Arquivo baixado",
      description: "Cardápio exportado como TXT.",
    });
  };

  const shareWhatsApp = (weekStart?: string) => {
    const menusToShare = weekStart 
      ? menus?.filter(m => m.week_start_date === weekStart)
      : menus;
    
    const text = menusToShare?.map(m => 
      `*${mealLabels[m.meal_number - 1]} - ${weekDays[m.day_of_week]}*\n${m.meal_name}\n${m.description || ""}`
    ).join("\n\n");
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text || "")}`;
    window.open(whatsappUrl, "_blank");
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shareWhatsApp()}
                  className="gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  WhatsApp
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
                      variant="outline"
                      size="sm"
                      onClick={() => exportMenusAsText(menu.week_start_date)}
                      title="Baixar TXT"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareWhatsApp(menu.week_start_date)}
                      title="WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
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
    </div>
  );
};

export default AdminMenus;
