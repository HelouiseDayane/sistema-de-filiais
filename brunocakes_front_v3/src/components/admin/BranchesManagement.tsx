import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Building2, Pencil, Trash2, Plus, MapPin, Phone, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import adminApi from '../../api/admin';
import { Branch } from '../../types/admin';

interface BranchesManagementProps {
  onBack?: () => void;
}

export function BranchesManagement({ onBack }: BranchesManagementProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: ''
  });

  const currentAdmin = JSON.parse(localStorage.getItem('bruno_admin') || '{}');
  const isMaster = currentAdmin?.role === 'master';

 

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await adminApi.get('/admin/branches');
      setBranches(Array.isArray(response) ? response : (response.data || []));
    } catch (error: any) {
      console.error('Erro ao carregar filiais:', error);
      toast.error('Erro ao carregar filiais');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isMaster) {
      toast.error('Apenas master pode criar/editar filiais');
      return;
    }

    // Validação dos campos obrigatórios
    if (!formData.name?.trim() || !formData.code?.trim() || !formData.address?.trim()) {
      toast.error('Preencha todos os campos obrigatórios (Nome, Código e Endereço)');
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        address: formData.address.trim(),
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
        is_open: true,  // Sempre ativa por padrão
        is_active: true // Sempre ativa por padrão
      };

      console.log('📤 Enviando dados:', payload);

      if (editingBranch) {
        await adminApi.put(`/admin/branches/${editingBranch.id}`, payload);
        toast.success('Filial atualizada com sucesso');
      } else {
        await adminApi.post('/admin/branches', payload);
        toast.success('Filial criada com sucesso');
      }

      setDialogOpen(false);
      resetForm();
      fetchBranches();
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      const errorMsg = error.response?.data?.errors 
        ? Object.values(error.response.data.errors).flat().join(', ')
        : error.response?.data?.message || 'Erro ao salvar filial';
      toast.error(errorMsg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!isMaster) {
      toast.error('Apenas master pode deletar filiais');
      return;
    }

    if (!confirm('Deseja realmente excluir esta filial?')) return;

    try {
      await adminApi.delete(`/admin/branches/${id}`);
      toast.success('Filial excluída com sucesso');
      fetchBranches();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao excluir filial');
    }
  };

  const handleEdit = (branch: Branch) => {
    if (!isMaster) {
      toast.error('Apenas master pode editar filiais');
      return;
    }

    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone || '',
      email: branch.email || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingBranch(null);
    setFormData({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: ''
    });
  };

  const getStatusBadge = (branch: Branch) => {
    if (!branch.is_active) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500 text-white">❌ Inativa</span>;
    }
    if (branch.is_open) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✅ Aberta</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">🔒 Fechada</span>;
  };

  const handleToggleActive = async (branch: Branch) => {
    if (!isMaster) {
      toast.error('Apenas master pode ativar/desativar filiais');
      return;
    }

    const action = branch.is_active ? 'desativar' : 'ativar';
    const confirmMessage = branch.is_active 
      ? `Desativar a filial "${branch.name}"?\n\n⚠️ Esta ação irá:\n• Bloquear login de usuários vinculados\n• Ocultar a filial no cardápio público\n• Ocultar produtos desta filial`
      : `Ativar a filial "${branch.name}"?\n\nEsta ação irá permitir o acesso novamente.`;

    if (!confirm(confirmMessage)) return;

    try {
      await adminApi.put(`/admin/branches/${branch.id}`, {
        is_active: !branch.is_active
      });
      toast.success(`Filial ${action === 'desativar' ? 'desativada' : 'ativada'} com sucesso`);
      fetchBranches();
    } catch (error: any) {
      console.error('❌ Erro ao atualizar filial:', error);
      toast.error(error.response?.data?.message || `Erro ao ${action} filial`);
    }
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
          <p className="text-muted-foreground">Cadastre e gerencie as filiais da loja</p>
        </div>
        {isMaster && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Filial
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingBranch ? 'Editar Filial' : 'Nova Filial'}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Campos marcados com * são obrigatórios
                </p>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome da Filial *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Filial Centro"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="code">Código *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="Ex: CTR"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Endereço *</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, número, bairro, cidade - Estado"
                    rows={2}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefone (Opcional)</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(84) 99999-9999"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email (Opcional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="filial@brunocakes.com"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    ℹ️ A filial será criada <strong>ativa e aberta</strong> por padrão. 
                    O horário de funcionamento e status de abertura/fechamento são gerenciados 
                    no módulo de <strong>Endereços</strong> pelos funcionários.
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingBranch ? 'Atualizar' : 'Criar Filial'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!isMaster && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800">
            ℹ️ Apenas usuários master podem criar e editar filiais. Você pode visualizar e alterar o status de abertura/fechamento.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {branches.map((branch) => (
          <Card key={branch.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{branch.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">Código: {branch.code}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {getStatusBadge(branch)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">{branch.address}</span>
                </div>

                {branch.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{branch.phone}</span>
                  </div>
                )}

                {branch.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{branch.email}</span>
                  </div>
                )}
              </div>

              {isMaster && (
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(branch)}
                      className="flex-1"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(branch.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    variant={branch.is_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleActive(branch)}
                    className="w-full"
                  >
                    {branch.is_active ? '❌ Desativar Filial' : '✅ Ativar Filial'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {branches.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma filial cadastrada</h3>
            <p className="text-muted-foreground mb-4">
              Comece cadastrando a primeira filial da sua loja
            </p>
            {isMaster && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Primeira Filial
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
