import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, MoreVertical, CheckCircle, XCircle, Trash2, Edit, Users, Target, Search, MessageSquare, AlertCircle } from 'lucide-react';
import { getPlans, togglePlanActive, deletePlan, Plan } from '../../lib/api';
import { showToast } from '../../components/NotificationToast';

const AdminPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOptionsId, setShowOptionsId] = useState<string | null>(null);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await getPlans(true); // Include inactive
      setPlans(data);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل الباقات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleToggleActive = async (id: string) => {
    try {
      await togglePlanActive(id);
      showToast('SUCCESS', 'تم التحديث', 'تم تحديث حالة الباقة');
      loadPlans();
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل تحديث الحالة');
    }
    setShowOptionsId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف باقة "${name}"؟`)) return;
    
    try {
      await deletePlan(id);
      showToast('SUCCESS', 'تم الحذف', 'تم حذف الباقة بنجاح');
      loadPlans();
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل حذف الباقة');
    }
    setShowOptionsId(null);
  };

  const formatLimit = (limit: number) => {
    if (limit === -1) return '∞';
    return limit.toLocaleString('ar-SA');
  };

  const formatPrice = (price: number) => {
    if (price === -1) return 'مخصص';
    if (price === 0) return 'مجاني';
    return `${price} ر.س`;
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
          <h1 className="text-3xl font-black text-gray-900">إدارة الباقات</h1>
          <p className="text-gray-500 font-medium">إجمالي {plans.length} باقة</p>
        </div>
        <button
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all opacity-50 cursor-not-allowed"
          disabled
          title="قريباً"
        >
          <Plus size={20} />
          إضافة باقة
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-3xl border ${plan.isActive ? 'border-gray-100' : 'border-red-200 bg-red-50/30'} p-6 relative`}
            >
              {/* Options Menu */}
              <div className="absolute top-4 left-4">
                <button
                  onClick={() => setShowOptionsId(showOptionsId === plan.id ? null : plan.id)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <MoreVertical size={18} className="text-gray-400" />
                </button>
                {showOptionsId === plan.id && (
                  <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden">
                    {plan.isActive ? (
                      <button
                        onClick={() => handleToggleActive(plan.id)}
                        className="w-full text-right px-4 py-3 text-sm font-bold text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                      >
                        <XCircle size={16} /> تعطيل الباقة
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleActive(plan.id)}
                        className="w-full text-right px-4 py-3 text-sm font-bold text-green-600 hover:bg-green-50 flex items-center gap-2"
                      >
                        <CheckCircle size={16} /> تفعيل الباقة
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(plan.id, plan.nameAr)}
                      className="w-full text-right px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={16} /> حذف الباقة
                    </button>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              {!plan.isActive && (
                <span className="absolute top-4 right-4 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                  معطلة
                </span>
              )}

              {/* Plan Info */}
              <div className="mb-6 pt-8">
                <div className="p-3 bg-blue-100 rounded-xl w-fit mb-4">
                  <CreditCard className="text-blue-600" size={24} />
                </div>
                <h3 className="text-xl font-black text-gray-900">{plan.nameAr}</h3>
                <p className="text-sm text-gray-400">{plan.name}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="text-3xl font-black text-gray-900">
                  {formatPrice(Number(plan.price))}
                  {Number(plan.price) > 0 && <span className="text-sm font-bold text-gray-400">/شهر</span>}
                </div>
                {Number(plan.yearlyPrice) > 0 && (
                  <p className="text-sm text-gray-400">
                    {formatPrice(Number(plan.yearlyPrice))}/سنة
                  </p>
                )}
              </div>

              {/* Limits */}
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-500">
                    <Users size={14} /> المقاعد
                  </span>
                  <span className="font-bold text-gray-900">{formatLimit(plan.seatsLimit)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-500">
                    <Target size={14} /> العملاء
                  </span>
                  <span className="font-bold text-gray-900">{formatLimit(plan.leadsLimit)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-500">
                    <Search size={14} /> البحث/شهر
                  </span>
                  <span className="font-bold text-gray-900">{formatLimit(plan.searchesLimit)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-500">
                    <MessageSquare size={14} /> الرسائل/شهر
                  </span>
                  <span className="font-bold text-gray-900">{formatLimit(plan.messagesLimit)}</span>
                </div>
              </div>

              {/* Subscriptions Count */}
              {plan._count && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    {plan._count.subscriptions} اشتراك نشط
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPlans;
