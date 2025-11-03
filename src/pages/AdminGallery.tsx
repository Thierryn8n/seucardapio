import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client.ts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminGallery = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const { data: images, refetch } = useQuery({
    queryKey: ["gallery-images", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data: menus } = await supabase
        .from("menus")
        .select("image_url")
        .eq("user_id", user.id)
        .not("image_url", "is", null);
      
      return menus?.map(m => m.image_url).filter(Boolean) || [];
    },
    enabled: !!user?.id,
  });

  const handleDelete = async (imageUrl: string) => {
    try {
      const fileName = imageUrl.split("/").pop();
      if (!fileName) return;

      const { error } = await supabase.storage
        .from("menu-images")
        .remove([fileName]);

      if (error) throw error;

      await supabase
        .from("menus")
        .update({ image_url: null })
        .eq("image_url", imageUrl)
        .eq("user_id", user?.id);

      toast({
        title: "Imagem removida",
        description: "A imagem foi removida da galeria.",
      });
      
      refetch();
    } catch (error) {
      console.error("Error deleting image:", error);
      toast({
        title: "Erro ao remover imagem",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Acesso negado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin/menus")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold">Galeria de Imagens</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images?.map((imageUrl, index) => (
            <Card key={index} className="overflow-hidden group relative">
              <CardContent className="p-0">
                <img
                  src={imageUrl}
                  alt={`Gallery ${index}`}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(imageUrl)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {(!images || images.length === 0) && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma imagem na galeria</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminGallery;
