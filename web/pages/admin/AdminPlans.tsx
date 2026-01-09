import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, MoreVertical, CheckCircle, XCircle, Trash2, Edit, Users, Target, Search, MessageSquare, AlertCircle, X } from 'lucide-react';
import { getPlans, togglePlanActive, deletePlan, createAdminPlan, updateAdminPlan, Plan } from '../../lib/api';
import { showToast } from '../../components/NotificationToast';

interface PlanFormData {
  name: string;
  nameAr: string;
  price: number;
  yearlyPrice: number;
  seatsLimit: number;
  leadsLimit: number;
  searchesLimit: number;
  messagesLimit: number;
  isActive: boolean;
}

const defaultFormData: PlanFormData = {
  name: '',
  nameAr: '',
  price: 0,
  yearlyPrice: 0,
  seatsLimit: 5,
  leadsLimit: 1000,
  searchesLimit: 100,
  messagesLimit: 500,
  isActive: true,
};

const AdminPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOptionsId, setShowOptionsId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);

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

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData(defaultFormData);
    setShowModal(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      nameAr: plan.nameAr,
      price: Number(plan.price),
      yearlyPrice: Number(plan.yearlyPrice),
      seatsLimit: plan.seatsLimit,
      leadsLimit: plan.leadsLimit,
      searchesLimit: plan.searchesLimit,
      messagesLimit: plan.messagesLimit,
      isActive: plan.isActive,
    });
    setShowModal(true);
    setShowOptionsId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nameAr) {
      showToast('ERROR', 'خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSaving(true);
    try {
      if (editingPlan) {
        await updateAdminPlan(editingPlan.id, formData);
        showToast('SUCCESS', 'تم التحديث', 'تم تحديث الباقة بنجاح');
      } else {
        await createAdminPlan(formData);
        showToast('SUCCESS', 'تم الإنشاء', 'تم إنشاء الباقة بنجاح');
      }
      setShowModal(false);
      loadPlans();
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل حفظ الباقة');
    } finally {
      setSaving(false);
    }
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
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all"
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
                    <button
                      onClick={() => openEditModal(plan)}
                      className="w-full text-right px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                    >
                      <Edit size={16} /> تعديل الباقة
                    </button>
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

      {/* Plan Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">
                {editingPlan ? 'تعديل الباقة' : 'إضافة باقة جديدة'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Names */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    اسم الباقة (إنجليزي) *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Basic"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    اسم الباقة (عربي) *
                  </label>
                  <input
                    type="text"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="الأساسية"
                    required
                  />
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    السعر الشهري (ر.س)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="99"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    السعر السنوي (ر.س)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.yearlyPrice}
                    onChange={(e) => setFormData({ ...formData, yearlyPrice: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="999"
                  />
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    عدد المقاعد
                  </label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.seatsLimit}
                    onChange={(e) => setFormData({ ...formData, seatsLimit: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="5"
                  />
                  <p className="text-xs text-gray-400 mt-1">-1 = غير محدود</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    عدد العملاء
                  </label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.leadsLimit}
                    onChange={(e) => setFormData({ ...formData, leadsLimit: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1000"
                  />
                  <p className="text-xs text-gray-400 mt-1">-1 = غير محدود</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    عمليات البحث/شهر
                  </label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.searchesLimit}
                    onChange={(e) => setFormData({ ...formData, searchesLimit: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="100"
                  />
                  <p className="text-xs text-gray-400 mt-1">-1 = غير محدود</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    الرسائل/شهر
                  </label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.messagesLimit}
                    onChange={(e) => setFormData({ ...formData, messagesLimit: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="500"
                  />
                  <p className="text-xs text-gray-400 mt-1">-1 = غير محدود</p>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="font-bold text-gray-700">
                  الباقة نشطة
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'جاري الحفظ...' : editingPlan ? 'تحديث الباقة' : 'إنشاء الباقة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPlans;
