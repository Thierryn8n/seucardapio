-- Script para garantir que o usuário admin tenha papel de administrador
-- Este script deve ser executado manualmente no banco de dados

-- Primeiro, vamos encontrar o ID do usuário admin (geralmente o primeiro usuário criado)
-- Descomente e ajuste conforme necessário:

-- Opção 1: Se você sabe o email do admin
-- SELECT id FROM auth.users WHERE email = 'admin@seuapp.com';

-- Opção 2: Listar todos os usuários para identificar o admin
SELECT id, email FROM auth.users LIMIT 10;

-- Depois de identificar o ID do usuário admin, substitua USER_ID_AQUI pelo ID real:

-- Garantir que o usuário tenha papel de admin
INSERT INTO public.user_roles (user_id, role) 
VALUES ('USER_ID_AQUI', 'admin')
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin', updated_at = NOW();

-- Verificar se foi inserido corretamente
SELECT ur.user_id, ur.role, u.email 
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id 
WHERE ur.role = 'admin';