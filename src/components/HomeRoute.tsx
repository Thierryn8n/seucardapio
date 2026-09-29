import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Landing from "@/pages/Landing";

export default function HomeRoute() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Carregando">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user && params.get("home") === null) return <Navigate to="/admin/selector" replace />;

  return <Landing />;
}
