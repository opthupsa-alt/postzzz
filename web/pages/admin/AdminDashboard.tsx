import React, { useState, useEffect } from 'react';
import { Building2, Users, Target, Briefcase, TrendingUp, Shield, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
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

      {/* Recent Tenants & Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tenants */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Building2 size={20} className="text-blue-600" />
              أحدث المنظمات
            </h3>
            <Link to="/admin/tenants" className="text-sm font-bold text-blue-600 hover:text-blue-700">
              عرض الكل →
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.recentTenants?.map((tenant) => (
              <div key={tenant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{tenant.name}</p>
                    <p className="text-xs text-gray-400">{tenant.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {tenant.status === 'ACTIVE' ? 'نشط' : 'معلق'}
                  </span>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(tenant.createdAt).toLocaleDateString('ar-SA')}
                  </div>
                </div>
              </div>
            ))}
            {(!stats?.recentTenants || stats.recentTenants.length === 0) && (
              <p className="text-center text-gray-400 py-4">لا توجد منظمات</p>
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Users size={20} className="text-green-600" />
              أحدث المستخدمين
            </h3>
            <Link to="/admin/users" className="text-sm font-bold text-green-600 hover:text-green-700">
              عرض الكل →
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.recentUsers?.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm flex items-center gap-1">
                      {user.name}
                      {user.isSuperAdmin && (
                        <Shield size={12} className="text-red-500" />
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {user.isActive ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <XCircle size={16} className="text-red-500" />
                  )}
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(user.createdAt).toLocaleDateString('ar-SA')}
                  </div>
                </div>
              </div>
            ))}
            {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
              <p className="text-center text-gray-400 py-4">لا يوجد مستخدمين</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">إجراءات سريعة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/admin/tenants" className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors">
            <Building2 size={24} className="text-blue-600" />
            <span className="font-bold text-sm text-blue-700">إدارة المنظمات</span>
          </Link>
          <Link to="/admin/users" className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-2xl hover:bg-green-100 transition-colors">
            <Users size={24} className="text-green-600" />
            <span className="font-bold text-sm text-green-700">إدارة المستخدمين</span>
          </Link>
          <Link to="/admin/plans" className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-2xl hover:bg-purple-100 transition-colors">
            <Target size={24} className="text-purple-600" />
            <span className="font-bold text-sm text-purple-700">إدارة الباقات</span>
          </Link>
          <Link to="/admin/settings" className="flex flex-col items-center gap-2 p-4 bg-orange-50 rounded-2xl hover:bg-orange-100 transition-colors">
            <Briefcase size={24} className="text-orange-600" />
            <span className="font-bold text-sm text-orange-700">إعدادات المنصة</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
