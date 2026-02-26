import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import adminApi from '../../api/admin';
import { Branch } from '../../types/admin';

interface Address {
  id: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  ponto_referencia?: string;
  horario_abertura?: string;
  horario_fechamento?: string;
  ativo?: boolean;
  branch_id?: number;
  branch?: {
    id: number;
    name: string;
    code: string;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const getHeaders = () => {
  const token = localStorage.getItem('admin_token');
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export function AddressesManagement() {
  // Corrige ícone padrão do marcador do Leaflet
  const defaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
  // Componente para selecionar localização no mapa
  function LocationPicker({ setLatLng }: { setLatLng: (lat: string, lng: string) => void }) {
    useMapEvents({
      click(e) {
        setLatLng(e.latlng.lat.toString(), e.latlng.lng.toString());
      },
    });
    return null;
  }
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Address | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const currentAdmin = JSON.parse(localStorage.getItem('bruno_admin') || '{}');
  const isMaster = currentAdmin?.role === 'master';
  const userBranchId = currentAdmin?.branch_id;
  
  console.log('🏢 Estado atual de branches:', branches);
  console.log('👤 Usuário atual:', { role: currentAdmin?.role, branch_id: userBranchId });
  
  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];
  const [form, setForm] = useState<Omit<Address, 'id'> & { latitude?: string; longitude?: string }>({
    rua: '', numero: '', bairro: '', cidade: '', estado: 'RN', ponto_referencia: '', horario_abertura: '', horario_fechamento: '', latitude: '', longitude: '', branch_id: isMaster ? undefined : userBranchId
  });
  // Preencher endereço via geolocalização (com fallback)
  const handleFillAddressByLocation = async () => {
    if (!form.latitude || !form.longitude) {
      setError('Informe latitude e longitude');
      return;
    }
    setLoading(true);
    setError(null);
    
    console.log('🔍 Iniciando busca de endereço...', { lat: form.latitude, lon: form.longitude });
    
    try {
      let data: any = null;
      
      // Tentativa 1: Via backend (pode ter timeout se servidor bloquear Nominatim)
      try {
        console.log('🔄 Tentativa 1: Buscando via backend...');
        const backendUrl = `${API_BASE_URL}/geocode/reverse?lat=${form.latitude}&lon=${form.longitude}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const backendRes = await fetch(backendUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (backendRes.ok) {
          data = await backendRes.json();
          console.log('✅ Backend respondeu:', data);
        } else {
          console.warn('⚠️ Backend retornou erro:', backendRes.status);
        }
      } catch (backendError: any) {
        console.warn('⚠️ Backend geocode falhou:', backendError.message);
      }
      
      // Tentativa 2: Direto do navegador (fallback)
      if (!data) {
        console.log('🌐 Tentativa 2: Buscando direto do Nominatim...');
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${form.latitude}&lon=${form.longitude}`;
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
        
        const nominatimRes = await fetch(nominatimUrl, {
          headers: { 
            'User-Agent': 'BrunoCakes/1.0',
            'Accept': 'application/json'
          },
          signal: controller2.signal
        });
        clearTimeout(timeoutId2);
        
        if (!nominatimRes.ok) {
          throw new Error(`Nominatim retornou erro: ${nominatimRes.status}`);
        }
        data = await nominatimRes.json();
        console.log('✅ Nominatim respondeu:', data);
      }
      
      if (!data || !data.address) {
        throw new Error('Nenhum endereço encontrado para esta localização');
      }
      
      const addr = data.address;
      console.log('📍 Dados do endereço:', addr);
      
      // Mapeamento de estados para siglas
      const estadosMap: Record<string, string> = {
        'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM', 'Bahia': 'BA', 'Ceará': 'CE',
        'Distrito Federal': 'DF', 'Espírito Santo': 'ES', 'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT',
        'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
        'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
        'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
        'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO'
      };
      
      let estado = addr.state_code || addr.state || addr.region || '';
      if (estado && estado.length > 2 && estadosMap[estado]) {
        estado = estadosMap[estado];
      }
      
      const numero = addr.house_number || addr.number || addr['addr:housenumber'] || '';
      
      const endereco = {
        rua: addr.road || addr.street || addr['addr:street'] || '',
        numero,
        bairro: addr.suburb || addr.neighbourhood || addr.village || addr.town || '',
        cidade: addr.city || addr.town || addr.village || '',
        estado,
      };
      
      console.log('📝 Endereço formatado:', endereco);
      
      setForm(f => ({ ...f, ...endereco }));
      console.log('✅ Formulário preenchido com sucesso!');
      
    } catch (e: any) {
      const errorMsg = e.message || 'Erro ao buscar endereço. Verifique sua conexão.';
      setError(errorMsg);
      console.error('❌ Erro fatal ao preencher endereço:', e);
      alert(`Erro ao buscar endereço: ${errorMsg}\n\nTente novamente ou preencha manualmente.`);
    } finally {
      setLoading(false);
    }
  };

  // Carregar endereços
  const fetchAddresses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/addresses`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Erro ao buscar endereços');
      const data = await res.json();
      let active = null;
      setAddresses(
        (Array.isArray(data) ? data : []).map((a: any) => {
          let horario_abertura = '', horario_fechamento = '';
          if (a.horarios && typeof a.horarios === 'string' && (a.horarios.includes('até') || a.horarios.includes('-'))) {
            if (a.horarios.includes('até')) {
              [horario_abertura, horario_fechamento] = a.horarios.split('até').map((s: string) => s.trim());
            } else if (a.horarios.includes('-')) {
              [horario_abertura, horario_fechamento] = a.horarios.split('-').map((s: string) => s.trim());
            }
          } else {
            horario_abertura = a.horario_abertura || '';
            horario_fechamento = a.horario_fechamento || '';
          }
          if (a.ativo) active = a.id;
          return { ...a, horario_abertura, horario_fechamento };
        })
      );
      if (active) setActiveId(active);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Ativar endereço
  const handleActivate = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/addresses/${id}/activate`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Erro ao ativar endereço');
      setActiveId(id);
      await fetchAddresses();
      
      // Dispara evento via localStorage para sincronizar entre abas
      const timestamp = Date.now().toString();
      localStorage.setItem('address_updated', timestamp);
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'address_updated',
        newValue: timestamp,
        url: window.location.href
      }));
      console.log('✅ Evento address-updated disparado via localStorage (ativação)');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Alternar status ativo/inativo (checkout) do endereço
  const handleToggleActive = async (addr: Address) => {
    setLoading(true);
    setError(null);
    try {
      if (addr.ativo) {
        // Desativar endereço atual
        const res = await fetch(`${API_BASE_URL}/admin/addresses/${addr.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ ativo: false }),
        });
        if (!res.ok) throw new Error('Erro ao desativar endereço');
        if (activeId === addr.id) setActiveId(null);
      } else {
        // Ativar endereço selecionado
        const res = await fetch(`${API_BASE_URL}/admin/addresses/${addr.id}/activate`, {
          method: 'PATCH',
          headers: getHeaders(),
        });
        if (!res.ok) throw new Error('Erro ao ativar endereço');
        setActiveId(addr.id);
      }
      await fetchAddresses();
      
      // Dispara evento via localStorage para sincronizar entre abas
      const timestamp = Date.now().toString();
      localStorage.setItem('address_updated', timestamp);
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'address_updated',
        newValue: timestamp,
        url: window.location.href
      }));
      console.log('✅ Evento address-updated disparado via localStorage (toggle)');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchAddresses(); 
    fetchBranches();
  }, []);
  
  const fetchBranches = async () => {
    // Apenas master precisa carregar lista de filiais
    if (!isMaster) return;
    
    try {
      const data = await adminApi.get('/admin/branches');
      console.log('🔍 Filiais carregadas:', data);
      // Filtrar apenas filiais ativas
      const activeBranches = Array.isArray(data) ? data.filter((b: any) => b.is_active) : [];
      setBranches(activeBranches);
    } catch (error) {
      console.error('Erro ao carregar filiais:', error);
      setBranches([]);
    }
  };

  // Handlers de formulário
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleEdit = (address: Address) => {
    setEditing(address);
    setForm({
      rua: address.rua,
      numero: address.numero,
      bairro: address.bairro,
      cidade: address.cidade,
      estado: address.estado,
      ponto_referencia: address.ponto_referencia || '',
      horario_abertura: address.horario_abertura || '',
      horario_fechamento: address.horario_fechamento || '',
      latitude: (address as any).latitude || '',
      longitude: (address as any).longitude || '',
      branch_id: address.branch_id,
    });
  };

  const handleCancel = () => {
    setEditing(null);
  setForm({ rua: '', numero: '', bairro: '', cidade: '', estado: 'RN', ponto_referencia: '', horario_abertura: '', horario_fechamento: '', latitude: '', longitude: '' });
  };

  // Adicionar ou atualizar endereço
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing
        ? `${API_BASE_URL}/admin/addresses/${editing.id}`
        : `${API_BASE_URL}/admin/addresses`;
      const payload = {
        ...form,
        horarios: form.horario_abertura && form.horario_fechamento
          ? `${form.horario_abertura} até ${form.horario_fechamento}`
          : '',
        latitude: typeof form.latitude === 'string' ? form.latitude : (form.latitude ? String(form.latitude) : ''),
        longitude: typeof form.longitude === 'string' ? form.longitude : (form.longitude ? String(form.longitude) : ''),
      };
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erro ao salvar endereço');
      await fetchAddresses();
      handleCancel();
      
      // Dispara evento via localStorage para sincronizar entre abas
      const timestamp = Date.now().toString();
      localStorage.setItem('address_updated', timestamp);
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'address_updated',
        newValue: timestamp,
        url: window.location.href
      }));
      console.log(`✅ Evento address-updated disparado via localStorage (${editing ? 'atualização' : 'criação'})`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Excluir endereço
  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este endereço?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/addresses/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Erro ao excluir endereço');
      await fetchAddresses();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Gerenciar Endereços</h1>
      <p className="text-muted-foreground mb-4">Cadastre, edite e remova endereços de retirada ou entrega.</p>

      {/* Informação da filial para funcionários/admins */}
      {!isMaster && userBranchId && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>📍 Você está gerenciando endereços da sua filial</strong>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Todos os endereços criados serão automaticamente vinculados à sua filial.
          </p>
        </div>
      )}

      {/* Formulário de cadastro/edição */}
      <form onSubmit={handleSubmit} className="mb-6 space-y-2 bg-white p-4 rounded shadow">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
    <div style={{ gridColumn: '1 / -1', marginBottom: 12 }}>
      <label className="block mb-2 font-semibold">Selecione a localização no mapa:</label>
      <MapContainer
        center={form.latitude && form.longitude ? [parseFloat(form.latitude), parseFloat(form.longitude)] : [-5.7945, -35.211]}
        zoom={15}
        style={{ height: '300px', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <LocationPicker setLatLng={(lat, lng) => {
          setForm(f => ({ ...f, latitude: lat, longitude: lng }));
          setTimeout(() => handleFillAddressByLocation(), 100); // Preencher endereço após selecionar
        }} />
        {form.latitude && form.longitude && (
          <Marker position={[parseFloat(form.latitude), parseFloat(form.longitude)]} icon={defaultIcon} />
        )}
      </MapContainer>
      <small className="text-gray-500">Clique no mapa para definir a localização exata.</small>
    </div>
          <input
            name="latitude"
            value={form.latitude || ''}
            onChange={handleChange}
            placeholder="Latitude"
            style={{border:'1px solid #ccc',borderRadius:4,padding:8,marginBottom:4}}
            type="text"
          />
          <input
            name="longitude"
            value={form.longitude || ''}
            onChange={handleChange}
            placeholder="Longitude"
            style={{border:'1px solid #ccc',borderRadius:4,padding:8,marginBottom:4}}
            type="text"
          />
          <button
            type="button"
            style={{ background: '#38bdf8', color: '#fff', border: '2px solid #0ea5e9', borderRadius: 6, minWidth: 160, fontWeight: 600, padding: '8px 20px', boxShadow: '0 1px 4px #0ea5e933', transition: 'background 0.2s', marginBottom: 4 }}
            onClick={handleFillAddressByLocation}
            disabled={loading}
          >
            Preencher endereço pela localização
          </button>
          <input name="rua" value={form.rua} onChange={handleChange} required placeholder="Rua" style={{border:'1px solid #ccc',borderRadius:4,padding:8,marginBottom:4}} />
          <input name="numero" value={form.numero} onChange={handleChange} required placeholder="Número" style={{border:'1px solid #ccc',borderRadius:4,padding:8,marginBottom:4}} />
          <input name="bairro" value={form.bairro} onChange={handleChange} required placeholder="Bairro" style={{border:'1px solid #ccc',borderRadius:4,padding:8,marginBottom:4}} />
          <input name="cidade" value={form.cidade} onChange={handleChange} required placeholder="Cidade" style={{border:'1px solid #ccc',borderRadius:4,padding:8,marginBottom:4}} />
          <select
            name="estado"
            value={form.estado}
            onChange={handleChange}
            required
            style={{border:'1px solid #ccc',borderRadius:4,padding:8,marginBottom:4}}
          >
            <option value="">Selecione o estado</option>
            {estados.map(uf => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          
          {/* Campo de seleção de filial apenas para master */}
          {isMaster && (
            <select
              name="branch_id"
              value={form.branch_id || ''}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value ? parseInt(e.target.value) : undefined })}
              required
              style={{border:'1px solid #ccc',borderRadius:4,padding:8,marginBottom:4}}
            >
              <option value="">Selecione a filial</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>
              ))}
            </select>
          )}
          
          <input name="ponto_referencia" value={form.ponto_referencia} onChange={handleChange} placeholder="Ponto de Referência" style={{border:'1px solid #ccc',borderRadius:4,padding:8,marginBottom:4}} />
          <input
            type="time"
            name="horario_abertura"
            value={form.horario_abertura}
            onChange={handleChange}
            placeholder="Abertura"
            style={{border:'1px solid #ccc',borderRadius:4,padding:8,marginBottom:4}}
            min="00:00"
            max="23:59"
            required
          />
          <input
            type="time"
            name="horario_fechamento"
            value={form.horario_fechamento}
            onChange={handleChange}
            placeholder="Fechamento"
            style={{border:'1px solid #ccc',borderRadius:4,padding:8,marginBottom:4}}
            min="00:00"
            max="23:59"
            required
          />
        </div>
        <div className="flex gap-2 mt-2">
            <button
              type="submit"
              style={editing
                ? { background: '#facc15', color: '#222', border: '2px solid #eab308', borderRadius: 6, minWidth: 160, fontWeight: 600, padding: '8px 20px', boxShadow: '0 1px 4px #eab30833', transition: 'background 0.2s' }
                : { background: '#22c55e', color: '#fff', border: '2px solid #16a34a', borderRadius: 6, minWidth: 160, fontWeight: 600, padding: '8px 20px', boxShadow: '0 1px 4px #16a34a33', transition: 'background 0.2s' }
              }
              disabled={loading}
            >
              {editing ? 'Salvar Alterações' : 'Adicionar Endereço'}
            </button>
            {editing && (
              <button
                type="button"
                style={{ marginLeft: 8, background: '#e5e7eb', color: '#222', border: '2px solid #9ca3af', borderRadius: 6, fontWeight: 600, padding: '8px 20px', boxShadow: '0 1px 4px #9ca3af33', transition: 'background 0.2s' }}
                onClick={handleCancel}
                disabled={loading}
              >
                Cancelar
              </button>
            )}
        </div>
        {error && <div className="text-red-500">{error}</div>}
      </form>

      {/* Lista de endereços */}
      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">Rua</th>
              <th className="px-3 py-2 text-left">Número</th>
              <th className="px-3 py-2 text-left">Bairro</th>
              <th className="px-3 py-2 text-left">Horários</th>
              <th className="px-3 py-2 text-center">Ações</th>
              <th className="px-3 py-2 text-center">Checkout</th>
            </tr>
          </thead>
          <tbody>
            {addresses.map(address => {
              const rua = address.rua ?? '';
              const numero = address.numero ?? '';
              const bairro = address.bairro ?? '';
              const isActive = address.id === activeId;
              return (
                <tr key={address.id} className={`hover:bg-gray-50 border-b last:border-b-0 ${isActive ? 'bg-green-50' : ''}`}>
                  <td className="px-3 py-2">{rua.length > 15 ? rua.slice(0, 15) + '…' : rua}</td>
                  <td className="px-3 py-2">{numero.length > 15 ? numero.slice(0, 15) + '…' : numero}</td>
                  <td className="px-3 py-2">{bairro.length > 15 ? bairro.slice(0, 15) + '…' : bairro}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block bg-blue-100 text-blue-800 rounded px-2 py-1 text-xs font-semibold mr-2">
                      {address.horario_abertura} - {address.horario_fechamento}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      style={{ background: '#facc15', color: '#222', border: '1px solid #eab308', borderRadius: 4, padding: '4px 12px', fontWeight: 600, marginRight: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={() => handleEdit(address)}
                      disabled={loading}
                      title="Editar"
                    >
                      Editar
                    </button>
                    <button
                      style={{ background: '#ef4444', color: '#fff', border: '1px solid #b91c1c', borderRadius: 4, padding: '4px 12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={() => handleDelete(address.id)}
                      disabled={loading}
                      title="Excluir"
                    >
                      Excluir
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span
                        className={
                          `inline-block rounded-full px-3 py-1 text-xs font-semibold border ` +
                          (address.ativo
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200')
                        }
                      >
                        {address.ativo ? 'Checkout' : 'Inativo'}
                      </span>
                      <button
                        style={{
                          background: address.ativo ? '#22c55e' : '#e5e7eb',
                          color: address.ativo ? '#fff' : '#222',
                          border: address.ativo ? '1px solid #16a34a' : '1px solid #9ca3af',
                          borderRadius: 20,
                          padding: '6px 24px',
                          fontWeight: 600,
                          minWidth: 120,
                          boxShadow: address.ativo ? '0 1px 4px #16a34a33' : '0 1px 4px #9ca3af33',
                          transition: 'background 0.2s',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8
                        }}
                        disabled={loading}
                        onClick={async () => {
                            setLoading(true);
                            await fetch(`${API_BASE_URL}/admin/addresses/${address.id}/activate`, { method: 'PATCH', headers: getHeaders() });
                            await fetchAddresses();
                            setLoading(false);
                            
                            // Dispara evento via localStorage para sincronizar entre abas
                            const timestamp = Date.now().toString();
                            localStorage.setItem('address_updated', timestamp);
                            window.dispatchEvent(new StorageEvent('storage', {
                              key: 'address_updated',
                              newValue: timestamp,
                              url: window.location.href
                            }));
                            console.log('✅ Evento address-updated disparado via localStorage (checkout toggle)');
                          }}
                        title={address.ativo ? 'Desligar checkout' : 'Ligar checkout'}
                      >
                        <span style={{
                          display: 'inline-block',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: address.ativo ? '#16a34a' : '#9ca3af',
                          marginRight: 8,
                          transition: 'background 0.2s'
                        }} />
                        {address.ativo ? 'Checkout Ligado' : 'Checkout Desligado'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {addresses.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-4">Nenhum endereço cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
