import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Shield, LayoutDashboard, Building2, Users, CreditCard, Settings, LogOut, Database } from 'lucide-react';
import { logout } from '../lib/api';

const AdminLayout: React.FC = () => {
  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'لوحة التحكم', end: true },
    { to: '/admin/tenants', icon: Building2, label: 'المنظمات' },
    { to: '/admin/users', icon: Users, label: 'المستخدمين' },
    { to: '/admin/data-bank', icon: Database, label: 'بنك البيانات' },
    { to: '/admin/plans', icon: CreditCard, label: 'الباقات' },
    { to: '/admin/subscriptions', icon: CreditCard, label: 'الاشتراكات' },
    { to: '/admin/settings', icon: Settings, label: 'الإعدادات' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {/* Sidebar */}
      <aside className="w-72 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-xl">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="font-black text-lg">لوحة الإدارة</h1>
              <p className="text-xs text-gray-400">Super Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  isActive
                    ? 'bg-white text-gray-900'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-2">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-all"
          >
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
