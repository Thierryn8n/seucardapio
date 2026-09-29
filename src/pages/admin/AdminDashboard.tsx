import { AdminShell } from "@/components/admin-shell/AdminShell";
import { PlatformOverview } from "@/components/admin-shell/PlatformOverview";

const AdminDashboard = () => (
  <AdminShell title="Visão geral" subtitle="Tudo o que acontece na plataforma hoje">
    <PlatformOverview />
  </AdminShell>
);

export default AdminDashboard;
