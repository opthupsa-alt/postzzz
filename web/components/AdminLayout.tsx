import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Shield, LayoutDashboard, Building2, Users, CreditCard, Settings, ArrowLeft, LogOut } from 'lucide-react';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'لوحة التحكم', end: true },
    { to: '/admin/tenants', icon: Building2, label: 'المنظمات' },
    { to: '/admin/users', icon: Users, label: 'المستخدمين' },
    { to: '/admin/plans', icon: CreditCard, label: 'الباقات' },
    { to: '/admin/subscriptions', icon: CreditCard, label: 'الاشتراكات' },
    { to: '/admin/settings', icon: Settings, label: 'الإعدادات', disabled: true },
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
                  item.disabled
                    ? 'text-gray-600 cursor-not-allowed'
                    : isActive
                    ? 'bg-white text-gray-900'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.disabled && (
                <span className="mr-auto text-[10px] bg-gray-700 px-2 py-0.5 rounded-full">قريباً</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-2">
          <button
            onClick={() => navigate('/app/dashboard')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-gray-300 hover:bg-gray-800 hover:text-white transition-all"
          >
            <ArrowLeft size={20} />
            <span>العودة للمنصة</span>
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
