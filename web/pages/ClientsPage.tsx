import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, Search, MoreHorizontal, Globe, AlertCircle, Eye, Edit, Trash2, Archive } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import EmptyState from '../components/EmptyState';
import { getClients, deleteClient, updateClient, Client } from '../lib/clients-api';

const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
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

  const handleDelete = async (client: Client) => {
    if (window.confirm(`هل أنت متأكد من حذف العميل "${client.name}"؟`)) {
      try {
        await deleteClient(client.id);
        setClients(clients.filter(c => c.id !== client.id));
        setOpenDropdown(null);
      } catch (err: any) {
        alert(err.message || 'حدث خطأ أثناء حذف العميل');
      }
    }
  };

  const handleArchive = async (client: Client) => {
    try {
      const newStatus = client.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
      await updateClient(client.id, { status: newStatus });
      setClients(clients.map(c => 
        c.id === client.id ? { ...c, status: newStatus } : c
      ));
      setOpenDropdown(null);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تحديث حالة العميل');
    }
  };

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
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(openDropdown === client.id ? null : client.id);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreHorizontal size={18} className="text-gray-400" />
              </button>
              
              {openDropdown === client.id && (
                <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 min-w-[160px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/app/clients/${client.id}`);
                      setOpenDropdown(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 text-right"
                  >
                    <Eye size={16} />
                    <span className="font-medium">عرض التفاصيل</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/app/clients/${client.id}/edit`);
                      setOpenDropdown(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 text-right"
                  >
                    <Edit size={16} />
                    <span className="font-medium">تعديل</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchive(client);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 text-right"
                  >
                    <Archive size={16} />
                    <span className="font-medium">{client.status === 'ACTIVE' ? 'أرشفة' : 'تفعيل'}</span>
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(client);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 text-right"
                  >
                    <Trash2 size={16} />
                    <span className="font-medium">حذف</span>
                  </button>
                </div>
              )}
            </div>
          )}
        />
      )}
    </div>
  );
};

export default ClientsPage;
