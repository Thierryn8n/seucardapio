# Configuração para Deploy no Vercel

## Problemas Resolvidos

Os arquivos de configuração foram simplificados para evitar conflitos no build:

### 1. Arquivos Removidos
- ❌ `_redirects` - Arquivo Netlify removido
- ❌ `firebase.json` - Configuração Firebase removida

### 2. Arquivos Simplificados
- ✅ `vercel.json` - Configuração mínima para SPA routing
- ✅ `package.json` - Adicionada configuração de Node.js 18+

### 3. Configuração Atual

#### vercel.json
```json
{
  "routes": [
    { "src": "/(.*)", "dest": "/" }
  ]
}
```

#### package.json
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Deploy no Vercel

### Opção 1: Deploy pelo GitHub
1. Acesse [vercel.com](https://vercel.com)
2. Importe seu repositório
3. Configure:
   - **Framework**: Vite (detectado automaticamente)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Opção 2: Deploy pela CLI
```bash
npm i -g vercel
vercel --prod
```

## Solução de Problemas

Se ainda houver problemas:

1. **Limpe o cache do Vercel**: 
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Verifique as variáveis de ambiente** no painel do Vercel

3. **Use a configuração mínima** que está no projeto agora

## Testado Localmente
✅ Build funcionando perfeitamente
✅ Rotas SPA configuradas corretamente
✅ Sem conflitos de configuração