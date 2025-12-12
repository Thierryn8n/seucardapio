-- Remover referências a admin master do banco de dados

-- 1. Atualizar plan_level_configs para remover panel_type 'master'
ALTER TABLE public.plan_level_configs 
DROP CONSTRAINT IF EXISTS plan_level_configs_panel_type_check;

ALTER TABLE public.plan_level_configs 
ADD CONSTRAINT plan_level_configs_panel_type_check 
CHECK (panel_type IN ('simple'));

-- Atualizar registros existentes que tenham panel_type = 'master'
UPDATE public.plan_level_configs 
SET panel_type = 'simple', updated_at = NOW()
WHERE panel_type = 'master';

-- 2. Remover coluna delivery_features que era usada para funcionalidades master
ALTER TABLE public.plan_level_configs 
DROP COLUMN IF EXISTS delivery_features;

-- 3. Atualizar políticas RLS para consistência - usar apenas has_role()
-- Remover políticas antigas que usam profiles.is_admin
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.settings;

-- Criar políticas consistentes usando has_role
CREATE POLICY "Admins can update settings"
ON public.settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings"
ON public.settings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Atualizar meal_suggestions para usar has_role consistentemente
-- (já está correto nas migrações mais recentes)

-- 5. Adicionar política de segurança para menus - limitar acesso público
DROP POLICY IF EXISTS "Public can view menus by user_id" ON public.menus;
DROP POLICY IF EXISTS "Public menu viewing allowed" ON public.menus;

-- Criar política mais restritiva para visualização pública
CREATE POLICY "Public can view active user menus"
ON public.menus
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = menus.user_id 
    AND p.is_admin = false -- Apenas usuários normais
  )
);

-- 6. Limpar funções e triggers antigos relacionados a master
DROP TRIGGER IF EXISTS update_plan_level_configs_updated_at ON public.plan_level_configs;

-- Recriar trigger sem referências a master
CREATE TRIGGER update_plan_level_configs_updated_at
  BEFORE UPDATE ON public.plan_level_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Atualizar configurações padrão dos planos
UPDATE public.plan_level_configs 
SET 
  user_management = false,
  system_config = false,
  updated_at = NOW()
WHERE plan_name IN ('free', 'professional', 'premium');

-- 8. Verificar e limpar quaisquer referências restantes a master
DELETE FROM public.plan_level_configs 
WHERE plan_name LIKE '%master%' OR plan_display_name LIKE '%master%';

-- 9. Adicionar comentários para documentar as mudanças
COMMENT ON TABLE public.plan_level_configs IS 'Configurações de planos - removido suporte a admin master';
COMMENT ON COLUMN public.plan_level_configs.panel_type IS 'Tipo de painel: apenas simple (master removido)';