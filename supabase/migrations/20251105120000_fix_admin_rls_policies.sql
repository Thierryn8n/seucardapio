-- Corrigir políticas RLS para permitir acesso administrativo completo

-- Políticas para tabela profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Nova política: Users can view their own profile
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Nova política: Admins can view all profiles  
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Nova política: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Nova política: Admins can update any profile
CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para tabela subscriptions (já existem boas, mas vamos garantir)
DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;

-- Nova política: Users can view their own subscription
CREATE POLICY "Users can view their own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Política existente "Admins can view all subscriptions" já está correta