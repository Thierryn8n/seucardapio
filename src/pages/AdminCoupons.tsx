import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCoupons } from "@/hooks/useDelivery";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tag, Plus, Edit, Trash2, Calendar, Percent, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminCoupons = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { coupons, isLoading, createCoupon, updateCoupon, deleteCoupon } = useCoupons();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_order_value: 0,
    max_discount: 0,
    usage_limit: 1,
    used_count: 0,
    valid_from: '',
    valid_until: '',
    is_active: true
  });

  if (loading || isLoading) {
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

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_order_value: 0,
      max_discount: 0,
      usage_limit: 1,
      used_count: 0,
      valid_from: '',
      valid_until: '',
      is_active: true
    });
    setEditingCoupon(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCoupon) {
        await updateCoupon({ id: editingCoupon.id, updates: formData });
        toast({
          title: "Cupom atualizado",
          description: "Cupom atualizado com sucesso!"
        });
      } else {
        await createCoupon(formData);
        toast({
          title: "Cupom criado",
          description: "Cupom criado com sucesso!"
        });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar cupom",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (coupon: any) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_value: coupon.min_order_value,
      max_discount: coupon.max_discount,
      usage_limit: coupon.usage_limit,
      used_count: coupon.used_count,
      valid_from: coupon.valid_from?.split('T')[0] || '',
      valid_until: coupon.valid_until?.split('T')[0] || '',
      is_active: coupon.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cupom?')) {
      try {
        await deleteCoupon(id);
        toast({
          title: "Cupom excluído",
          description: "Cupom excluído com sucesso!"
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao excluir cupom",
          variant: "destructive"
        });
      }
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? <Badge className="bg-green-100 text-green-800">Ativo</Badge>
      : <Badge className="bg-gray-100 text-gray-800">Inativo</Badge>;
  };

  const getDiscountDisplay = (coupon: any) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    } else {
      return `R$ ${coupon.discount_value.toFixed(2)}`;
    }
  };

  const isValid = (coupon: any) => {
    const now = new Date();
    const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
    const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;
    
    if (validFrom && now < validFrom) return false;
    if (validUntil && now > validUntil) return false;
    if (coupon.used_count >= coupon.usage_limit) return false;
    
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cupons</h1>
              <p className="mt-2 text-gray-600">
                Gerencie os cupons de desconto do seu delivery
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
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Cupom
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCoupon ? 'Editar Cupom' : 'Criar Novo Cupom'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure as regras do cupom de desconto
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="code">Código do Cupom</Label>
                        <Input
                          id="code"
                          value={formData.code}
                          onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                          placeholder="EX: DESCONTO10"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Descrição</Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          placeholder="Descrição do cupom"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="discount_type">Tipo de Desconto</Label>
                        <Select
                          value={formData.discount_type}
                          onValueChange={(value) => setFormData({...formData, discount_type: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                            <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="discount_value">Valor do Desconto</Label>
                        <Input
                          id="discount_value"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.discount_value}
                          onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value)})}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="min_order_value">Valor Mínimo do Pedido</Label>
                        <Input
                          id="min_order_value"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.min_order_value}
                          onChange={(e) => setFormData({...formData, min_order_value: parseFloat(e.target.value)})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="max_discount">Desconto Máximo</Label>
                        <Input
                          id="max_discount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.max_discount}
                          onChange={(e) => setFormData({...formData, max_discount: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="usage_limit">Limite de Uso</Label>
                        <Input
                          id="usage_limit"
                          type="number"
                          min="1"
                          value={formData.usage_limit}
                          onChange={(e) => setFormData({...formData, usage_limit: parseInt(e.target.value)})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="is_active">Status</Label>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="is_active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                          />
                          <Label htmlFor="is_active">
                            {formData.is_active ? 'Ativo' : 'Inativo'}
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="valid_from">Válido de</Label>
                        <Input
                          id="valid_from"
                          type="date"
                          value={formData.valid_from}
                          onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="valid_until">Válido até</Label>
                        <Input
                          id="valid_until"
                          type="date"
                          value={formData.valid_until}
                          onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          resetForm();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                        {editingCoupon ? 'Atualizar' : 'Criar'} Cupom
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Tabela de Cupons */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Cupons</CardTitle>
            <CardDescription>
              Visualize e gerencie todos os cupons de desconto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons?.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Tag className="h-4 w-4 text-gray-400" />
                        <span className="font-mono text-sm">{coupon.code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-48 truncate">
                        {coupon.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{getDiscountDisplay(coupon)}</div>
                        {coupon.min_order_value > 0 && (
                          <div className="text-xs text-gray-500">
                            Mín: R$ {coupon.min_order_value.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          {coupon.used_count}/{coupon.usage_limit}
                        </div>
                        <div className="text-xs text-gray-500">
                          {coupon.usage_limit - coupon.used_count} disponíveis
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-sm">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span>{coupon.valid_from ? new Date(coupon.valid_from).toLocaleDateString('pt-BR') : 'Sem início'}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span>{coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString('pt-BR') : 'Sem fim'}</span>
                        </div>
                        {!isValid(coupon) && (
                          <Badge className="bg-red-100 text-red-800 text-xs">Expirado</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(coupon.is_active)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEdit(coupon)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDelete(coupon.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
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

export default AdminCoupons;