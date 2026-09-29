import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Only the public URL and anon key of the migrated project are exposed; never the service role key.
  return {
  define: {
    "import.meta.env.VITE_TARGET_SUPABASE_URL": JSON.stringify(env.NEW_SUPABASE_URL ?? ""),
    "import.meta.env.VITE_TARGET_SUPABASE_ANON_KEY": JSON.stringify(env.NEW_SUPABASE_ANON_KEY ?? ""),
  },
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
