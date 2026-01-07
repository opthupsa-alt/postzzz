import React, { useState, useEffect } from 'react';
import { CreditCard, MoreVertical, CheckCircle, XCircle, AlertCircle, Building2 } from 'lucide-react';
import { getSubscriptions, cancelSubscription, Subscription } from '../../lib/api';
import { showToast } from '../../components/NotificationToast';

const AdminSubscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [showOptionsId, setShowOptionsId] = useState<string | null>(null);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await getSubscriptions({ status: filter || undefined });
      setSubscriptions(data.subscriptions);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل الاشتراكات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [filter]);

  const handleCancel = async (tenantId: string, tenantName: string) => {
    if (!confirm(`هل أنت متأكد من إلغاء اشتراك "${tenantName}"؟`)) return;
    
    try {
      await cancelSubscription(tenantId, true);
      showToast('SUCCESS', 'تم الإلغاء', 'تم إلغاء الاشتراك بنجاح');
      loadSubscriptions();
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل إلغاء الاشتراك');
    }
    setShowOptionsId(null);
  };

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', label: 'نشط' },
    PAST_DUE: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'متأخر' },
    CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: 'ملغي' },
    TRIALING: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'تجريبي' },
    EXPIRED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'منتهي' },
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">إدارة الاشتراكات</h1>
          <p className="text-gray-500 font-medium">إجمالي {total} اشتراك</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2 font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">جميع الحالات</option>
          <option value="ACTIVE">نشط</option>
          <option value="TRIALING">تجريبي</option>
          <option value="PAST_DUE">متأخر</option>
          <option value="CANCELLED">ملغي</option>
          <option value="EXPIRED">منتهي</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-gray-50 rounded-3xl p-12 text-center">
          <CreditCard className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-500">لا توجد اشتراكات</h3>
          <p className="text-gray-400 mt-2">لم يتم إنشاء أي اشتراكات بعد</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">المنظمة</th>
                <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">الباقة</th>
                <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">الدورة</th>
                <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">الحالة</th>
                <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">تاريخ الانتهاء</th>
                <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subscriptions.map((sub) => {
                const status = statusColors[sub.status] || statusColors.ACTIVE;
                return (
                  <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-xl">
                          <Building2 className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{sub.tenant?.name || '-'}</p>
                          <p className="text-xs text-gray-400">{sub.tenant?.slug || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-700">{sub.plan.nameAr}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">
                        {sub.billingCycle === 'YEARLY' ? 'سنوي' : 'شهري'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                      {sub.cancelAtPeriodEnd && (
                        <span className="mr-2 text-xs text-orange-500">(سيُلغى)</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600 text-sm">
                        {new Date(sub.currentPeriodEnd).toLocaleDateString('ar-SA')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <button
                          onClick={() => setShowOptionsId(showOptionsId === sub.id ? null : sub.id)}
                          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                          <MoreVertical size={18} className="text-gray-400" />
                        </button>
                        {showOptionsId === sub.id && (
                          <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden">
                            {sub.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleCancel(sub.tenantId, sub.tenant?.name || '')}
                                className="w-full text-right px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <XCircle size={16} /> إلغاء الاشتراك
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminSubscriptions;
