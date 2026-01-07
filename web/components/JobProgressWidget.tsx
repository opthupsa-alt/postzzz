
import React from 'react';
import { useStore } from '../store/useStore';
import { JobStatus } from '../types';
import { Loader2, CheckCircle2, XCircle, ChevronUp, ChevronDown, Activity, Terminal } from 'lucide-react';

const JobProgressWidget: React.FC = () => {
  const { jobs, activeJobId, setActiveJob } = useStore();
  const [expanded, setExpanded] = React.useState(true);
  const [showLogs, setShowLogs] = React.useState<string | null>(null);

  const activeJob = jobs.find(j => j.id === activeJobId) || jobs[jobs.length - 1];

  if (!activeJob) return null;

  return (
    <div className={`fixed bottom-6 left-6 z-50 w-96 bg-white border border-gray-200 rounded-[1.75rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] transition-all duration-300 transform ${expanded ? 'translate-y-0' : 'translate-y-[calc(100%-4rem)]'}`}>
      <div className="flex items-center justify-between p-5 border-b border-gray-100 cursor-pointer bg-gradient-to-r from-gray-50 to-white rounded-t-[1.75rem]" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${activeJob.status === JobStatus.RUNNING ? 'bg-blue-600 text-white animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
            <Activity size={20} />
          </div>
          <div>
            <span className="font-black text-sm text-gray-900 block leading-none">
                {activeJob.status === JobStatus.RUNNING ? 'جاري تنفيذ العمليات' : 'سجل العمليات'}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{jobs.length} مهمة إجمالية</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronUp size={20} className="text-gray-400" />}
        </div>
      </div>
      
      <div className="p-6 space-y-6 max-h-[400px] overflow-y-auto">
        {jobs.slice().reverse().map((job) => (
          <div key={job.id} className="group">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2">
                  <span className="font-black text-gray-900 uppercase tracking-tighter">
                    {job.type === 'SEARCH' ? 'بحث ذكي' : job.type === 'SURVEY' ? 'فحص آلي' : 'واتساب'}
                  </span>
                  <span className="text-[10px] font-mono text-gray-300">#{job.id.slice(-4)}</span>
              </div>
              <span className="text-gray-400 font-mono">{job.progress}%</span>
            </div>
            
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner mb-3">
              <div 
                className={`h-full transition-all duration-1000 ease-out ${
                  job.status === JobStatus.SUCCESS ? 'bg-green-500' : 
                  job.status === JobStatus.FAILED ? 'bg-red-500' : 'bg-blue-600'
                }`}
                style={{ width: `${job.progress}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    {job.status === JobStatus.RUNNING && <Loader2 size={14} className="animate-spin text-blue-600" />}
                    {job.status === JobStatus.SUCCESS && <CheckCircle2 size={14} className="text-green-500" />}
                    {job.status === JobStatus.FAILED && <XCircle size={14} className="text-red-500" />}
                    <span className="truncate max-w-[180px]">{job.message}</span>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowLogs(showLogs === job.id ? null : job.id); }}
                    className="text-[10px] font-black text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Terminal size={12} /> السجل
                </button>
            </div>

            {showLogs === job.id && (
                <div className="mt-4 p-4 bg-gray-900 rounded-2xl font-mono text-[10px] text-gray-400 space-y-1 animate-in slide-in-from-top-2">
                    <p className="text-green-400">[{new Date().toLocaleTimeString()}] JOB_CREATED: {job.id}</p>
                    <p>-- START_ENGINE --</p>
                    <p>-- FETCHING_RESOURCES --</p>
                    {job.status === JobStatus.SUCCESS && <p className="text-blue-400">[{new Date().toLocaleTimeString()}] SUCCESS: COMPLETED_IN_2.4S</p>}
                </div>
            )}
          </div>
        ))}

        {jobs.length === 0 && (
            <div className="py-10 text-center space-y-3">
                <Activity size={32} className="text-gray-100 mx-auto" />
                <p className="text-xs font-bold text-gray-300">لا توجد عمليات نشطة حالياً</p>
            </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 text-center rounded-b-[1.75rem] border-t border-gray-100">
          <button className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-600 transition-colors">إخلاء السجل</button>
      </div>
    </div>
  );
};

export default JobProgressWidget;
