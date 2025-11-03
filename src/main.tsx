import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Error handling for development
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found!");
  throw new Error("Root element with id 'root' not found in HTML");
}

try {
  createRoot(rootElement).render(<App />);
} catch (error) {
  console.error("Failed to render App:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1>Erro ao carregar aplicação</h1>
      <p>Por favor, recarregue a página ou verifique o console para mais detalhes.</p>
      <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error}</pre>
    </div>
  `;
}
