
import React from 'react';
import { Users, Search, MessageSquare, TrendingUp, ArrowUpRight, Zap, Target, BarChart3, Clock, ChevronLeft, Activity, ExternalLink, ShieldCheck, Filter } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group cursor-pointer relative overflow-hidden">
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{value}</h3>
      </div>
      <div className={`p-4 rounded-2xl ${color} group-hover:scale-110 transition-transform shadow-sm`}>
        <Icon size={24} />
      </div>
    </div>
    <div className="mt-4 flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 w-fit px-2.5 py-1 rounded-full relative z-10 border border-green-100">
      <TrendingUp size={12} />
      <span className="uppercase tracking-widest">+{trend}% نمو</span>
    </div>
    <div className="absolute -bottom-4 -left-4 opacity-0 group-hover:opacity-5 transition-opacity duration-700">
      <Icon size={120} className="rotate-12" />
    </div>
  </div>
);

const FunnelStep = ({ label, value, percentage, color }: any) => (
  <div className="flex items-center gap-4 group">
    <div className="flex-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-black text-gray-900">{label}</span>
        <span className="text-[10px] font-mono text-gray-400">{value}</span>
      </div>
      <div className="h-4 bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-0.5">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
    <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
      {percentage}%
    </div>
  </div>
);

const PerformanceChart = () => (
  <div className="mt-8 flex items-end justify-between h-48 gap-4 px-4">
    {[
      { label: 'السبت', value: 40, color: 'bg-blue-100' },
      { label: 'الأحد', value: 65, color: 'bg-blue-200' },
      { label: 'الاثنين', value: 35, color: 'bg-blue-100' },
      { label: 'الثلاثاء', value: 85, color: 'bg-blue-600' },
      { label: 'الأربعاء', value: 55, color: 'bg-blue-200' },
      { label: 'الخميس', value: 95, color: 'bg-blue-600' },
      { label: 'الجمعة', value: 20, color: 'bg-blue-50' },
    ].map((item, i) => (
      <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
        <div className="w-full relative flex items-end justify-center h-full">
           <div 
             className={`w-full max-w-[40px] rounded-xl transition-all duration-1000 group-hover:scale-y-110 ${item.color}`} 
             style={{ height: `${item.value}%` }}
           >
             <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
               {item.value}%
             </div>
           </div>
        </div>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter whitespace-nowrap">{item.label}</span>
      </div>
    ))}
  </div>
);

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { savedLeads, jobs } = useStore();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <PageHeader 
        title="لوحة التحكم التنفيذية" 
        subtitle="ملخص الأداء والأنشطة لفريق المبيعات"
        actions={
          <>
            <button className="bg-white text-gray-700 px-6 py-2.5 rounded-2xl font-bold border border-gray-200 shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2">
              <Filter size={18} /> تصفية التاريخ
            </button>
            <button onClick={() => navigate('/app/prospecting')} className="bg-blue-600 text-white px-8 py-2.5 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2">
              <Search size={20} /> بحث ذكي جديد
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="إجمالي العملاء" value={savedLeads.length + 1200} icon={Users} color="bg-blue-50 text-blue-600" trend="12" />
        <StatCard title="أدلة مكتشفة" value="4,852" icon={Target} color="bg-purple-50 text-purple-600" trend="18" />
        <StatCard title="رسائل واتساب" value="856" icon={MessageSquare} color="bg-green-50 text-green-600" trend="24" />
        <StatCard title="عمليات البحث" value={jobs.length + 42} icon={BarChart3} color="bg-orange-50 text-orange-600" trend="5" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Funnel Card */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black text-xl text-gray-900">مسار التحويل (Sales Funnel)</h3>
                <p className="text-xs text-gray-400 font-bold">مراحل رحلة العميل من الاكتشاف إلى الإغلاق</p>
              </div>
              <Activity size={24} className="text-blue-600 opacity-20" />
            </div>
            <div className="space-y-6">
              <FunnelStep label="البحث والاكتشاف" value="12,500" percentage={100} color="bg-blue-600" />
              <FunnelStep label="عملاء مؤهلين (Prospects)" value="4,200" percentage={34} color="bg-blue-500" />
              <FunnelStep label="تم التواصل معهم" value="1,850" percentage={15} color="bg-blue-400" />
              <FunnelStep label="فرص مبيعات (Opportunities)" value="450" percentage={4} color="bg-blue-300" />
              <FunnelStep label="صفقات مغلقة" value="120" percentage={1} color="bg-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 overflow-hidden relative">
             <div className="flex items-center justify-between mb-2">
               <div>
                  <h3 className="font-black text-xl text-gray-900">معدل نشاط الفريق</h3>
                  <p className="text-sm text-gray-400 font-bold">نشاط المبيعات الأسبوعي المتوقع</p>
               </div>
               <div className="flex gap-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
                    <div className="w-2 h-2 rounded-full bg-blue-100"></div> عادي
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div> مرتفع
                  </div>
               </div>
             </div>
             <PerformanceChart />
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
            <h3 className="font-black text-xl text-gray-900 mb-8 flex items-center gap-3">
              <Clock size={24} className="text-blue-600" /> النشاط اللحظي
            </h3>
            <div className="space-y-10 relative before:absolute before:inset-y-0 before:right-3 before:w-px before:bg-gray-100">
              {[
                { type: 'message', content: 'تم إرسال رسالة واتساب لشركة الأمل', time: '10:30 ص', icon: MessageSquare },
                { type: 'search', content: 'اكتمل بحث "محلات تجارية الرياض"', time: '09:15 ص', icon: Search },
                { type: 'lead', content: 'تم إضافة 15 عميل جديد للقائمة', time: 'أمس', icon: Users },
                { type: 'report', content: 'تم إنشاء تقرير جديد لشركة نماء', time: 'أمس', icon: Zap },
              ].map((activity, i) => (
                <div key={i} className="relative flex items-start gap-8 group">
                  <div className="absolute right-0 w-6 h-6 bg-white border-2 border-blue-600 rounded-lg flex items-center justify-center z-10 -mr-1 shadow-sm group-hover:scale-125 transition-transform">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                  </div>
                  <div className="pr-4">
                    <p className="text-sm text-gray-800 font-bold leading-relaxed">{activity.content}</p>
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1 block">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-10 py-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-xs font-black text-gray-500 transition-all border border-gray-100">
              تحميل المزيد من النشاط
            </button>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
             <div className="relative z-10">
               <h3 className="font-black text-xl text-gray-900 mb-2">حالة الاتصال</h3>
               <div className="flex items-center gap-3 mb-6">
                 <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                 <span className="text-xs font-black text-green-600 uppercase tracking-widest">متصل بـ Meta API</span>
               </div>
               <div className="bg-gray-50 p-6 rounded-[1.5rem] border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">الرقم المتصل</p>
                  <p className="text-lg font-mono font-black text-gray-800 tracking-wider">+966 50 123 4567</p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
