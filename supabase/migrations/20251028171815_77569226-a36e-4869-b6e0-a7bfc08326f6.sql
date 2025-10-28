-- Create settings table for app customization
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL DEFAULT 'Nossa Empresa',
  logo_url text,
  favicon_url text,
  primary_color text NOT NULL DEFAULT '20 85% 55%',
  secondary_color text NOT NULL DEFAULT '140 45% 50%',
  accent_color text NOT NULL DEFAULT '15 90% 60%',
  title_font text NOT NULL DEFAULT 'Playfair Display',
  body_font text NOT NULL DEFAULT 'Poppins',
  show_sunday boolean NOT NULL DEFAULT false,
  show_monday boolean NOT NULL DEFAULT true,
  show_tuesday boolean NOT NULL DEFAULT true,
  show_wednesday boolean NOT NULL DEFAULT true,
  show_thursday boolean NOT NULL DEFAULT true,
  show_friday boolean NOT NULL DEFAULT true,
  show_saturday boolean NOT NULL DEFAULT false,
  donation_enabled boolean NOT NULL DEFAULT false,
  donation_url text,
  donation_text text NOT NULL DEFAULT 'Apoie nosso trabalho',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view settings
CREATE POLICY "Anyone can view settings"
ON public.settings
FOR SELECT
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
ON public.settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Only admins can insert settings
CREATE POLICY "Admins can insert settings"
ON public.settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.settings (
  company_name,
  primary_color,
  secondary_color,
  accent_color,
  title_font,
  body_font,
  show_sunday,
  show_monday,
  show_tuesday,
  show_wednesday,
  show_thursday,
  show_friday,
  show_saturday,
  donation_enabled
) VALUES (
  'Nossa Empresa',
  '20 85% 55%',
  '140 45% 50%',
  '15 90% 60%',
  'Playfair Display',
  'Poppins',
  false,
  true,
  true,
  true,
  true,
  true,
  false,
  false
);