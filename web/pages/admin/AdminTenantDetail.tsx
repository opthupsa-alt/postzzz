import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Building2, Users, Target, Briefcase, ArrowRight, CheckCircle, XCircle, Trash2, AlertCircle, Clock, Shield } from 'lucide-react';
import { getAdminTenant, updateTenantStatus, deleteTenant } from '../../lib/api';
import { showToast } from '../../components/NotificationToast';

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  planId?: string;
  createdAt: string;
  updatedAt: string;
  stats: {
    users: number;
    leads: number;
    jobs: number;
    lists: number;
    reports: number;
  };
  members: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    joinedAt: string;
  }[];
}

const AdminTenantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTenant = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getAdminTenant(id);
      setTenant(data as TenantDetail);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات المنظمة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenant();
  }, [id]);

  const handleStatusChange = async (newStatus: 'ACTIVE' | 'SUSPENDED') => {
    if (!id) return;
    try {
      await updateTenantStatus(id, newStatus);
      showToast('SUCCESS', 'تم التحديث', `تم ${newStatus === 'ACTIVE' ? 'تفعيل' : 'تعليق'} المنظمة`);
      loadTenant();
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل تحديث الحالة');
    }
  };

  const handleDelete = async () => {
    if (!id || !tenant) return;
    if (!confirm(`هل أنت متأكد من حذف "${tenant.name}"؟ سيتم حذف جميع البيانات المرتبطة بها.`)) return;
    
    try {
      await deleteTenant(id);
      showToast('SUCCESS', 'تم الحذف', 'تم حذف المنظمة بنجاح');
      navigate('/admin/tenants');
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل حذف المنظمة');
    }
  };

  const roleLabels: Record<string, string> = {
    OWNER: 'مالك',
    ADMIN: 'مدير',
    MANAGER: 'مشرف',
    SALES: 'مبيعات',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4">
        <AlertCircle className="text-red-500" size={24} />
        <div>
          <h3 className="font-bold text-red-800">خطأ</h3>
          <p className="text-red-600">{error || 'المنظمة غير موجودة'}</p>
        </div>
        <Link to="/admin/tenants" className="mr-auto text-blue-600 font-bold hover:underline">
          العودة للقائمة
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', label: 'نشط' },
    SUSPENDED: { bg: 'bg-red-100', text: 'text-red-700', label: 'معلق' },
    PENDING_VERIFICATION: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'قيد التحقق' },
  };

  const status = statusColors[tenant.status] || statusColors.ACTIVE;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/tenants" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowRight size={24} className="text-gray-400" />
        </Link>
        <div className="p-3 bg-blue-100 rounded-2xl">
          <Building2 className="text-blue-600" size={32} />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-black text-gray-900">{tenant.name}</h1>
          <p className="text-gray-500 font-medium">{tenant.slug}</p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-bold ${status.bg} ${status.text}`}>
          {status.label}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{tenant.stats.users}</p>
              <p className="text-xs text-gray-500">مستخدم</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <Target size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{tenant.stats.leads}</p>
              <p className="text-xs text-gray-500">عميل</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Briefcase size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{tenant.stats.jobs}</p>
              <p className="text-xs text-gray-500">مهمة</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Target size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{tenant.stats.lists}</p>
              <p className="text-xs text-gray-500">قائمة</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 rounded-xl">
              <Target size={20} className="text-pink-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{tenant.stats.reports}</p>
              <p className="text-xs text-gray-500">تقرير</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-black text-gray-900 mb-4">معلومات المنظمة</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">تاريخ الإنشاء</p>
              <p className="font-bold text-gray-700 flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                {new Date(tenant.createdAt).toLocaleDateString('ar-SA', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">آخر تحديث</p>
              <p className="font-bold text-gray-700 flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                {new Date(tenant.updatedAt).toLocaleDateString('ar-SA', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:col-span-2">
          <h3 className="text-lg font-black text-gray-900 mb-4">إجراءات</h3>
          <div className="flex flex-wrap gap-3">
            {tenant.status === 'ACTIVE' ? (
              <button
                onClick={() => handleStatusChange('SUSPENDED')}
                className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-xl font-bold hover:bg-orange-200 transition-colors"
              >
                <XCircle size={18} />
                تعليق المنظمة
              </button>
            ) : (
              <button
                onClick={() => handleStatusChange('ACTIVE')}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl font-bold hover:bg-green-200 transition-colors"
              >
                <CheckCircle size={18} />
                تفعيل المنظمة
              </button>
            )}
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-colors"
            >
              <Trash2 size={18} />
              حذف المنظمة
            </button>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">أعضاء المنظمة ({tenant.members.length})</h3>
        {tenant.members.length === 0 ? (
          <p className="text-gray-400 text-center py-8">لا يوجد أعضاء</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase">المستخدم</th>
                  <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase">الدور</th>
                  <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase">الحالة</th>
                  <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase">تاريخ الانضمام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tenant.members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{member.name}</p>
                          <p className="text-xs text-gray-400">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        member.role === 'OWNER' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {roleLabels[member.role] || member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {member.isActive ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm font-bold">
                          <CheckCircle size={14} /> نشط
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 text-sm font-bold">
                          <XCircle size={14} /> معطل
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(member.joinedAt).toLocaleDateString('ar-SA')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTenantDetail;
