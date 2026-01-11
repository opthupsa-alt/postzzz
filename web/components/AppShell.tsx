
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Search, Users, ListTodo, MessageSquare, 
  Settings, LogOut, Bell, Zap, ShieldAlert, Menu, X, 
  Smartphone, ShieldCheck, Grid, Globe, Check, Trash2, Clock,
  Command, Search as SearchIcon, Activity, Database, AlertCircle, Puzzle
} from 'lucide-react';
import JobProgressWidget from './JobProgressWidget';
import NotificationToast from './NotificationToast';
import ExtensionButton from './ExtensionButton';
import { useStore } from '../store/useStore';
import { logout, getStoredUser } from '../lib/api';

const SidebarLink = ({ to, icon: Icon, label, active, onClick }: { to: string, icon: any, label: string, active: boolean, onClick?: () => void }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    <Icon size={20} className={active ? 'text-white' : 'text-gray-400'} />
    <span className="font-bold text-sm">{label}</span>
  </Link>
);

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, toggleLanguage } = useStore();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [user, setUser] = useState(getStoredUser());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const notifications = [
    { id: 1, text: 'اكتمل البحث الذكي لـ "مطاعم الرياض"', time: 'منذ 5 دقائق', icon: Search, color: 'text-blue-600 bg-blue-50' },
    { id: 2, text: 'تم إرسال رسالة واتساب بنجاح لشركة أرامكو', time: 'منذ ساعة', icon: MessageSquare, color: 'text-green-600 bg-green-50' },
    { id: 3, text: 'تقرير مبيعات جديد متاح لشركة سابك', time: 'منذ ساعتين', icon: Zap, color: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <div className={`flex min-h-screen bg-[#fcfcfd] overflow-hidden ${language === 'ar' ? 'font-arabic' : 'font-sans'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <NotificationToast />
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {showCommandPalette && (
        <div className="fixed inset-0 z-[300] bg-gray-900/60 backdrop-blur-md flex items-start justify-center pt-32 px-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-50 flex items-center gap-4">
              <SearchIcon size={24} className="text-blue-600" />
              <input 
                autoFocus
                placeholder="ابحث عن عملاء، قوائم، أو إجراءات... (Esc للإغلاق)" 
                className="flex-1 bg-transparent border-none outline-none font-black text-xl text-gray-900"
                onKeyDown={(e) => e.key === 'Escape' && setShowCommandPalette(false)}
              />
              <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-400">
                <Command size={12} /> K
              </div>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mb-3">مقترحات سريعة</p>
               <div className="space-y-1">
                 {[
                   { label: 'البحث عن عملاء جدد', icon: Search, path: '/app/prospecting' },
                   { label: 'عرض القوائم الذكية', icon: ListTodo, path: '/app/lists' },
                   { label: 'إعدادات الفريق', icon: ShieldCheck, path: '/app/team' },
                 ].map((item, i) => (
                   <button 
                    key={i} 
                    onClick={() => { navigate(item.path); setShowCommandPalette(false); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all text-right group"
                   >
                     <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                       <item.icon size={18} />
                     </div>
                     <span className="font-bold">{item.label}</span>
                   </button>
                 ))}
               </div>
            </div>
            <div className="p-6 bg-gray-50 flex justify-between items-center text-[10px] font-black text-gray-400">
              <div className="flex gap-4">
                <span>Enter للاختيار</span>
                <span>↑↓ للتنقل</span>
              </div>
              <button onClick={() => setShowCommandPalette(false)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      <aside className={`fixed inset-y-0 ${language === 'ar' ? 'right-0' : 'left-0'} z-50 w-72 bg-white border-x border-gray-100 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full' : '-translate-x-full')} md:relative md:translate-x-0 shadow-2xl md:shadow-none`}>
        <div className="flex flex-col h-full">
          <div className="p-8 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-xl shadow-blue-100">
                <Zap size={24} fill="currentColor" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">ليدززز</h1>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">PRO PLATFORM</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
            <SidebarLink onClick={() => setSidebarOpen(false)} to="/app/dashboard" icon={LayoutDashboard} label="لوحة التحكم" active={location.pathname === '/app/dashboard'} />
            <SidebarLink onClick={() => setSidebarOpen(false)} to="/app/prospecting" icon={Search} label="البحث عن عملاء" active={location.pathname === '/app/prospecting'} />
            <SidebarLink onClick={() => setSidebarOpen(false)} to="/app/leads" icon={Users} label="العملاء المحتملين" active={location.pathname === '/app/leads' || (location.pathname.startsWith('/app/leads/') && !location.pathname.includes('companies') && !['new', 'import'].includes(location.pathname.split('/').pop() || ''))} />
            <SidebarLink onClick={() => setSidebarOpen(false)} to="/app/lists" icon={ListTodo} label="القوائم الذكية" active={location.pathname === '/app/lists' || location.pathname.startsWith('/app/lists/')} />
            <SidebarLink onClick={() => setSidebarOpen(false)} to="/app/whatsapp" icon={MessageSquare} label="رسائل واتساب" active={location.pathname === '/app/whatsapp'} />
            
            <div className="pt-4 mt-4 border-t border-gray-50">
              <p className="px-4 mb-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">إدارة الفريق</p>
              <SidebarLink onClick={() => setSidebarOpen(false)} to="/app/team" icon={ShieldCheck} label="الفريق والنشاط" active={location.pathname === '/app/team'} />
              <SidebarLink onClick={() => setSidebarOpen(false)} to="/app/integrations" icon={Grid} label="التكاملات" active={location.pathname === '/app/integrations'} />
              <SidebarLink onClick={() => setSidebarOpen(false)} to="/app/extension-settings" icon={Puzzle} label="إعدادات الإضافة" active={location.pathname === '/app/extension-settings'} />
              <SidebarLink onClick={() => setSidebarOpen(false)} to="/app/audit-logs" icon={ShieldAlert} label="سجل الرقابة" active={location.pathname === '/app/audit-logs'} />
            </div>
          </nav>

          <div className="p-6 border-t border-gray-50 space-y-4">
             <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <div className="flex-1">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">حالة النظام</p>
                   <p className="text-[10px] font-black text-green-600 uppercase">جميع الأنظمة تعمل</p>
                </div>
                <Activity size={14} className="text-gray-300" />
             </div>
            <SidebarLink onClick={() => setSidebarOpen(false)} to="/app/settings" icon={Settings} label="الإعدادات" active={location.pathname === '/app/settings'} />
            <button 
              onClick={() => { logout(); }}
              className="flex items-center gap-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold text-sm"
            >
              <LogOut size={20} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 h-20 flex items-center justify-between px-6 md:px-10 sticky top-0 z-40">
          <div className="flex items-center gap-4">
             <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2.5 text-gray-400 hover:bg-gray-100 rounded-xl">
               <Menu size={24} />
             </button>
             <button 
               onClick={() => setShowCommandPalette(true)}
               className="hidden md:flex items-center gap-3 bg-gray-50 px-6 py-2.5 rounded-2xl border border-gray-100 text-gray-400 hover:bg-gray-100 transition-all hover:border-blue-200"
             >
                <SearchIcon size={18} />
                <span className="text-sm font-bold">ابحث في ليدززز...</span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-gray-200 rounded-lg text-[9px] font-black uppercase">
                  <Command size={10} /> K
                </div>
             </button>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:bg-gray-50 rounded-xl text-xs font-black transition-all"
            >
              <Globe size={16} />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>
            <ExtensionButton className="hidden lg:flex" variant="default" />
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-xl transition-all group"
              >
                <Bell size={22} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white ring-2 ring-transparent group-hover:ring-red-100"></span>
              </button>
              
              {showNotifications && (
                <div className={`absolute top-full mt-4 ${language === 'ar' ? 'left-0' : 'right-0'} w-80 bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300`}>
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                    <h4 className="font-black text-gray-900">التنبيهات</h4>
                    <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest">تحديد كقروء</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {notifications.map(n => (
                      <div key={n.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3">
                        <div className={`p-2 rounded-xl h-fit ${n.color}`}>
                          <n.icon size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800 leading-relaxed">{n.text}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-gray-50 text-center">
                    <button className="text-[10px] font-black text-gray-500 uppercase tracking-widest">عرض جميع التنبيهات</button>
                  </div>
                </div>
              )}
            </div>
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black border-2 border-white shadow-xl shadow-blue-100" title={user?.email || ''}>
              {user?.name?.charAt(0) || 'م'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth">
          {children}
        </div>
        
        <JobProgressWidget />
      </main>
    </div>
  );
};

export default AppShell;
