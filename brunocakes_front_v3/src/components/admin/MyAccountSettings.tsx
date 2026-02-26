import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { useApp } from '../../App';
import adminApi from '../../api/admin';

export function MyAccountSettings() {
  const { admin, setAdmin } = useApp();
  const [email, setEmail] = useState(admin?.email || '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = { email };
      if (password) {
        if (password.length < 8) {
          toast.error('A senha deve ter no mínimo 8 caracteres');
          setLoading(false);
          return;
        }
        if (password !== passwordConfirmation) {
          toast.error('As senhas não coincidem');
          setLoading(false);
          return;
        }
        payload.password = password;
        payload.password_confirmation = passwordConfirmation;
      }
      await adminApi.put(`/admin/users/${admin.id}`, payload);
      toast.success('Dados atualizados com sucesso!');
      setAdmin({ ...admin, email });
      setPassword('');
      setPasswordConfirmation('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar dados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <h2 className="text-2xl font-bold mb-2">Minha Conta</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Nova Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={8}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <Label htmlFor="password_confirmation">Confirmar Nova Senha</Label>
            <Input
              id="password_confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={e => setPasswordConfirmation(e.target.value)}
              minLength={8}
              placeholder="Confirme a senha"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
