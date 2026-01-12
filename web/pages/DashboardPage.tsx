import React, { useEffect, useState } from 'react';
import { TrendingUp, Zap, Calendar, Clock, Activity, Loader2, Send, Building2, Smartphone, CheckCircle, XCircle, AlertCircle, Trash2, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { getStoredUser } from '../lib/api';
import { getPublishingStats, PublishingStats, cancelJob, deleteJob } from '../lib/publishing-api';
import { showToast } from '../components/NotificationToast';

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
    {trend !== undefined && (
      <div className="mt-4 flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 w-fit px-2.5 py-1 rounded-full relative z-10 border border-green-100">
        <TrendingUp size={12} />
        <span className="uppercase tracking-widest">+{trend} هذا الأسبوع</span>
      </div>
    )}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { color: string; icon: any; label: string }> = {
    COMPLETED: { color: 'bg-green-50 text-green-600 border-green-100', icon: CheckCircle, label: 'مكتمل' },
    FAILED: { color: 'bg-red-50 text-red-600 border-red-100', icon: XCircle, label: 'فشل' },
    QUEUED: { color: 'bg-yellow-50 text-yellow-600 border-yellow-100', icon: AlertCircle, label: 'في الانتظار' },
    CLAIMED: { color: 'bg-blue-50 text-blue-600 border-blue-100', icon: Activity, label: 'قيد التنفيذ' },
  };
  const { color, icon: Icon, label } = config[status] || config.QUEUED;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PublishingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  const loadStats = async () => {
    try {
      const data = await getPublishingStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <PageHeader 
        title="لوحة التحكم" 
        subtitle="ملخص النشر والجدولة"
        actions={
          <>
            <button 
              onClick={() => navigate('/app/posts/new')} 
              className="bg-blue-600 text-white px-8 py-2.5 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
            >
              <Send size={20} /> منشور جديد
            </button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="إجمالي المنشورات" 
          value={stats?.totalPosts?.toLocaleString() || '0'} 
          icon={Calendar} 
          color="bg-blue-50 text-blue-600" 
          trend={stats?.postsThisWeek} 
        />
        <StatCard 
          title="منشورات مكتملة" 
          value={stats?.completedJobs?.toLocaleString() || '0'} 
          icon={CheckCircle} 
          color="bg-green-50 text-green-600" 
        />
        <StatCard 
          title="في الانتظار" 
          value={stats?.pendingJobs?.toLocaleString() || '0'} 
          icon={Clock} 
          color="bg-yellow-50 text-yellow-600" 
        />
        <StatCard 
          title="العملاء النشطين" 
          value={stats?.activeClients?.toLocaleString() || '0'} 
          icon={Building2} 
          color="bg-purple-50 text-purple-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Jobs */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-xl text-gray-900">آخر عمليات النشر</h3>
              <p className="text-xs text-gray-400 font-bold">متابعة حالة المنشورات</p>
            </div>
            <Activity size={24} className="text-blue-600 opacity-20" />
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : stats?.recentJobs && stats.recentJobs.length > 0 ? (
            <div className="space-y-4">
              {stats.recentJobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">
                      {job.platform === 'X' ? '𝕏' : job.platform === 'LINKEDIN' ? '💼' : job.platform === 'INSTAGRAM' ? '📷' : '📱'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{job.post?.title || 'منشور'}</p>
                      <p className="text-xs text-gray-500">{job.client?.name || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={job.status} />
                    <span className="text-[10px] text-gray-400">
                      {new Date(job.createdAt).toLocaleDateString('ar-SA')}
                    </span>
                    {['QUEUED', 'CLAIMED'].includes(job.status) && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm('هل أنت متأكد من إلغاء هذه المهمة؟')) return;
                          try {
                            await cancelJob(job.id);
                            showToast('SUCCESS', 'تم الإلغاء', 'تم إلغاء المهمة بنجاح');
                            loadStats();
                          } catch (err: any) {
                            showToast('ERROR', 'خطأ', err.message || 'حدث خطأ');
                          }
                        }}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                        title="إلغاء المهمة"
                      >
                        <Ban size={14} />
                      </button>
                    )}
                    {['CANCELLED', 'FAILED'].includes(job.status) && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;
                          try {
                            await deleteJob(job.id);
                            showToast('SUCCESS', 'تم الحذف', 'تم حذف المهمة بنجاح');
                            loadStats();
                          } catch (err: any) {
                            showToast('ERROR', 'خطأ', err.message || 'حدث خطأ');
                          }
                        }}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                        title="حذف المهمة"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-bold">لا توجد عمليات نشر حتى الآن</p>
              <p className="text-sm">ابدأ بإنشاء منشور جديد</p>
            </div>
          )}
          
          <button 
            onClick={() => navigate('/app/publishing')} 
            className="w-full mt-6 py-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-xs font-black text-gray-500 transition-all border border-gray-100"
          >
            عرض جميع العمليات
          </button>
        </div>

        {/* Quick Actions */}
        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
            <h3 className="font-black text-xl text-gray-900 mb-6">إجراءات سريعة</h3>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/app/posts/new')}
                className="w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-2xl text-right flex items-center gap-4 transition-all group"
              >
                <div className="p-3 bg-blue-600 text-white rounded-xl group-hover:scale-110 transition-transform">
                  <Send size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">إنشاء منشور</p>
                  <p className="text-xs text-gray-500">جدولة منشور جديد</p>
                </div>
              </button>
              
              <button 
                onClick={() => navigate('/app/clients')}
                className="w-full p-4 bg-purple-50 hover:bg-purple-100 rounded-2xl text-right flex items-center gap-4 transition-all group"
              >
                <div className="p-3 bg-purple-600 text-white rounded-xl group-hover:scale-110 transition-transform">
                  <Building2 size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">إدارة العملاء</p>
                  <p className="text-xs text-gray-500">إضافة أو تعديل العملاء</p>
                </div>
              </button>
              
              <button 
                onClick={() => navigate('/app/devices')}
                className="w-full p-4 bg-green-50 hover:bg-green-100 rounded-2xl text-right flex items-center gap-4 transition-all group"
              >
                <div className="p-3 bg-green-600 text-white rounded-xl group-hover:scale-110 transition-transform">
                  <Smartphone size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">الأجهزة</p>
                  <p className="text-xs text-gray-500">إدارة أجهزة النشر</p>
                </div>
              </button>
            </div>
          </div>

          {/* Connection Status */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="font-black text-xl text-gray-900 mb-4">حالة النظام</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-bold text-gray-600">API Server</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-black text-green-600">متصل</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-bold text-gray-600">الأجهزة المتصلة</span>
                <span className="text-sm font-black text-blue-600">{stats?.connectedDevices || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
