import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../App';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { toast } from 'sonner';
import { Heart, ShoppingBag, Clock, MapPin } from 'lucide-react';
import { STORE_CONFIG } from '../../api';

export function ClientLogin() {
  const [email, setEmail] = useState('maria@cliente.com');
  const [password, setPassword] = useState('cliente123');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password, 'client');
      if (!success) {
        toast.error('Credenciais inválidas. Verifique seu email e senha.');
      }
    } catch (error) {
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-red-50 to-orange-50 p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Branding Side */}
        <div className="text-center md:text-left space-y-6">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center">
                <Heart className="w-8 h-8 text-white fill-current" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent">
                  {STORE_CONFIG.name}
                </h1>
                <p className="text-muted-foreground">Doces feitos com amor</p>
              </div>
            </div>
            <p className="text-lg text-muted-foreground">
              Descubra nossos doces artesanais únicos, feitos com ingredientes selecionados e muito carinho.
            </p>
          </div>

          {/* Store Info */}
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <MapPin className="h-5 w-5 text-pink-500" />
              <span>{STORE_CONFIG.address}</span>
            </div>
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <Clock className="h-5 w-5 text-pink-500" />
              <span>{STORE_CONFIG.workingHours}</span>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-white/50 rounded-lg border border-pink-100">
              <Heart className="h-8 w-8 text-pink-500 mx-auto mb-2" />
              <h3 className="font-medium">Feito com Amor</h3>
              <p className="text-xs text-muted-foreground">Cada doce é preparado artesanalmente</p>
            </div>
            <div className="p-4 bg-white/50 rounded-lg border border-pink-100">
              <ShoppingBag className="h-8 w-8 text-pink-500 mx-auto mb-2" />
              <h3 className="font-medium">Fácil Pedido</h3>
              <p className="text-xs text-muted-foreground">Peça online e retire na loja</p>
            </div>
            <div className="p-4 bg-white/50 rounded-lg border border-pink-100">
              <Clock className="h-8 w-8 text-pink-500 mx-auto mb-2" />
              <h3 className="font-medium">Sempre Fresco</h3>
              <p className="text-xs text-muted-foreground">Produção diária garantida</p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <Card className="w-full max-w-md mx-auto shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <CardTitle>Entre na sua conta</CardTitle>
            <CardDescription>
              Acesse nosso cardápio e faça seus pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
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
                className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600" 
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Não tem uma conta?{' '}
                <Link to="/register" className="text-pink-600 hover:text-pink-700 font-medium underline">
                  Cadastre-se
                </Link>
              </p>
              <p className="text-sm text-muted-foreground">
                É administrador?{' '}
                <Link to="/admin/login" className="text-gray-600 hover:text-gray-700 font-medium underline">
                  Acesso administrativo
                </Link>
              </p>
            </div>

            <div className="mt-4 p-4 bg-pink-50 rounded-lg border border-pink-200">
              <p className="text-sm text-pink-800 mb-2 font-medium">Credenciais de demonstração:</p>
              <div className="space-y-1">
                <p className="text-xs text-pink-700">📧 Email: maria@cliente.com</p>
                <p className="text-xs text-pink-700">🔒 Senha: cliente123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}