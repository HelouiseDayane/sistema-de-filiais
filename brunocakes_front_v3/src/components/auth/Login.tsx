import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../App';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Package } from 'lucide-react';
import { toast } from 'sonner';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'admin' | 'client'>('client');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (email && password) {
      login(email, password, userType);
      toast.success('Login realizado com sucesso!');
    } else {
      toast.error('Por favor, preencha todos os campos.');
    }
    
    setIsLoading(false);
  };

  const handleDemoLogin = (type: 'admin' | 'client') => {
    setUserType(type);
    setEmail(type === 'admin' ? 'admin@sweetdelivery.com' : 'cliente@email.com');
    setPassword('123456');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Sweet Delivery</CardTitle>
          <CardDescription>
            Entre em sua conta para continuar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            
            <div className="space-y-2">
              <Label>Tipo de usuário</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={userType === 'client' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setUserType('client')}
                >
                  Cliente
                </Button>
                <Button
                  type="button"
                  variant={userType === 'admin' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setUserType('admin')}
                >
                  Admin
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="space-y-2">
            <div className="text-center text-sm text-muted-foreground">
              Logins de demonstração:
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleDemoLogin('client')}
              >
                Demo Cliente
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleDemoLogin('admin')}
              >
                Demo Admin
              </Button>
            </div>
          </div>

          <div className="text-center space-y-2">
            <Link 
              to="/forgot-password" 
              className="text-sm text-orange-600 hover:underline"
            >
              Esqueceu sua senha?
            </Link>
            <div className="text-sm text-muted-foreground">
              Não tem uma conta?{' '}
              <Link to="/register" className="text-orange-600 hover:underline">
                Cadastre-se
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}