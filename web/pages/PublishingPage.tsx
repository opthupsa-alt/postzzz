import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Clock, CheckCircle, XCircle, RefreshCw, Eye, AlertCircle, Ban, Lock, StopCircle, Edit2, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { getPublishingJobs, cancelJob, cancelAllJobs, deleteJob, deleteCancelledJobs, PublishingJob, PublishingJobStatus, JOB_STATUS_CONFIG } from '../lib/publishing-api';
import { getClients, Client, PLATFORM_CONFIG } from '../lib/clients-api';
import { showToast } from '../components/NotificationToast';

const STATUS_ICONS: Record<PublishingJobStatus, React.ElementType> = {
  QUEUED: Clock,
  CLAIMED: Lock,
  RUNNING: RefreshCw,
  SUCCEEDED: CheckCircle,
  FAILED: XCircle,
  NEEDS_LOGIN: AlertCircle,
  CANCELLED: Ban,
};

const PublishingPage: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<PublishingJob[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadJobs();
  }, [selectedClientId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [jobsData, clientsData] = await Promise.all([
        getPublishingJobs(),
        getClients(),
      ]);
      setJobs(jobsData);
      setClients(clientsData);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    try {
      const data = await getPublishingJobs({
        clientId: selectedClientId || undefined,
      });
      setJobs(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ');
    }
  };

  const handleCancel = async (jobId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء هذه المهمة؟')) return;
    try {
      await cancelJob(jobId);
      showToast('SUCCESS', 'تم الإلغاء', 'تم إلغاء المهمة بنجاح');
      await loadJobs();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ');
    }
  };

  const handleCancelAll = async () => {
    const clientName = selectedClientId 
      ? clients.find(c => c.id === selectedClientId)?.name 
      : 'كل العملاء';
    
    const pendingCount = jobs.filter(j => ['QUEUED', 'CLAIMED'].includes(j.status)).length;
    
    if (pendingCount === 0) {
      showToast('INFO', 'لا توجد مهام', 'لا توجد مهام في الانتظار لإلغائها');
      return;
    }
    
    if (!confirm(`هل أنت متأكد من إلغاء ${pendingCount} مهمة لـ ${clientName}؟\n\nهذا الإجراء لا يمكن التراجع عنه.`)) return;
    
    try {
      const result = await cancelAllJobs(selectedClientId || undefined);
      showToast('SUCCESS', 'تم الإلغاء', `تم إلغاء ${result.cancelled} مهمة بنجاح`);
      await loadJobs();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ');
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;
    try {
      await deleteJob(jobId);
      showToast('SUCCESS', 'تم الحذف', 'تم حذف المهمة بنجاح');
      await loadJobs();
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const handleDeleteCancelled = async () => {
    const cancelledCount = jobs.filter(j => j.status === 'CANCELLED').length;
    
    if (cancelledCount === 0) {
      showToast('INFO', 'لا توجد مهام', 'لا توجد مهام ملغية لحذفها');
      return;
    }
    
    if (!confirm(`هل أنت متأكد من حذف ${cancelledCount} مهمة ملغية؟\n\nهذا الإجراء لا يمكن التراجع عنه.`)) return;
    
    try {
      const result = await deleteCancelledJobs(selectedClientId || undefined);
      showToast('SUCCESS', 'تم الحذف', `تم حذف ${result.deleted} مهمة ملغية`);
      await loadJobs();
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const filteredJobs = filter === 'all' 
    ? jobs 
    : jobs.filter(job => job.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="النشر"
        subtitle="متابعة حالة نشر المحتوى"
        actions={
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/app/posts/new')}
              className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Send size={18} />
              منشور جديد
            </button>
            <button 
              onClick={handleCancelAll}
              className="bg-red-50 text-red-600 px-4 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center gap-2 border border-red-200"
            >
              <StopCircle size={18} />
              إيقاف الكل
            </button>
            {jobs.filter(j => j.status === 'CANCELLED').length > 0 && (
              <button 
                onClick={handleDeleteCancelled}
                className="bg-gray-50 text-gray-600 px-4 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center gap-2 border border-gray-200"
              >
                <Trash2 size={18} />
                حذف الملغية ({jobs.filter(j => j.status === 'CANCELLED').length})
              </button>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'في الانتظار', count: jobs.filter(j => j.status === 'QUEUED').length, color: 'text-gray-600 bg-gray-50' },
          { label: 'جاري النشر', count: jobs.filter(j => ['CLAIMED', 'RUNNING'].includes(j.status)).length, color: 'text-blue-600 bg-blue-50' },
          { label: 'تم النشر', count: jobs.filter(j => j.status === 'SUCCEEDED').length, color: 'text-green-600 bg-green-50' },
          { label: 'فشل', count: jobs.filter(j => ['FAILED', 'NEEDS_LOGIN'].includes(j.status)).length, color: 'text-red-600 bg-red-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{stat.label}</p>
            <p className={`text-3xl font-black ${stat.color.split(' ')[0]}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Client Filter + Status Tabs */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="bg-white text-gray-700 px-4 py-2 rounded-xl font-bold border border-gray-100"
        >
          <option value="">كل العملاء</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>

        <div className="flex gap-2">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'QUEUED', label: 'في الانتظار' },
            { id: 'RUNNING', label: 'جاري النشر' },
            { id: 'SUCCEEDED', label: 'تم النشر' },
            { id: 'FAILED', label: 'فشل' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-xl font-bold transition-colors ${
                filter === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <EmptyState 
          icon={Send}
          title="لا توجد مهام نشر"
          description="عند جدولة منشورات، ستظهر مهام النشر هنا"
          action={
            <button 
              onClick={() => navigate('/app/posts/new')}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              إنشاء منشور
            </button>
          }
        />
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filteredJobs.map(job => {
              const statusConfig = JOB_STATUS_CONFIG[job.status];
              const StatusIcon = STATUS_ICONS[job.status];
              const platformConfig = PLATFORM_CONFIG[job.platform];
              return (
                <div key={job.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${statusConfig.color}`}>
                        <StatusIcon size={20} className={job.status === 'RUNNING' ? 'animate-spin' : ''} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{job.post?.title || 'منشور'}</p>
                        <p className="text-sm text-gray-500">
                          {job.client?.name} • {platformConfig?.name || job.platform}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="text-sm text-gray-500">
                          {new Date(job.scheduledAt).toLocaleDateString('ar-SA')}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(job.scheduledAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                      {job.lastRun?.publishedUrl && (
                        <a 
                          href={job.lastRun.publishedUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="عرض المنشور"
                        >
                          <Eye size={18} className="text-gray-400" />
                        </a>
                      )}
                      {['QUEUED', 'CLAIMED'].includes(job.status) && (
                        <>
                          <button 
                            onClick={() => navigate(`/app/posts/${job.postId}/edit`)}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-gray-400 hover:text-blue-500"
                            title="تعديل المنشور"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleCancel(job.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                            title="إلغاء المهمة"
                          >
                            <Ban size={18} />
                          </button>
                        </>
                      )}
                      {['CANCELLED', 'FAILED'].includes(job.status) && (
                        <button 
                          onClick={() => handleDelete(job.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                          title="حذف المهمة"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                  {job.lastErrorMessage && (
                    <div className="mt-3 p-3 bg-red-50 rounded-xl text-sm text-red-600">
                      {job.lastErrorMessage}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublishingPage;
