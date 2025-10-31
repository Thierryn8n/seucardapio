-- Add logo_size column to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS logo_size INTEGER DEFAULT 150 CHECK (logo_size >= 50 AND logo_size <= 500);