import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { toast } from 'sonner';
import { Shield, BarChart3, Package, Users, Settings } from 'lucide-react';
import { STORE_CONFIG } from '../../api';
import { useApp } from '../../App'; // <-- Corrija o import, se necessário

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useApp(); // <-- CORRETO!
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password); // 👈 só email e senha
      if (success) {
        navigate('/admin'); // vai para rota protegida
      } else {
        toast.error('Credenciais inválidas. Verifique seu email e senha.');
      }
    } catch (error) {
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

        {/* Admin Features */}
        <div className="text-center md:text-left space-y-6">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-gray-800 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Painel Administrativo
                </h1>
                <p className="text-muted-foreground">{STORE_CONFIG.name}</p>
              </div>
            </div>
            <p className="text-lg text-muted-foreground">
              Gerencie sua loja de doces com controle total sobre vendas, estoque e clientes.
            </p>
          </div>

          {/* Admin Features Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white/80 rounded-lg border border-gray-200">
              <BarChart3 className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-medium text-gray-800">Dashboard Completo</h3>
              <p className="text-xs text-muted-foreground">
                Visualize vendas, faturamento e relatórios detalhados com gráficos em tempo real
              </p>
            </div>
            <div className="p-4 bg-white/80 rounded-lg border border-gray-200">
              <Package className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-medium text-gray-800">Gestão de Estoque</h3>
              <p className="text-xs text-muted-foreground">
                Controle total dos doces: quantidade, validade, promoções e novidades
              </p>
            </div>
            <div className="p-4 bg-white/80 rounded-lg border border-gray-200">
              <Users className="h-8 w-8 text-purple-600 mb-2" />
              <h3 className="font-medium text-gray-800">Gestão de Pedidos</h3>
              <p className="text-xs text-muted-foreground">
                Acompanhe pedidos desde o pagamento até a retirada na loja
              </p>
            </div>
            <div className="p-4 bg-white/80 rounded-lg border border-gray-200">
              <Settings className="h-8 w-8 text-orange-600 mb-2" />
              <h3 className="font-medium text-gray-800">Análise de Vendas</h3>
              <p className="text-xs text-muted-foreground">
                Descubra quais produtos vendem mais e em quais bairros
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Acesso Restrito</span>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              Este painel é destinado exclusivamente para administradores autorizados da loja.
            </p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="w-full max-w-md mx-auto shadow-xl border-gray-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-slate-700 to-gray-800 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-gray-800">Acesso Administrativo</CardTitle>
            <CardDescription>
              Entre com suas credenciais de administrador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Administrativo</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@admin.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-slate-700 to-gray-800 hover:from-slate-800 hover:to-gray-900" 
                disabled={isLoading}
              >
                {isLoading ? 'Verificando...' : 'Acessar Painel'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Não é um administrador?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium underline">
                  Área do cliente
                </Link>
              </p>
            </div>

         
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
