# 🍽️ Colab Eats - Cardápio Corporativo

Sistema de cardápio corporativo para empresas, permitindo gestão de refeições e visualização por funcionários.

## 🚀 Deploy na Vercel

### ⚙️ Configuração de Variáveis de Ambiente

Para o deploy funcionar corretamente, você precisa configurar as seguintes variáveis de ambiente no painel da Vercel:

#### Passo a Passo:

1. **Acesse o painel da Vercel**
2. **Vá para o seu projeto**
3. **Clique em "Settings"**
4. **Vá para "Environment Variables"**
5. **Adicione as seguintes variáveis:**

```bash
VITE_SUPABASE_PROJECT_ID=ertlnbbcvstjloaquqln
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVydGxuYmJjdnN0amxvYXF1cWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTk1NjgsImV4cCI6MjA3NzEzNTU2OH0.EVWBXdKWPf6yupvNZ8KQlvnBeqrHM-S-xuTw4y-_z1w
VITE_SUPABASE_URL=https://ertlnbbcvstjloaquqln.supabase.co
```

### 📝 Observações Importantes:

- ⚠️ **NÃO** commit o arquivo `.env` com suas chaves reais
- 🔑 As variáveis devem começar com `VITE_` para serem acessíveis no código
- 🔄 Após adicionar as variáveis, faça um novo deploy
- ✅ O formulário de login aparecerá corretamente após a configuração

### 🛠️ Funcionalidades

- ✅ Visualização de cardápio semanal
- ✅ Exportação para WhatsApp (PNG, PDF, TXT)
- ✅ Sistema de autenticação
- ✅ Painel administrativo
- ✅ Personalização de exportações

### 📱 Exportação WhatsApp

O sistema inclui um sistema completo de exportação para WhatsApp com:
- 📸 Exportação em PNG
- 📄 Exportação em PDF (A4 vertical)
- 💬 Exportação em TXT com emojis
- 🎨 Personalização de estilos (moderno, clássico, minimalista)
- ⚙️ Painel de personalização para administradores