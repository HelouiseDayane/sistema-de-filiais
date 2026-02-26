import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Package, MapPin, Store, Trophy, Calendar, AlertTriangle, Activity } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import adminApi from '../../api/admin';
import { toast } from 'sonner';
import { Branch } from '../../types/admin';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffa07a'];

export function MasterDashboard() {
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  
  // Estados para cada métrica
  const [masterMetrics, setMasterMetrics] = useState<any>(null);
  const [stockData, setStockData] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topNeighborhoods, setTopNeighborhoods] = useState<any[]>([]);
  
  // Estados para visualização temporal
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [timeSeriesPeriod, setTimeSeriesPeriod] = useState('daily');
  
  // Períodos para filtros
  const [productPeriod, setProductPeriod] = useState('month');
  const [neighborhoodPeriod, setNeighborhoodPeriod] = useState('month');
  
  // Estado para controlar a aba ativa
  const [activeTab, setActiveTab] = useState('stock');

  useEffect(() => {
    fetchBranches();
    fetchMasterMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (branches.length > 0) {
      fetchStockData();
      fetchTopProducts();
      fetchTopNeighborhoods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, productPeriod, neighborhoodPeriod]);

  useEffect(() => {
    if (branches.length > 0) {
      fetchTimeSeriesData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, timeSeriesPeriod]);

  const fetchBranches = async () => {
    try {
      const response = await adminApi.get('/admin/branches');
      const branchList = Array.isArray(response) ? response : response.data || [];
      setBranches(branchList.filter((b: Branch) => b.is_active));
    } catch (error) {
      console.error('Erro ao carregar filiais:', error);
      toast.error('Erro ao carregar filiais');
    }
  };

  const fetchMasterMetrics = async () => {
    setLoading(true);
    try {
      const data = await adminApi.get('/admin/master/metrics');
      setMasterMetrics(data);
    } catch (error) {
      console.error('Erro ao carregar métricas master:', error);
      toast.error('Erro ao carregar métricas gerais');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockData = async () => {
    try {
      const params = selectedBranchId && selectedBranchId !== 'all' 
        ? `?branch_id=${selectedBranchId}` 
        : '';
      const data = await adminApi.get(`/admin/master/stock${params}`);
      setStockData(data);
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
      toast.error('Erro ao carregar dados de estoque');
    }
  };

  const fetchTopProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBranchId && selectedBranchId !== 'all') {
        params.append('branch_id', selectedBranchId);
      }
      params.append('period', productPeriod);
      
      const data = await adminApi.get(`/admin/master/top-products?${params}`);
      setTopProducts(data.top_products || []);
    } catch (error) {
      console.error('Erro ao carregar produtos mais vendidos:', error);
    }
  };

  const fetchTopNeighborhoods = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBranchId && selectedBranchId !== 'all') {
        params.append('branch_id', selectedBranchId);
      }
      params.append('period', neighborhoodPeriod);
      
      const data = await adminApi.get(`/admin/master/top-neighborhoods?${params}`);
      setTopNeighborhoods(data.top_neighborhoods || []);
    } catch (error) {
      console.error('Erro ao carregar bairros:', error);
    }
  };

  const fetchTimeSeriesData = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBranchId && selectedBranchId !== 'all') {
        params.append('branch_id', selectedBranchId);
      }
      params.append('period', timeSeriesPeriod);
      
      const response = await adminApi.get(`/admin/master/time-series?${params}`);
      setTimeSeriesData(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados temporais:', error);
      toast.error('Erro ao carregar gráfico temporal');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  if (loading || !masterMetrics) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard Master</h1>
        <p className="text-muted-foreground">Carregando métricas gerais...</p>
      </div>
    );
  }

  const { branch_sales_ranking, branch_best_weeks, global_metrics } = masterMetrics;

  return (
    <div className="space-y-4 md:space-y-6 pb-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="space-y-2 px-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Dashboard Master</h1>
        <p className="text-muted-foreground text-sm sm:text-base md:text-lg">Visão completa de todas as filiais</p>
      </div>

      {/* Métricas Globais */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4 px-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{formatCurrency(global_metrics.total_revenue)}</div>
            <p className="text-xs text-muted-foreground">Todas as filiais</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pedidos Totais</CardTitle>
            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{global_metrics.total_orders}</div>
            <p className="text-xs text-muted-foreground">Todos os tempos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Hoje</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{formatCurrency(global_metrics.revenue_today)}</div>
            <p className="text-xs text-muted-foreground">{global_metrics.total_orders_today} pedidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Este Mês</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{formatCurrency(global_metrics.revenue_this_month)}</div>
            <p className="text-xs text-muted-foreground">Faturamento mensal</p>
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Filiais */}
      <Card className="mx-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
            Ranking de Filiais - Vendas Totais
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Filiais que mais vendem (todos os tempos)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {branch_sales_ranking.map((branch: any, index: number) => (
              <div key={branch.id} className="flex items-center justify-between border-b pb-3 last:border-0 gap-2">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-base flex-shrink-0 ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                    index === 1 ? 'bg-gray-100 text-gray-800' :
                    index === 2 ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-50 text-blue-800'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm sm:text-base truncate">{branch.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Código: {branch.code}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm sm:text-base md:text-lg">{formatCurrency(branch.total_revenue)}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{branch.total_orders} pedidos</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seletor Global de Filial */}
      <Card className="border-2 border-primary/20 bg-primary/5 mx-1">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Store className="h-4 w-4 sm:h-5 sm:w-5" />
                Filtro Global de Filial
              </CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">Selecione uma filial para filtrar todos os dados abaixo</CardDescription>
            </div>
            <Select value={selectedBranchId || 'all'} onValueChange={(value: string) => setSelectedBranchId(value === 'all' ? null : value)}>
              <SelectTrigger className="w-full h-10 sm:h-11 font-semibold text-sm sm:text-base">
                <SelectValue placeholder="Selecionar filial" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="all" className="font-semibold">
                  🏢 Todas as filiais
                </SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    📍 {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Melhor Semana por Filial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Melhor Semana de Cada Filial (Últimas 12 Semanas)
          </CardTitle>
          <CardDescription>Semana com maior faturamento por filial</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {branch_best_weeks.map((data: any) => (
              <div key={data.branch_id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{data.branch_name}</p>
                    <p className="text-sm text-muted-foreground">Código: {data.branch_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(data.best_week_revenue)}</p>
                    <p className="text-xs text-muted-foreground">Semana {data.best_week}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={data.weekly_data}>
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} dot={false} />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      labelFormatter={(label) => `Semana ${label}`}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Evolução Temporal */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <div>
                <CardTitle>Evolução Temporal</CardTitle>
                <CardDescription>Faturamento ao longo do tempo</CardDescription>
              </div>
            </div>
            <Select value={selectedBranchId || 'all'} onValueChange={(value: string) => setSelectedBranchId(value === 'all' ? null : value)}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Selecionar filial" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="all">Todas as filiais</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="border-b pb-4">
            <Select value={timeSeriesPeriod} onValueChange={setTimeSeriesPeriod}>
              <SelectTrigger className="w-full h-10 sm:h-11">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="biweekly">Quinzenal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
            
          {timeSeriesData.length > 0 ? (
            <div className="space-y-4 -mx-2 sm:mx-0">
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={300} minWidth={300}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), 'Faturamento']}
                      labelStyle={{ color: '#000' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3 pt-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-blue-900">Total do Período</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(timeSeriesData.reduce((acc, item) => acc + item.revenue, 0))}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-green-900">Média por Período</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(timeSeriesData.reduce((acc, item) => acc + item.revenue, 0) / timeSeriesData.length)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-purple-900">Total de Pedidos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-purple-900">
                      {timeSeriesData.reduce((acc, item) => acc + item.orders, 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              <p>Nenhum dado disponível para o período selecionado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs com Filtros por Filial */}
      <div className="space-y-4 sm:space-y-6 pt-4 px-1">
        <div className="border-t pt-6 sm:pt-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Análises Detalhadas</h2>
              <p className="text-muted-foreground text-xs sm:text-sm md:text-base">Estoque, produtos e bairros por filial</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full h-11 sm:h-12 font-semibold">
              <SelectValue placeholder="Selecione uma análise" />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="stock">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Estoque
                </div>
              </SelectItem>
              <SelectItem value="products">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Produtos Mais Vendidos
                </div>
              </SelectItem>
              <SelectItem value="neighborhoods">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Bairros que Mais Compram
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* TAB: ESTOQUE */}
          {activeTab === 'stock' && (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">Estoque por Filial</CardTitle>
                    <CardDescription className="mt-1">Visualize o estoque de cada filial ou geral</CardDescription>
                  </div>
                  <Select value={selectedBranchId || 'all'} onValueChange={(value: string) => setSelectedBranchId(value === 'all' ? null : value)}>
                    <SelectTrigger className="w-full md:w-[250px]">
                      <SelectValue placeholder="Todas as filiais" />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="all">Todas as filiais</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              
              <CardContent>
                  {stockData && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total de Produtos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{stockData.summary.total_products}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-green-600">Disponíveis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-green-600">
                          {selectedBranchId && selectedBranchId !== 'all' 
                            ? stockData.summary.available 
                            : stockData.summary.total_available}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-orange-600">Estoque Baixo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-orange-600">
                          {selectedBranchId && selectedBranchId !== 'all' 
                            ? stockData.summary.low_stock 
                            : stockData.summary.total_low_stock}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-red-600">Sem Estoque</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-red-600">
                          {selectedBranchId && selectedBranchId !== 'all' 
                            ? stockData.summary.out_of_stock 
                            : stockData.summary.total_out_of_stock}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tabela ou Cards de Estoque */}
                  {selectedBranchId && selectedBranchId !== 'all' ? (
                    <div className="border rounded-lg">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-3 text-left">Produto</th>
                            <th className="p-3 text-right">Quantidade</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockData.products.map((product: any) => (
                            <tr key={product.id} className="border-b last:border-0">
                              <td className="p-3">{product.name}</td>
                              <td className="p-3 text-right font-bold">{product.quantity}</td>
                              <td className="p-3 text-center">
                                {product.status === 'available' && (
                                  <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Disponível</span>
                                )}
                                {product.status === 'low' && (
                                  <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">Baixo</span>
                                )}
                                {product.status === 'out' && (
                                  <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">Esgotado</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {stockData.products.map((branch: any) => (
                        <Card key={branch.branch_id}>
                          <CardHeader>
                            <CardTitle className="text-lg">{branch.branch_name}</CardTitle>
                            <CardDescription>Código: {branch.branch_code}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">Total de Produtos:</span>
                              <span className="font-bold">{branch.total_products}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Quantidade Total:</span>
                              <span className="font-bold">{branch.total_quantity}</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                              <span className="text-sm">Disponíveis:</span>
                              <span className="font-bold">{branch.available}</span>
                            </div>
                            <div className="flex justify-between text-orange-600">
                              <span className="text-sm">Estoque Baixo:</span>
                              <span className="font-bold">{branch.low_stock}</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                              <span className="text-sm">Sem Estoque:</span>
                              <span className="font-bold">{branch.out_of_stock}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB: PRODUTOS MAIS VENDIDOS */}
        {activeTab === 'products' && (
          <Card>
                <CardHeader className="pb-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl">Produtos Mais Vendidos</CardTitle>
                      <CardDescription className="mt-1">Top 10 produtos por quantidade vendida</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                      <Select value={productPeriod} onValueChange={setProductPeriod}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          <SelectItem value="week">Esta Semana</SelectItem>
                          <SelectItem value="month">Este Mês</SelectItem>
                          <SelectItem value="year">Este Ano</SelectItem>
                          <SelectItem value="all">Todos os Tempos</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={selectedBranchId || 'all'} onValueChange={(value: string) => setSelectedBranchId(value === 'all' ? null : value)}>
                        <SelectTrigger className="w-full sm:w-[250px]">
                          <SelectValue placeholder="Todas as filiais" />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          <SelectItem value="all">Todas as filiais</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
              
                <CardContent>
                  <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <ResponsiveContainer width="100%" height={350} minWidth={300}>
                      <BarChart data={topProducts}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip 
                          formatter={(value: any, name: string) => {
                            if (name === 'total_revenue') return formatCurrency(value);
                            return value;
                          }}
                          labelFormatter={(label) => `Produto: ${label}`}
                        />
                        <Bar dataKey="total_quantity" fill="#8884d8" name="Quantidade" />
                        <Bar dataKey="total_revenue" fill="#82ca9d" name="Faturamento" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
          )}

          {/* TAB: BAIRROS QUE MAIS COMPRAM */}
          {activeTab === 'neighborhoods' && (
            <Card>
                <CardHeader className="pb-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Bairros que Mais Compram
                      </CardTitle>
                      <CardDescription className="mt-1">Top 10 bairros por número de pedidos</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                      <Select value={neighborhoodPeriod} onValueChange={setNeighborhoodPeriod}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          <SelectItem value="week">Esta Semana</SelectItem>
                          <SelectItem value="month">Este Mês</SelectItem>
                          <SelectItem value="year">Este Ano</SelectItem>
                          <SelectItem value="all">Todos os Tempos</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={selectedBranchId || 'all'} onValueChange={(value: string) => setSelectedBranchId(value === 'all' ? null : value)}>
                        <SelectTrigger className="w-full sm:w-[250px]">
                          <SelectValue placeholder="Todas as filiais" />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          <SelectItem value="all">Todas as filiais</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
              
                <CardContent>
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                    {/* Lista */}
                    <div className="space-y-3 order-2 lg:order-1">
                      {topNeighborhoods.map((neighborhood: any, index: number) => (
                        <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0 gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm sm:text-base truncate">{neighborhood.neighborhood}</p>
                              <p className="text-xs text-muted-foreground">{neighborhood.total_orders} pedidos</p>
                            </div>
                          </div>
                          <p className="font-bold text-sm sm:text-base flex-shrink-0">{formatCurrency(neighborhood.total_revenue)}</p>
                        </div>
                      ))}
                    </div>

                    {/* Gráfico Pizza */}
                    <div className="overflow-x-auto order-1 lg:order-2 -mx-2 sm:mx-0">
                      <ResponsiveContainer width="100%" height={300} minWidth={250}>
                        <PieChart>
                          <Pie
                            data={topNeighborhoods}
                            dataKey="total_orders"
                            nameKey="neighborhood"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={(entry) => entry.neighborhood}
                            labelStyle={{ fontSize: 10 }}
                          >
                            {topNeighborhoods.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => `${value} pedidos`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
          )}
        </div>
      </div>
    </div>
  );
}
