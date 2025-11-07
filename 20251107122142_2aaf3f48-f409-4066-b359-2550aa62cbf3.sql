-- Create table for product option groups (e.g., "Sabores", "Bebidas")
CREATE TABLE public.product_option_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 1,
  required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for individual options within groups (e.g., "Frango", "Carne", "Coca-Cola")
CREATE TABLE public.product_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  option_group_id UUID NOT NULL REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  additional_price NUMERIC DEFAULT 0,
  available BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_option_groups
CREATE POLICY "Anyone can view option groups for available products"
  ON public.product_option_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_option_groups.product_id
      AND products.available = true
    )
  );

CREATE POLICY "Admins can manage all option groups"
  ON public.product_option_groups
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for product_options
CREATE POLICY "Anyone can view options for available products"
  ON public.product_options
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.product_option_groups
      JOIN public.products ON products.id = product_option_groups.product_id
      WHERE product_option_groups.id = product_options.option_group_id
      AND products.available = true
    )
  );

CREATE POLICY "Admins can manage all options"
  ON public.product_options
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_product_option_groups_product_id ON public.product_option_groups(product_id);
CREATE INDEX idx_product_options_option_group_id ON public.product_options(option_group_id);

-- Add triggers for updated_at
CREATE TRIGGER update_product_option_groups_updated_at
  BEFORE UPDATE ON public.product_option_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_options_updated_at
  BEFORE UPDATE ON public.product_options
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();