-- Create meal_suggestions table
CREATE TABLE IF NOT EXISTS public.meal_suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    suggestion TEXT NOT NULL,
    moderated_content TEXT,
    moderation_status VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.meal_suggestions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can create suggestions" ON public.meal_suggestions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all suggestions" ON public.meal_suggestions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can view their own suggestions" ON public.meal_suggestions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can update suggestions" ON public.meal_suggestions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete suggestions" ON public.meal_suggestions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_meal_suggestions_user_id ON public.meal_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_suggestions_status ON public.meal_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_meal_suggestions_created_at ON public.meal_suggestions(created_at);