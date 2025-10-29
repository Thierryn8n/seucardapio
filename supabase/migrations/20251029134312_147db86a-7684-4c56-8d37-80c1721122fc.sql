-- Add user_id column to menus table to associate menus with specific users
ALTER TABLE public.menus 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing menus to have a user_id (optional: assign to first admin or leave null)
-- This step is important if you have existing data

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Anyone can view menus" ON public.menus;
DROP POLICY IF EXISTS "Admins can insert menus" ON public.menus;
DROP POLICY IF EXISTS "Admins can update menus" ON public.menus;
DROP POLICY IF EXISTS "Admins can delete menus" ON public.menus;

-- Create new RLS policies that filter by user_id
CREATE POLICY "Users can view their own menus"
ON public.menus
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Public can view menus by user_id"
ON public.menus
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own menus"
ON public.menus
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own menus"
ON public.menus
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own menus"
ON public.menus
FOR DELETE
USING (auth.uid() = user_id);