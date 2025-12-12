-- Create table for Mercado Pago settings per admin user
CREATE TABLE public.mercado_pago_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  public_key text,
  webhook_secret text,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.mercado_pago_settings ENABLE ROW LEVEL SECURITY;

-- Admins can view their own settings
CREATE POLICY "Admins can view their own Mercado Pago settings"
ON public.mercado_pago_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert their own settings
CREATE POLICY "Admins can insert their own Mercado Pago settings"
ON public.mercado_pago_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- Admins can update their own settings
CREATE POLICY "Admins can update their own Mercado Pago settings"
ON public.mercado_pago_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete their own settings
CREATE POLICY "Admins can delete their own Mercado Pago settings"
ON public.mercado_pago_settings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_mercado_pago_settings_updated_at
  BEFORE UPDATE ON public.mercado_pago_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();