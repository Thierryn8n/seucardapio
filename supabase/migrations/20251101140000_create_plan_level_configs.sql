-- Create plan_level_configs table for dynamic level configuration
CREATE TABLE public.plan_level_configs (
  id TEXT PRIMARY KEY,
  plan_name TEXT NOT NULL, -- 'free', 'professional', 'premium'
  plan_display_name TEXT NOT NULL,
  access_level INTEGER NOT NULL,
  panel_type TEXT NOT NULL CHECK (panel_type IN ('simple', 'master')),
  delivery_features BOOLEAN DEFAULT false,
  menu_management BOOLEAN DEFAULT true,
  user_management BOOLEAN DEFAULT false,
  system_config BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(plan_name)
);

-- Enable RLS
ALTER TABLE public.plan_level_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active configs"
ON public.plan_level_configs
FOR SELECT
USING (active = true);

CREATE POLICY "Admins can view all configs"
ON public.plan_level_configs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage configs"
ON public.plan_level_configs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_plan_level_configs_updated_at
  BEFORE UPDATE ON public.plan_level_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configurations
INSERT INTO public.plan_level_configs (id, plan_name, plan_display_name, access_level, panel_type, delivery_features, menu_management, user_management, system_config, active) VALUES
('free-config', 'free', 'Gratuito', 1, 'simple', false, true, false, false, true),
('professional-config', 'professional', 'Profissional', 2, 'simple', false, true, false, false, true),
('premium-config', 'premium', 'Premium', 3, 'simple', true, true, false, false, true);