import React, { useState, useEffect } from 'react';
import { Building2, Users, Target, MoreVertical, CheckCircle, XCircle, Trash2, Eye, AlertCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAdminTenants, updateTenantStatus, deleteTenant, AdminTenant } from '../../lib/api';
import { showToast } from '../../components/NotificationToast';

const ITEMS_PER_PAGE = 10;

const AdminTenants: React.FC = () => {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showOptionsId, setShowOptionsId] = useState<string | null>(null);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const data = await getAdminTenants({ 
        status: filter || undefined,
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      });
      setTenants(data.tenants);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل المنظمات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, [filter, page]);

  // Filter tenants by search query (client-side)
  const filteredTenants = searchQuery
    ? tenants.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tenants;

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handleStatusChange = async (id: string, newStatus: 'ACTIVE' | 'SUSPENDED') => {
    try {
      await updateTenantStatus(id, newStatus);
      showToast('SUCCESS', 'تم التحديث', `تم ${newStatus === 'ACTIVE' ? 'تفعيل' : 'تعليق'} المنظمة`);
      loadTenants();
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل تحديث الحالة');
    }
    setShowOptionsId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف "${name}"؟ سيتم حذف جميع البيانات المرتبطة بها.`)) return;
    
    try {
      await deleteTenant(id);
      showToast('SUCCESS', 'تم الحذف', 'تم حذف المنظمة بنجاح');
      loadTenants();
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل حذف المنظمة');
    }
    setShowOptionsId(null);
  };

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', label: 'نشط' },
    SUSPENDED: { bg: 'bg-red-100', text: 'text-red-700', label: 'معلق' },
    PENDING_VERIFICATION: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'قيد التحقق' },
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4">
        <AlertCircle className="text-red-500" size={24} />
        <div>
          <h3 className="font-bold text-red-800">خطأ</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">إدارة المنظمات</h1>
          <p className="text-gray-500 font-medium">إجمالي {total} منظمة</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو البريد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl pr-10 pl-4 py-2 font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            className="bg-white border border-gray-200 rounded-xl px-4 py-2 font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">جميع الحالات</option>
            <option value="ACTIVE">نشط</option>
            <option value="SUSPENDED">معلق</option>
            <option value="PENDING_VERIFICATION">قيد التحقق</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">المنظمة</th>
                <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">المالك</th>
                <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">الإحصائيات</th>
                <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">الحالة</th>
                <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTenants.map((tenant) => {
                const status = statusColors[tenant.status] || statusColors.ACTIVE;
                return (
                  <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link to={`/admin/tenants/${tenant.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="p-2 bg-blue-100 rounded-xl">
                          <Building2 className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{tenant.name}</p>
                          <p className="text-xs text-gray-400">{tenant.slug}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {tenant.owner ? (
                        <div>
                          <p className="font-bold text-gray-700">{tenant.owner.name}</p>
                          <p className="text-xs text-gray-400">{tenant.owner.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-gray-600">
                          <Users size={14} /> {tenant.stats.users}
                        </span>
                        <span className="flex items-center gap-1 text-gray-600">
                          <Target size={14} /> {tenant.stats.leads}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <button
                          onClick={() => setShowOptionsId(showOptionsId === tenant.id ? null : tenant.id)}
                          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                          <MoreVertical size={18} className="text-gray-400" />
                        </button>
                        {showOptionsId === tenant.id && (
                          <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden">
                            {tenant.status === 'ACTIVE' ? (
                              <button
                                onClick={() => handleStatusChange(tenant.id, 'SUSPENDED')}
                                className="w-full text-right px-4 py-3 text-sm font-bold text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                              >
                                <XCircle size={16} /> تعليق المنظمة
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusChange(tenant.id, 'ACTIVE')}
                                className="w-full text-right px-4 py-3 text-sm font-bold text-green-600 hover:bg-green-50 flex items-center gap-2"
                              >
                                <CheckCircle size={16} /> تفعيل المنظمة
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(tenant.id, tenant.name)}
                              className="w-full text-right px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 size={16} /> حذف المنظمة
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTenants.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              لا توجد منظمات
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm text-gray-500">
            عرض {((page - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(page * ITEMS_PER_PAGE, total)} من {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
            <span className="px-4 py-2 font-bold text-gray-700">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTenants;
