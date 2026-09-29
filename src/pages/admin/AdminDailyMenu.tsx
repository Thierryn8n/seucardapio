import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/db";
import { OrdersBoard } from "@/components/admin-daily/OrdersBoard";
import { MenuEditor } from "@/components/admin-daily/MenuEditor";
import { SizesEditor } from "@/components/admin-daily/SizesEditor";
import { StoreSettings } from "@/components/admin-daily/StoreSettings";

export default function AdminDailyMenu() {
  const { user } = useAuth();
  const { data: slug } = useQuery({
    queryKey: ["my-slug", user?.id],
    enabled: !!user,
    queryFn: async () => (await db.from("profiles").select("slug").eq("id", user!.id).maybeSingle()).data?.slug as string | null,
  });
  if (!user) return null;
  const publicPath = `/${slug || user.id}/cardapio`;

  return (
    <div className="min-h-screen bg-background font-poppins text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" aria-label="Voltar"><Link to="/admin"><ArrowLeft className="h-5 w-5" /></Link></Button>
            <h1 className="font-playfair text-2xl font-bold">Cardápio do dia</h1>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <a href={publicPath} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" aria-hidden />Ver como cliente</a>
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="orders" className="flex flex-col gap-6">
          <TabsList className="self-start">
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="menu">Cardápio</TabsTrigger>
            <TabsTrigger value="sizes">Marmitas</TabsTrigger>
            <TabsTrigger value="settings">Loja</TabsTrigger>
          </TabsList>
          <TabsContent value="orders"><OrdersBoard userId={user.id} /></TabsContent>
          <TabsContent value="menu"><MenuEditor userId={user.id} /></TabsContent>
          <TabsContent value="sizes"><SizesEditor userId={user.id} /></TabsContent>
          <TabsContent value="settings"><StoreSettings userId={user.id} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
