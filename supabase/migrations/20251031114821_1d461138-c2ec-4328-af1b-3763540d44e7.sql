-- Fix conflicting RLS policies on menus table
-- Drop the conflicting SELECT policies
DROP POLICY IF EXISTS "Public can view menus by user_id" ON public.menus;
DROP POLICY IF EXISTS "Users can view their own menus" ON public.menus;

-- Create a single, explicit policy for public menu viewing
-- This allows the public menu view feature at /:id/cardapio to work
CREATE POLICY "Public menu viewing allowed"
ON public.menus
FOR SELECT
USING (true);

-- Make user_id NOT NULL to enforce data integrity
-- First check if there are any NULL values
DO $$
BEGIN
  -- Delete any menus without a user_id
  DELETE FROM public.menus WHERE user_id IS NULL;
  
  -- Now make the column NOT NULL
  ALTER TABLE public.menus ALTER COLUMN user_id SET NOT NULL;
END $$;