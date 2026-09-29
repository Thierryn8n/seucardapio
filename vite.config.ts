import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Dev-only: runs the Vercel-style /api/*.ts serverless handlers inside the Vite dev
// server so they work in the preview too, not only after deployment.
function apiDevMiddleware(env: Record<string, string>): Plugin {
  const routes: Record<string, string> = {
    "/api/parse-menu-photo": "/api/parse-menu-photo.ts",
    "/api/generate-food-image": "/api/generate-food-image.ts",
  };
  return {
    name: "vercel-api-dev-middleware",
    configureServer(server) {
      for (const key of Object.keys(env)) if (process.env[key] === undefined) process.env[key] = env[key];
      for (const [route, file] of Object.entries(routes)) {
        server.middlewares.use(route, async (req: any, res: any) => {
          if (req.method !== "POST") { res.statusCode = 405; res.end("Method not allowed"); return; }
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(chunk as Buffer);
            req.body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
            const mod = await server.ssrLoadModule(file);
            const resLike = {
              status(code: number) { res.statusCode = code; return this; },
              json(payload: unknown) {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(payload));
              },
            };
            await mod.default(req, resLike);
          } catch (e: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: e?.message || "Internal error" }));
          }
        });
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Only the public URL and anon key of the migrated project are exposed; never the service role key.
  return {
  define: {
    "import.meta.env.VITE_TARGET_SUPABASE_URL": JSON.stringify(env.NEW_SUPABASE_URL ?? ""),
    "import.meta.env.VITE_TARGET_SUPABASE_ANON_KEY": JSON.stringify(env.NEW_SUPABASE_ANON_KEY ?? ""),
  },
  envPrefix: ["VITE_"],
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
  },
  plugins: [react(), mode === "development" && componentTagger(), mode === "development" && apiDevMiddleware(env)].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
