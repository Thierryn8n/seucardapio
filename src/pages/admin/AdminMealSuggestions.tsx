import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MealSuggestion {
  id: string;
  user_id: string;
  suggestion_text: string;
  status: string;
  created_at: string;
}

const AdminSuggestions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile && !profile.is_admin) {
      navigate("/");
    }
  }, [profile, navigate]);

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["all-meal-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_suggestions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MealSuggestion[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("meal_suggestions")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Status atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["all-meal-suggestions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("meal_suggestions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sugestão excluída com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["all-meal-suggestions"] });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir sugestão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
      approved: { label: "Aprovada", color: "bg-green-100 text-green-800" },
      rejected: { label: "Rejeitada", color: "bg-red-100 text-red-800" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (!profile?.is_admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Sugestões de Refeições</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Gerencie as sugestões dos colaboradores
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Todas as Sugestões</CardTitle>
            <CardDescription>
              Aprove, rejeite ou exclua sugestões de refeições
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">
                Carregando sugestões...
              </p>
            ) : suggestions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Nenhuma sugestão encontrada
              </p>
            ) : (
              <>
                <div className="md:hidden space-y-4">
                  {suggestions.map((suggestion) => (
                    <Card key={suggestion.id} className="p-4">
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium text-sm line-clamp-3">{suggestion.suggestion_text}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          {getStatusBadge(suggestion.status)}
                          <span className="text-xs text-muted-foreground">
                            {new Date(suggestion.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          {suggestion.status !== "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: suggestion.id,
                                  status: "approved",
                                })
                              }
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                          )}
                          {suggestion.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: suggestion.id,
                                  status: "rejected",
                                })
                              }
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteId(suggestion.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Sugestão</TableHead>
                        <TableHead className="w-[20%]">Status</TableHead>
                        <TableHead className="w-[20%]">Data</TableHead>
                        <TableHead className="w-[20%] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestions.map((suggestion) => (
                        <TableRow key={suggestion.id}>
                          <TableCell className="max-w-md">
                            <p className="line-clamp-2">{suggestion.suggestion_text}</p>
                          </TableCell>
                          <TableCell>{getStatusBadge(suggestion.status)}</TableCell>
                          <TableCell>
                            {new Date(suggestion.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2 flex-wrap">
                              {suggestion.status !== "approved" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="whitespace-nowrap"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      id: suggestion.id,
                                      status: "approved",
                                    })
                                  }
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Aprovar
                                </Button>
                              )}
                              {suggestion.status !== "rejected" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="whitespace-nowrap"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      id: suggestion.id,
                                      status: "rejected",
                                    })
                                  }
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Rejeitar
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteId(suggestion.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta sugestão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminSuggestions;