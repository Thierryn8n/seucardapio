import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek } from "date-fns";

const mealLabels = ["Café da Manhã", "Almoço", "Lanche", "Jantar"];
const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const AdminMenuForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [weekStartDate, setWeekStartDate] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [mealNumber, setMealNumber] = useState("");
  const [mealName, setMealName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/admin");
    }
  }, [user, isAdmin, loading, navigate]);

  const { data: menu } = useQuery({
    queryKey: ["menu", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isEdit && !!user && isAdmin,
  });

  useEffect(() => {
    if (menu) {
      setWeekStartDate(menu.week_start_date);
      setDayOfWeek(menu.day_of_week.toString());
      setMealNumber(menu.meal_number.toString());
      setMealName(menu.meal_name);
      setDescription(menu.description || "");
      setExistingImageUrl(menu.image_url || "");
    }
  }, [menu]);

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async (e: React.FormEvent) => {
      e.preventDefault();
      setUploading(true);

      let imageUrl = existingImageUrl;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const menuData = {
        week_start_date: weekStartDate,
        day_of_week: parseInt(dayOfWeek),
        meal_number: parseInt(mealNumber),
        meal_name: mealName,
        description: description || null,
        image_url: imageUrl || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("menus")
          .update(menuData)
          .eq("id", id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("menus")
          .insert([menuData]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
      queryClient.invalidateQueries({ queryKey: ["menus"] });
      toast({
        title: isEdit ? "Cardápio atualizado" : "Cardápio criado",
        description: "As alterações foram salvas com sucesso.",
      });
      navigate("/admin/menus");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  if (loading) {
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
          <Link to="/admin/menus">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{isEdit ? "Editar Cardápio" : "Novo Cardápio"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => saveMutation.mutate(e)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="weekStartDate">Início da Semana</Label>
                <Input
                  id="weekStartDate"
                  type="date"
                  value={weekStartDate}
                  onChange={(e) => setWeekStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dayOfWeek">Dia da Semana</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {weekDays.map((day, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mealNumber">Refeição</Label>
                  <Select value={mealNumber} onValueChange={setMealNumber} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mealLabels.map((meal, index) => (
                        <SelectItem key={index} value={(index + 1).toString()}>
                          {meal}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mealName">Nome do Prato</Label>
                <Input
                  id="mealName"
                  type="text"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  placeholder="Ex: Arroz, Feijão, Bife Grelhado"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva os ingredientes ou detalhes do prato"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Imagem do Prato (opcional)</Label>
                {existingImageUrl && !imageFile && (
                  <div className="relative">
                    <img
                      src={existingImageUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => setExistingImageUrl("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {imageFile && (
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => setImageFile(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {!existingImageUrl && !imageFile && (
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="image"
                      className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Clique para fazer upload</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG ou WEBP (MAX. 5MB)
                        </p>
                      </div>
                      <Input
                        id="image"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setImageFile(file);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/admin/menus")}
                  disabled={uploading}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={uploading}>
                  {uploading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminMenuForm;
