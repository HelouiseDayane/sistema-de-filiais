import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useApp } from '../../App';
import { DollarSign, TrendingUp, Package, MapPin, Calendar, Users } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { STORE_CONFIG } from '../../api';
import { BranchSelector } from './BranchSelector';
import { Branch } from '../../types/admin';
import adminApi from '../../api/admin';
import { toast } from 'sonner';
import { MasterDashboard } from './MasterDashboard';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

export function AdminDashboard() {
  const { orders, products } = useApp();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const currentAdmin = JSON.parse(localStorage.getItem('bruno_admin') || '{}');
  const isMaster = currentAdmin?.role === 'master';
  const isAdmin = currentAdmin?.role === 'admin';
  const userBranchId = currentAdmin?.branch_id;

  // Se for Master, mostrar MasterDashboard
  if (isMaster) {
    return <MasterDashboard />;
  }

  useEffect(() => {
    if (isMaster) {
      fetchBranches();
    } else if (isAdmin && userBranchId) {
      // Admin sempre vê sua própria filial
      setSelectedBranchId(userBranchId);
    }
  }, [isMaster, isAdmin, userBranchId]);

  useEffect(() => {
    loadDashboardAnalytics();
  }, [selectedBranchId]);

  const fetchBranches = async () => {
    try {
      const response = await adminApi.get('/admin/branches');
      setBranches(response.data);
    } catch (error) {
      toast.error('Erro ao carregar filiais');
    }
  };

  const loadDashboardAnalytics = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAnalytics(selectedBranchId);
      setAnalytics(data);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = (branchId: number | null) => {
    setSelectedBranchId(branchId);
  };

  // Debug logs
  useEffect(() => {
    if (analytics) {
      console.log('DEBUG analytics:', analytics);
      console.log('DEBUG product_metrics:', analytics.product_metrics);
    }
  }, [analytics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted-foreground">Carregando dados analíticos...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted-foreground">Erro ao carregar dados.</p>
        </div>
      </div>
    );
  }

  // Mapear dados do backend do dashboard (estrutura atualizada)
  const todaySales = Number(analytics.sales_today ?? 0);
  const todayOrders = Number(analytics.orders_today ?? 0);
  const thisMonthSales = Number(analytics.sales_month ?? 0);
  const thisYearSales = Number(analytics.sales_year ?? 0);
  const totalRevenue = Number(analytics.total_revenue ?? 0);
  const pendingOrders = Number(analytics.ticket_statistics?.awaiting_confirmation ?? 0);
  const totalProducts = Number(analytics.product_metrics?.total_products ?? 0);
  const availableProducts = Number(analytics.product_metrics?.available_products ?? 0);
  const lowStockProducts = Number(analytics.product_metrics?.low_stock_products ?? 0);
  const outOfStockProducts = Number(analytics.product_metrics?.out_of_stock_products ?? 0);

  return (
    <div className="space-y-6">;

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1>Dashboard - {STORE_CONFIG.name}</h1>
          <p className="text-muted-foreground">
            Visão geral das vendas e operações da loja
          </p>
          {!isMaster && userBranchId && (
            <Badge variant="outline" className="mt-2">
              📍 Visualizando apenas sua filial
            </Badge>
          )}
        </div>
        {isMaster && branches && branches.length > 0 && (
          <BranchSelector
            selectedBranchId={selectedBranchId}
            onBranchChange={handleBranchChange}
            branches={branches}
            showAllOption={true}
          />
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {todaySales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {todayOrders} pedidos hoje
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {thisMonthSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {/* Se quiser mostrar pedidos do mês, use statistics.totalOrders ou crie campo específico */}
              {/* {thisMonthOrders} pedidos este mês */}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Ano atual: R$ {thisYearSales.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Pagamento pendente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      {analytics.salesByDay && analytics.salesByDay.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Dia (Últimos 5 dias)</CardTitle>
              <CardDescription>Evolução das vendas diárias</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.salesByDay || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis tickFormatter={(value) => `R$ ${value}`} />
                  <Tooltip 
                    formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Vendas']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Mês</CardTitle>
              <CardDescription>Comparativo mensal</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.salesByMonth || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `R$ ${value}`} />
                  <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Vendas']} />
                  <Bar dataKey="amount" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Gráficos de Vendas</CardTitle>
            <CardDescription>Dados históricos não disponíveis no momento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className="text-muted-foreground">
                Os gráficos de vendas por dia e mês serão exibidos quando houver dados históricos disponíveis.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos (Mês)</CardTitle>
            <CardDescription>Ranking de produtos por quantidade vendida</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topProductsMonth && analytics.topProductsMonth.length > 0 ? (
                analytics.topProductsMonth.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{index + 1}º</Badge>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.quantity} unidades</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">R$ {Number(item.revenue || 0).toFixed(2)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">
                    Nenhum produto vendido este mês ainda.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Neighborhoods */}
        <Card>
          <CardHeader>
            <CardTitle>Bairros que Mais Compram</CardTitle>
            <CardDescription>Distribuição de vendas por região</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.neighborhoodsSales && analytics.neighborhoodsSales.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.neighborhoodsSales}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ neighborhood, sales }) => `${neighborhood} (${sales || 0})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {analytics.neighborhoodsSales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Receita']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Nenhum dado de vendas por bairro disponível ainda.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status do Estoque</CardTitle>
          <CardDescription>Controle de produtos disponíveis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{availableProducts}</div>
              <p className="text-sm text-muted-foreground">Disponíveis</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{lowStockProducts}</div>
              <p className="text-sm text-muted-foreground">Estoque Baixo</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{outOfStockProducts}</div>
              <p className="text-sm text-muted-foreground">Sem Estoque</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-sm text-muted-foreground">Total de Produtos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engajamento */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Engajamento</CardTitle>
          <CardDescription>Interações dos clientes com a loja</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Se houver dados de engajamento, exiba-os. Caso contrário, mostre zero. */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{analytics.engagement?.unique_visitors ?? 0}</div>
              <p className="text-sm text-muted-foreground">Visitantes Únicos</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{analytics.engagement?.pwa_installs ?? 0}</div>
              <p className="text-sm text-muted-foreground">Instalações PWA</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-700">{analytics.engagement?.carts_with_products ?? 0}</div>
              <p className="text-sm text-muted-foreground">Carrinhos com Produto</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Neighborhood Sales Detail */}
      {analytics.neighborhoodsSales && analytics.neighborhoodsSales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhes por Bairro</CardTitle>
            <CardDescription>Performance de vendas por localização</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.neighborhoodsSales.map((item, index) => (
                <div key={item.neighborhood}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{item.neighborhood}</p>
                        <p className="text-sm text-muted-foreground">{item.sales || 0} pedidos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">R$ {Number(item.revenue || 0).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        Ticket médio: R$ {(Number(item.revenue || 0) / (item.sales || 1)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {index < analytics.neighborhoodsSales.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}