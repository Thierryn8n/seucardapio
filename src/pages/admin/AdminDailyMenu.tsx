import { ClipboardList, ExternalLink, Soup, Store, UtensilsCrossed } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { AdminShell, useStorePath } from "@/components/admin-shell/AdminShell";
import { OrdersBoard } from "@/components/admin-daily/OrdersBoard";
import { MenuEditor } from "@/components/admin-daily/MenuEditor";
import { SizesEditor } from "@/components/admin-daily/SizesEditor";
import { StoreSettings } from "@/components/admin-daily/StoreSettings";

const TABS = [
  { value: "orders", label: "Pedidos", icon: ClipboardList },
  { value: "menu", label: "Cardápio", icon: UtensilsCrossed },
  { value: "sizes", label: "Marmitas", icon: Soup },
  { value: "settings", label: "Loja", icon: Store },
];

export default function AdminDailyMenu() {
  const { user } = useAuth();
  const storePath = useStorePath();
  if (!user) return null;

  return (
    <AdminShell
      title="Cardápio do dia"
      subtitle="Pedidos, itens e configurações da loja"
      actions={
        <a
          href={storePath}
          target="_blank"
          rel="noopener noreferrer"
          className="skeuo-raised skeuo-press flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Ver como cliente</span>
        </a>
      }
    >
      <Tabs defaultValue="orders" className="mx-auto flex max-w-6xl flex-col gap-6">
        <TabsList className="skeuo-inset h-auto flex-wrap justify-start gap-1 self-start rounded-2xl bg-transparent p-1.5">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="gap-2 rounded-xl px-4 py-2 text-muted-foreground data-[state=active]:skeuo-primary data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="orders"><OrdersBoard userId={user.id} /></TabsContent>
        <TabsContent value="menu"><MenuEditor userId={user.id} /></TabsContent>
        <TabsContent value="sizes"><SizesEditor userId={user.id} /></TabsContent>
        <TabsContent value="settings"><StoreSettings userId={user.id} /></TabsContent>
      </Tabs>
    </AdminShell>
  );
}
