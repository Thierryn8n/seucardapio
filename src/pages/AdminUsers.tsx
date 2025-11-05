import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Filter, UserPlus, Mail, Calendar, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { decryptUserRole } from "@/integrations/mercadopago/mercadopago.encryption";

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin, updateUserRole } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Buscar usuários do banco de dados
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, user_plan, created_at, last_login, status, role_encrypted')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Descriptografar roles
      const usersWithDecryptedRoles = await Promise.all(
        (data || []).map(async (user) => {
          let role = 'user';
          if (user.role_encrypted) {
            try {
              role = decryptUserRole(user.role_encrypted, user.id);
            } catch (error) {
              console.error(`Erro ao descriptografar role do usuário ${user.id}:`, error);
            }
          }
          
          return {
            ...user,
            role,
            plan: user.user_plan || 'free',
          };
        })
      );

      setUsers(usersWithDecryptedRoles);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários.',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  if (loading || loadingUsers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Acesso Negado</h1>
          <p className="mt-2 text-gray-600">Você não tem permissão para acessar esta área.</p>
          <Button 
            onClick={() => navigate("/")}
            className="mt-4 bg-orange-500 hover:bg-orange-600"
          >
            Voltar para Home
          </Button>
        </div>
      </div>
    );
  }

  const getPlanBadge = (plan: string) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      professional: 'bg-blue-100 text-blue-800',
      premium: 'bg-orange-100 text-orange-800'
    };
    return <Badge className={colors[plan as keyof typeof colors] || colors.free}>{plan}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      user: 'bg-green-100 text-green-800'
    };
    return <Badge className={colors[role as keyof typeof colors] || colors.user}>{role}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return <Badge className={colors[status as keyof typeof colors] || colors.inactive}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestão de Usuários</h1>
              <p className="mt-2 text-gray-600">
                Gerencie os usuários do sistema, planos e permissões
              </p>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={() => navigate("/admin")}
                variant="outline"
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                Voltar
              </Button>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </div>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">+2 este mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <div className="h-4 w-4 bg-green-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">67% do total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planos Premium</CardTitle>
              <Crown className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.plan === 'premium').length}
              </div>
              <p className="text-xs text-muted-foreground">33% dos usuários</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <div className="h-4 w-4 bg-red-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.role === 'admin').length}
              </div>
              <p className="text-xs text-muted-foreground">Administradores</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar por email..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtrar
                </Button>
                <select className="px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500">
                  <option value="">Todos os Planos</option>
                  <option value="free">Gratuito</option>
                  <option value="professional">Profissional</option>
                  <option value="premium">Premium</option>
                </select>
                <select className="px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500">
                  <option value="">Todos os Status</option>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="suspended">Suspenso</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>
              Visualize e gerencie todos os usuários do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userItem) => (
                  <TableRow key={userItem.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{userItem.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getPlanBadge(userItem.plan)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={userItem.role === 'admin' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {userItem.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                        {userItem.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(userItem.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {new Date(userItem.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {new Date(userItem.last_login).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/admin/users/${userItem.id}`)}
                        >
                          Editar
                        </Button>
                        {userItem.role !== 'admin' ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handlePromoteToAdmin(userItem.id)}
                          >
                            Promover
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-orange-600 hover:text-orange-700"
                            onClick={() => handleDemoteToUser(userItem.id)}
                            disabled={userItem.id === user?.id}
                          >
                            Rebaixar
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={async () => {
                            if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
                            try {
                              const { error } = await supabase
                                .from('users')
                                .delete()
                                .eq('id', userItem.id);
                              if (error) throw error;
                              toast({
                                title: 'Sucesso',
                                description: 'Usuário excluído com sucesso.',
                              });
                              fetchUsers();
                            } catch (error) {
                              console.error('Erro ao excluir usuário:', error);
                              toast({
                                title: 'Erro',
                                description: 'Não foi possível excluir o usuário.',
                                variant: 'destructive',
                              });
                            }
                          }}
                          disabled={userItem.id === user?.id}
                        >
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUsers;