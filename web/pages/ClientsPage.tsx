import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, Search, MoreHorizontal, Globe, AlertCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import EmptyState from '../components/EmptyState';
import { getClients, Client } from '../lib/clients-api';

const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getClients();
      setClients(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل العملاء');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <p className="text-red-600 font-bold mb-4">{error}</p>
        <button 
          onClick={loadClients}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="العملاء"
        subtitle="إدارة عملاء الوكالة ومنصاتهم"
        actions={
          <button 
            onClick={() => navigate('/app/clients/new')}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            <Plus size={20} />
            إضافة عميل
          </button>
        }
      />

      {clients.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="البحث في العملاء..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-96 pr-12 pl-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
        </div>
      )}

      {filteredClients.length === 0 ? (
        <EmptyState 
          icon={Building2}
          title="لا يوجد عملاء بعد"
          description="ابدأ بإضافة أول عميل لإدارة محتواه على منصات التواصل الاجتماعي"
          action={
            <button 
              onClick={() => navigate('/app/clients/new')}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              إضافة عميل جديد
            </button>
          }
        />
      ) : (
        <DataTable<Client>
          data={filteredClients}
          columns={[
            {
              header: 'العميل',
              accessor: (client) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                    {client.logoUrl ? (
                      <img src={client.logoUrl} alt={client.name} className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      client.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{client.name}</p>
                    {client.industry && <p className="text-xs text-gray-500">{client.industry}</p>}
                  </div>
                </div>
              ),
            },
            {
              header: 'المنصات',
              accessor: (client) => (
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-gray-400" />
                  <span className="font-bold text-gray-700">{client.platformsCount}</span>
                </div>
              ),
            },
            {
              header: 'الحالة',
              accessor: (client) => (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  client.status === 'ACTIVE' 
                    ? 'bg-green-50 text-green-600' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {client.status === 'ACTIVE' ? 'نشط' : 'مؤرشف'}
                </span>
              ),
            },
          ]}
          onRowClick={(client) => navigate(`/app/clients/${client.id}`)}
          actions={(client) => (
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreHorizontal size={18} className="text-gray-400" />
            </button>
          )}
        />
      )}
    </div>
  );
};

export default ClientsPage;
