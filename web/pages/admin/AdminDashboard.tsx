import React, { useState, useEffect } from 'react';
import { Building2, Users, Target, Briefcase, TrendingUp, Shield, AlertCircle } from 'lucide-react';
import { getAdminDashboard, AdminDashboardStats } from '../../lib/api';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getAdminDashboard();
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'فشل تحميل الإحصائيات');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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

  const statCards = [
    {
      title: 'إجمالي المنظمات',
      value: stats?.tenants.total || 0,
      subtext: `${stats?.tenants.active || 0} نشط • ${stats?.tenants.suspended || 0} معلق`,
      icon: Building2,
      color: 'blue',
    },
    {
      title: 'إجمالي المستخدمين',
      value: stats?.users.total || 0,
      subtext: `${stats?.users.active || 0} نشط`,
      icon: Users,
      color: 'green',
    },
    {
      title: 'إجمالي العملاء',
      value: stats?.leads || 0,
      subtext: 'عميل محتمل',
      icon: Target,
      color: 'purple',
    },
    {
      title: 'إجمالي المهام',
      value: stats?.jobs || 0,
      subtext: 'مهمة بحث',
      icon: Briefcase,
      color: 'orange',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', iconBg: 'bg-green-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-red-100 rounded-2xl">
          <Shield className="text-red-600" size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900">لوحة تحكم المنصة</h1>
          <p className="text-gray-500 font-medium">إدارة المنظمات والمستخدمين والاشتراكات</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const colors = colorClasses[card.color];
          return (
            <div
              key={card.title}
              className={`${colors.bg} rounded-3xl p-6 border border-transparent hover:border-gray-200 transition-all`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 ${colors.iconBg} rounded-xl`}>
                  <card.icon className={colors.text} size={24} />
                </div>
                <TrendingUp className="text-gray-300" size={20} />
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-1">{card.value.toLocaleString('ar-SA')}</h3>
              <p className="text-sm font-bold text-gray-500">{card.title}</p>
              <p className="text-xs text-gray-400 mt-1">{card.subtext}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
        <h3 className="font-bold text-yellow-800 mb-2">🚧 قيد التطوير</h3>
        <p className="text-yellow-700 text-sm">
          لوحة تحكم المنصة قيد التطوير. ستتضمن قريباً: إدارة الباقات، الفواتير، Feature Flags، وسجلات النظام.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
