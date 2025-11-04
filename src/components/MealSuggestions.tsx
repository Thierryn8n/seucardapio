import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Send } from "lucide-react";

export const MealSuggestions = () => {
  const [suggestion, setSuggestion] = useState("");
  const { toast } = useToast();

  const addSuggestion = useMutation({
    mutationFn: async (text: string) => {
      // Moderar conteúdo antes de enviar
      const { data: moderationResult, error: moderationError } = await supabase.functions.invoke(
        'moderate-suggestion',
        {
          body: { text }
        }
      );

      if (moderationError) {
        console.error('Moderation error:', moderationError);
        throw new Error('Erro ao validar sugestão');
      }

      if (!moderationResult?.isAppropriate) {
        throw new Error(moderationResult?.message || 'Conteúdo inadequado para publicação');
      }
      
      const { error } = await supabase
        .from("meal_suggestions")
        .insert({
          user_id: null,
          suggestion_text: text,
          status: "pending",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sugestão enviada!",
        description: "Sua sugestão será analisada pela nossa equipe.",
      });
      setSuggestion("");
    },
    onError: (error: Error) => {
      toast({
        title: "Não foi possível enviar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!suggestion.trim()) {
      toast({
        title: "Sugestão vazia",
        description: "Por favor, escreva uma sugestão antes de enviar.",
        variant: "destructive",
      });
      return;
    }
    addSuggestion.mutate(suggestion);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Sugestões da Semana
        </CardTitle>
        <CardDescription>
          Compartilhe suas ideias para o cardápio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Descreva sua sugestão de refeição... Ex: Lasanha de frango com legumes"
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            rows={4}
            maxLength={500}
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {suggestion.length}/500 caracteres
            </span>
            <Button
              onClick={handleSubmit}
              disabled={addSuggestion.isPending}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Sugestão
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
