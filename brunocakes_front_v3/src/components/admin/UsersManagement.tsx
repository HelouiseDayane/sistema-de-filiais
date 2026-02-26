import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { UserPlus, Pencil, Trash2, Shield, User, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import adminApi from '../../api/admin';
import { Admin, Branch, CreateUserData } from '../../types/admin';

interface UsersManagementProps {
  onBack?: () => void;
}

export function UsersManagement({ onBack }: UsersManagementProps) {
  const [users, setUsers] = useState<Admin[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Admin | null>(null);
  const [formData, setFormData] = useState<CreateUserData>({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'employee',
    branch_id: undefined
  });

  const currentAdmin = JSON.parse(localStorage.getItem('bruno_admin') || '{}');
  const isMaster = currentAdmin?.role === 'master';

  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await adminApi.get('/admin/users');
      setUsers(Array.isArray(response) ? response : (response.data || []));
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await adminApi.get('/admin/branches');
      setBranches(Array.isArray(response) ? response : (response.data || []));
    } catch (error) {
      console.error('Erro ao carregar filiais:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de senha apenas quando está preenchida (criação ou alteração)
    if (formData.password) {
      if (formData.password.length < 8) {
        toast.error('A senha deve ter no mínimo 8 caracteres');
        return;
      }
      
      if (formData.password !== formData.password_confirmation) {
        toast.error('As senhas não coincidem');
        return;
      }
    } else if (!editingUser) {
      // Se não está editando, a senha é obrigatória
      toast.error('A senha é obrigatória');
      return;
    }

    try {
      if (editingUser) {
        // Se estiver editando e a senha estiver vazia, não enviar os campos de senha
        const payload: any = { ...formData };
        if (!payload.password) {
          delete payload.password;
          delete payload.password_confirmation;
        }
        await adminApi.put(`/admin/users/${editingUser.id}`, payload);
        toast.success('Usuário atualizado com sucesso');
      } else {
        await adminApi.post('/admin/users', formData);
        toast.success('Usuário criado com sucesso');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar usuário';
      const errors = error.response?.data?.errors;
      
      if (errors) {
        // Exibe o primeiro erro encontrado
        const firstError = Object.values(errors)[0] as string[];
        toast.error(firstError[0] || errorMessage);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir este usuário?')) return;

    try {
      await adminApi.delete(`/admin/users/${id}`);
      toast.success('Usuário excluído com sucesso');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao excluir usuário');
    }
  };

  const handleEdit = (user: Admin) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      password_confirmation: '',
      role: user.role,
      branch_id: user.branch_id
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
      role: 'employee',
      branch_id: undefined
    });
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      master: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      employee: 'bg-green-100 text-green-800'
    };
    const labels = {
      master: 'Master',
      admin: 'Admin',
      employee: 'Funcionário'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role as keyof typeof styles]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    );
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
          <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Senha {editingUser && '(deixe em branco para manter)'}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  A senha deve ter no mínimo 8 caracteres
                </p>
              </div>

              <div>
                <Label htmlFor="password_confirmation">Confirmar Senha</Label>
                <Input
                  id="password_confirmation"
                  type="password"
                  value={formData.password_confirmation}
                  onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                  required={!editingUser}
                  minLength={8}
                  placeholder="Confirme a senha"
                />
              </div>

              <div>
                <Label htmlFor="role">Papel</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isMaster && <SelectItem value="master">Master</SelectItem>}
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="employee">Funcionário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.role !== 'master' && (
                <div>
                  <Label htmlFor="branch_id">Filial</Label>
                  <Select
                    value={formData.branch_id?.toString()}
                    onValueChange={(value) => setFormData({ ...formData, branch_id: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma filial" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.filter(b => b.is_active).map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name} ({branch.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    ⚠️ Apenas filiais ativas são exibidas. Se a filial for desativada, o login do usuário será bloqueado.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingUser ? 'Atualizar' : 'Criar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : !users || users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum usuário cadastrado</h3>
            <p className="text-muted-foreground">Comece cadastrando o primeiro usuário</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {user.role === 'master' ? (
                    <Shield className="w-6 h-6 text-primary" />
                  ) : (
                    <User className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{user.name}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex gap-2 mt-1">
                    {getRoleBadge(user.role)}
                    {user.branch && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {user.branch.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                {user.id !== currentAdmin?.id && (
                  <Button variant="outline" size="sm" onClick={() => handleDelete(user.id)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}
    </div>
  );
}
