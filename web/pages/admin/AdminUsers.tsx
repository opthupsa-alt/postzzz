import React, { useState, useEffect } from 'react';
import { Users, Shield, MoreVertical, CheckCircle, XCircle, ShieldCheck, ShieldOff, AlertCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAdminUsers, updateUserStatus, toggleUserSuperAdmin, AdminUser } from '../../lib/api';
import { showToast } from '../../components/NotificationToast';

const ITEMS_PER_PAGE = 10;

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOptionsId, setShowOptionsId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<string>('');
  const [filterSuperAdmin, setFilterSuperAdmin] = useState<string>('');
  const [page, setPage] = useState(1);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAdminUsers({
        isActive: filterActive === '' ? undefined : filterActive === 'true',
        isSuperAdmin: filterSuperAdmin === '' ? undefined : filterSuperAdmin === 'true',
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      });
      setUsers(data.users);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [filterActive, filterSuperAdmin, page]);

  // Client-side search filter
  const filteredUsers = searchQuery
    ? users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handleStatusChange = async (id: string, isActive: boolean) => {
    try {
      await updateUserStatus(id, isActive);
      showToast('SUCCESS', 'تم التحديث', `تم ${isActive ? 'تفعيل' : 'تعطيل'} المستخدم`);
      loadUsers();
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل تحديث الحالة');
    }
    setShowOptionsId(null);
  };

  const handleSuperAdminToggle = async (id: string, isSuperAdmin: boolean) => {
    try {
      await toggleUserSuperAdmin(id, isSuperAdmin);
      showToast('SUCCESS', 'تم التحديث', `تم ${isSuperAdmin ? 'منح' : 'سحب'} صلاحيات Super Admin`);
      loadUsers();
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل تحديث الصلاحيات');
    }
    setShowOptionsId(null);
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
          <h1 className="text-3xl font-black text-gray-900">إدارة المستخدمين</h1>
          <p className="text-gray-500 font-medium">إجمالي {total} مستخدم</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو البريد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl pr-10 pl-4 py-2 font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-56"
            />
          </div>
          {/* Filter Active */}
          <select
            value={filterActive}
            onChange={(e) => { setFilterActive(e.target.value); setPage(1); }}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">جميع الحالات</option>
            <option value="true">نشط</option>
            <option value="false">معطل</option>
          </select>
          {/* Filter Super Admin */}
          <select
            value={filterSuperAdmin}
            onChange={(e) => { setFilterSuperAdmin(e.target.value); setPage(1); }}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">جميع الصلاحيات</option>
            <option value="true">Super Admin</option>
            <option value="false">مستخدم عادي</option>
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
                <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">المستخدم</th>
                <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">المنظمات</th>
                <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">الصلاحيات</th>
                <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">الحالة</th>
                <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.tenants.slice(0, 2).map((t) => (
                        <span key={t.id} className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600">
                          {t.name.substring(0, 15)}{t.name.length > 15 ? '...' : ''}
                        </span>
                      ))}
                      {user.tenants.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-400">
                          +{user.tenants.length - 2}
                        </span>
                      )}
                      {user.tenants.length === 0 && (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.isSuperAdmin ? (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                        <Shield size={12} /> Super Admin
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">مستخدم عادي</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.isActive ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        نشط
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                        معطل
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <button
                        onClick={() => setShowOptionsId(showOptionsId === user.id ? null : user.id)}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        <MoreVertical size={18} className="text-gray-400" />
                      </button>
                      {showOptionsId === user.id && (
                        <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden">
                          {user.isActive ? (
                            <button
                              onClick={() => handleStatusChange(user.id, false)}
                              className="w-full text-right px-4 py-3 text-sm font-bold text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                            >
                              <XCircle size={16} /> تعطيل الحساب
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(user.id, true)}
                              className="w-full text-right px-4 py-3 text-sm font-bold text-green-600 hover:bg-green-50 flex items-center gap-2"
                            >
                              <CheckCircle size={16} /> تفعيل الحساب
                            </button>
                          )}
                          {user.isSuperAdmin ? (
                            <button
                              onClick={() => handleSuperAdminToggle(user.id, false)}
                              className="w-full text-right px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <ShieldOff size={16} /> سحب صلاحيات Super Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuperAdminToggle(user.id, true)}
                              className="w-full text-right px-4 py-3 text-sm font-bold text-purple-600 hover:bg-purple-50 flex items-center gap-2"
                            >
                              <ShieldCheck size={16} /> منح صلاحيات Super Admin
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              لا يوجد مستخدمين
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

export default AdminUsers;
