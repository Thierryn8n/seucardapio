import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = new URLSearchParams(window.location.search).get("code");
    const finish = (ok: boolean) => (ok ? navigate("/admin/selector", { replace: true }) : setError("Link inválido ou expirado. Faça login novamente."));
    if (!code) {
      supabase.auth.getSession().then(({ data }) => finish(!!data.session));
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => finish(!error));
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-center">
      <p className="text-muted-foreground">{error ?? "Confirmando sua conta..."}</p>
    </main>
  );
}
