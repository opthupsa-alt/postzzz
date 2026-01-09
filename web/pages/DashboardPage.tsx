
import React, { useEffect, useState } from 'react';
import { Users, Search, MessageSquare, TrendingUp, ArrowUpRight, Zap, Target, BarChart3, Clock, ChevronLeft, Activity, ExternalLink, ShieldCheck, Filter, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { getDashboardStats, getStoredUser, DashboardStats } from '../lib/api';

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

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
        <StatCard title="إجمالي العملاء" value={stats?.leads.totalLeads.toLocaleString() || '0'} icon={Users} color="bg-blue-50 text-blue-600" trend={stats?.leads.leadsThisWeek || 0} />
        <StatCard title="عملاء هذا الأسبوع" value={stats?.leads.leadsThisWeek.toLocaleString() || '0'} icon={Target} color="bg-purple-50 text-purple-600" trend={stats?.leads.leadsToday || 0} />
        <StatCard title="عمليات البحث" value={stats?.jobs.totalJobs.toLocaleString() || '0'} icon={BarChart3} color="bg-orange-50 text-orange-600" trend={stats?.jobs.jobsThisWeek || 0} />
        <StatCard title="عمليات اليوم" value={stats?.jobs.jobsToday.toLocaleString() || '0'} icon={Zap} color="bg-green-50 text-green-600" trend={stats?.jobs.jobsToday || 0} />
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
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-blue-600" size={32} />
              </div>
            ) : stats?.jobs.recentJobs && stats.jobs.recentJobs.length > 0 ? (
              <div className="space-y-10 relative before:absolute before:inset-y-0 before:right-3 before:w-px before:bg-gray-100">
                {stats.jobs.recentJobs.map((job) => (
                  <div key={job.id} className="relative flex items-start gap-8 group">
                    <div className={`absolute right-0 w-6 h-6 bg-white border-2 rounded-lg flex items-center justify-center z-10 -mr-1 shadow-sm group-hover:scale-125 transition-transform ${
                      job.status === 'COMPLETED' ? 'border-green-500' : 
                      job.status === 'FAILED' ? 'border-red-500' : 
                      job.status === 'RUNNING' ? 'border-blue-500' : 'border-gray-400'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        job.status === 'COMPLETED' ? 'bg-green-500' : 
                        job.status === 'FAILED' ? 'bg-red-500' : 
                        job.status === 'RUNNING' ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    <div className="pr-4">
                      <p className="text-sm text-gray-800 font-bold leading-relaxed">
                        {job.type === 'PROSPECT_SEARCH' ? 'بحث عن عملاء' : job.type} - {job.status === 'COMPLETED' ? 'مكتمل' : job.status === 'RUNNING' ? 'جاري' : job.status === 'FAILED' ? 'فشل' : 'في الانتظار'}
                      </p>
                      <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1 block">
                        {new Date(job.createdAt).toLocaleString('ar-SA')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-10 relative before:absolute before:inset-y-0 before:right-3 before:w-px before:bg-gray-100">
                {[
                  { content: 'مرحباً ' + (user?.name || 'بك') + '! ابدأ بإنشاء أول عملية بحث', time: 'الآن', icon: Search },
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
            )}
            <button onClick={() => navigate('/app/prospecting')} className="w-full mt-10 py-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-xs font-black text-gray-500 transition-all border border-gray-100">
              {stats?.jobs.recentJobs && stats.jobs.recentJobs.length > 0 ? 'عرض جميع العمليات' : 'ابدأ بحث جديد'}
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
