import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, MapPin, Database, Phone, Globe, ChevronLeft, X, LayoutGrid, List, History, Zap, Sparkles, RefreshCw, AlertCircle, CheckCircle2, Clock, Building2, Star, ExternalLink, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { JobStatus } from '../types';
import { useNavigate } from 'react-router-dom';
import SmartFilters from '../components/SmartFilters';
import BulkActionsBar from '../components/BulkActionsBar';
import { showToast } from '../components/NotificationToast';
import { createJob, getLeads, getJob, Lead as ApiLead } from '../lib/api';

type SearchState = 'idle' | 'searching' | 'polling' | 'success' | 'error' | 'no_results';

interface SearchHistoryItem {
  query: string;
  city: string;
  type: 'SINGLE' | 'BULK';
  date: string;
  results: number;
}

const ProspectingPage: React.FC = () => {
  const navigate = useNavigate();
  const { addJob, updateJob, lists, bulkSaveLeads } = useStore();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // Search form state
  const [companyName, setCompanyName] = useState('');
  const [activity, setActivity] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('السعودية');
  const [searchType, setSearchType] = useState<'SINGLE' | 'BULK'>('BULK');
  
  // Search state
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchMessage, setSearchMessage] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Results state - real leads from API
  const [searchResults, setSearchResults] = useState<ApiLead[]>([]);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [lastSearchType, setLastSearchType] = useState<'SINGLE' | 'BULK'>('BULK');
  
  // UI state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');
  
  // Search history
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('leedz_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save search history to localStorage
  useEffect(() => {
    localStorage.setItem('leedz_search_history', JSON.stringify(searchHistory.slice(0, 10)));
  }, [searchHistory]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Filter results based on active filters
  const filteredResults = useMemo(() => {
    return searchResults.filter(lead => {
      if (activeFilters.hasPhone && !lead.phone) return false;
      if (activeFilters.hasWebsite && !lead.website) return false;
      return true;
    });
  }, [searchResults, activeFilters]);

  // Poll for job completion and fetch results
  const pollJobStatus = useCallback(async (jobId: string, query: string, searchCity: string) => {
    let attempts = 0;
    const maxAttempts = 90; // 3 minutes max (polling every 2 seconds)
    
    const poll = async () => {
      attempts++;
      
      try {
        // Check job status
        const job = await getJob(jobId);
        
        // Use actual progress from job if available
        const actualProgress = job.progress || 0;
        setSearchProgress(actualProgress);
        
        // Update message based on job's actual message or progress
        if (actualProgress < 20) {
          setSearchMessage('جاري الاتصال بالإضافة...');
        } else if (actualProgress < 40) {
          setSearchMessage('جاري فتح خرائط جوجل...');
        } else if (actualProgress < 60) {
          setSearchMessage('جاري البحث عن النتائج...');
        } else if (actualProgress < 80) {
          setSearchMessage('جاري استخراج البيانات...');
        } else if (actualProgress < 100) {
          setSearchMessage('جاري حفظ النتائج...');
        }
        
        if (job.status === 'COMPLETED' || (job.status as string) === 'SUCCESS') {
          // Job completed - fetch leads created by this job
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          
          setSearchProgress(100);
          setSearchMessage('جاري تحميل النتائج...');
          
          // Small delay to ensure leads are saved
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const leads = await getLeads({ limit: 100 });
          // Filter leads that belong to this job
          const jobLeads = leads.filter(l => l.jobId === jobId);
          
          if (jobLeads.length > 0) {
            setSearchResults(jobLeads);
            setSearchState('success');
            setSearchMessage(`تم العثور على ${jobLeads.length} نتيجة`);
            
            // Save leads to store so they can be viewed in detail page
            bulkSaveLeads(jobLeads.map(l => ({
              id: l.id,
              companyName: l.companyName,
              industry: l.industry || '',
              city: l.city || '',
              phone: l.phone || '',
              website: l.website || '',
              address: l.address || '',
              status: 'NEW' as const,
              source: l.source || 'GOOGLE_MAPS_SEARCH',
              jobId: l.jobId,
              metadata: l.metadata,
              createdAt: l.createdAt,
              evidenceCount: 0,
              hasReport: false,
            })));
            
            // Add to history
            setSearchHistory(prev => [{
              query,
              city: searchCity,
              type: searchType,
              date: new Date().toLocaleString('ar-SA'),
              results: jobLeads.length
            }, ...prev.slice(0, 9)]);
            
            showToast('SUCCESS', 'اكتمل البحث', `تم العثور على ${jobLeads.length} عملاء محتملين`);
          } else {
            // Check job output for results count
            const outputResults = (job as any).output?.resultsCount || 0;
            if (outputResults > 0) {
              // Results were found but not saved yet, try again
              setTimeout(async () => {
                const retryLeads = await getLeads({ limit: 100 });
                const retryJobLeads = retryLeads.filter(l => l.jobId === jobId);
                if (retryJobLeads.length > 0) {
                  setSearchResults(retryJobLeads);
                  setSearchState('success');
                  setSearchMessage(`تم العثور على ${retryJobLeads.length} نتيجة`);
                  // Save to store
                  bulkSaveLeads(retryJobLeads.map(l => ({
                    id: l.id,
                    companyName: l.companyName,
                    industry: l.industry || '',
                    city: l.city || '',
                    phone: l.phone || '',
                    website: l.website || '',
                    address: l.address || '',
                    status: 'NEW' as const,
                    source: l.source || 'GOOGLE_MAPS_SEARCH',
                    jobId: l.jobId,
                    metadata: l.metadata,
                    createdAt: l.createdAt,
                    evidenceCount: 0,
                    hasReport: false,
                  })));
                } else {
                  setSearchResults([]);
                  setSearchState('no_results');
                  setSearchMessage('لم يتم العثور على نتائج');
                }
              }, 1000);
            } else {
              setSearchResults([]);
              setSearchState('no_results');
              setSearchMessage('لم يتم العثور على نتائج');
            }
          }
          
          updateJob(jobId, { status: JobStatus.SUCCESS, progress: 100 });
          return; // Stop polling
          
        } else if (job.status === 'FAILED') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          const errorMsg = (job as any).output?.error || (job as any).error || 'فشل البحث - يرجى المحاولة مرة أخرى';
          setSearchState('error');
          setSearchError(errorMsg);
          updateJob(jobId, { status: JobStatus.FAILED });
          return; // Stop polling
        }
        
        // Timeout after max attempts
        if (attempts >= maxAttempts) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          
          // Try to fetch any leads that might have been saved
          const leads = await getLeads({ limit: 100 });
          const jobLeads = leads.filter(l => l.jobId === jobId);
          
          if (jobLeads.length > 0) {
            setSearchResults(jobLeads);
            setSearchState('success');
            setSearchMessage(`تم العثور على ${jobLeads.length} نتيجة`);
          } else {
            setSearchState('error');
            setSearchError('انتهت مهلة البحث - تأكد من أن الإضافة تعمل');
          }
          return; // Stop polling
        }
        
      } catch (err) {
        console.error('Polling error:', err);
        // Don't stop polling on transient errors unless max attempts reached
        if (attempts >= maxAttempts) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setSearchState('error');
          setSearchError('حدث خطأ أثناء متابعة البحث');
        }
      }
    };
    
    // Poll immediately first
    await poll();
    
    // Then poll every 2 seconds
    pollingRef.current = setInterval(poll, 2000);
  }, [searchType, updateJob]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const query = searchType === 'SINGLE' ? companyName : activity;
    if (!query || !city) return;

    // Reset state
    setSearchState('searching');
    setSearchProgress(0);
    setSearchMessage('جاري إنشاء عملية البحث...');
    setSearchError(null);
    setSearchResults([]);
    setSelectedLeadIds([]);
    setLastSearchQuery(query);
    setLastSearchType(searchType);

    try {
      // Create job for Extension to pick up
      const apiJob = await createJob('GOOGLE_MAPS_SEARCH', { 
        query, 
        city, 
        country,
        searchType,
      });
      
      setCurrentJobId(apiJob.id);
      setSearchState('polling');
      setSearchMessage('في انتظار الإضافة لتنفيذ البحث...');

      addJob({
        id: apiJob.id,
        type: 'SEARCH',
        status: JobStatus.RUNNING,
        progress: 0,
        message: 'بدء البحث...',
        createdAt: new Date().toISOString()
      });

      showToast('JOB', searchType === 'SINGLE' ? 'بحث فردي' : 'بحث متعدد', 
        `جاري البحث عن "${query}" في ${city}...`);

      // Start polling for results
      pollJobStatus(apiJob.id, query, city);
      
    } catch (err) {
      console.error('Failed to create job:', err);
      setSearchState('error');
      setSearchError('فشل إنشاء عملية البحث');
      showToast('ERROR', 'فشل البحث', 'حدث خطأ أثناء إنشاء عملية البحث');
    }
  };

  const handleRefreshResults = async () => {
    if (!currentJobId) return;
    
    setSearchState('polling');
    setSearchMessage('جاري تحديث النتائج...');
    
    try {
      const leads = await getLeads({ limit: 100 });
      const jobLeads = leads.filter(l => l.jobId === currentJobId);
      
      if (jobLeads.length > 0) {
        setSearchResults(jobLeads);
        setSearchState('success');
        showToast('SUCCESS', 'تم التحديث', `تم العثور على ${jobLeads.length} نتيجة`);
      } else {
        setSearchState('no_results');
      }
    } catch (err) {
      setSearchState('error');
      setSearchError('فشل تحديث النتائج');
    }
  };

  const toggleSelectLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAllLeads = () => {
    if (selectedLeadIds.length === filteredResults.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredResults.map(l => l.id));
    }
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('leedz_search_history');
  };

  const rerunSearch = (historyItem: SearchHistoryItem) => {
    if (historyItem.type === 'SINGLE') {
      setCompanyName(historyItem.query);
      setSearchType('SINGLE');
    } else {
      setActivity(historyItem.query);
      setSearchType('BULK');
    }
    setCity(historyItem.city);
  };

  const isSearching = searchState === 'searching' || searchState === 'polling';

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">البحث عن عملاء</h1>
          <p className="text-gray-500 font-medium">استخدم كلمات بحث ذكية للوصول لعملائك المثاليين</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
          <Database size={16} className="text-blue-500" />
          <span className="font-bold">قاعدة بيانات: 1.2M شركة</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Search Form */}
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            {/* Search Type Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setSearchType('BULK')}
                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  searchType === 'BULK' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Database size={18} />
                بحث متعدد
              </button>
              <button
                type="button"
                onClick={() => setSearchType('SINGLE')}
                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  searchType === 'SINGLE' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Search size={18} />
                بحث عن شركة
              </button>
            </div>
            
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-[2] relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  {searchType === 'SINGLE' ? (
                    <input 
                      type="text" 
                      placeholder="اسم الشركة (مثال: شركة الحلول الذكية)" 
                      className="w-full pr-12 pl-4 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      disabled={isSearching}
                    />
                  ) : (
                    <input 
                      type="text" 
                      placeholder="النشاط (مثلاً: مطاعم، مقاولات...)" 
                      className="w-full pr-12 pl-4 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold"
                      value={activity}
                      onChange={(e) => setActivity(e.target.value)}
                      disabled={isSearching}
                    />
                  )}
                </div>
                <div className="flex-1 relative">
                  <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="المدينة" 
                    className="w-full pr-12 pl-4 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={isSearching}
                  />
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={isSearching}
                    className="w-full py-4 px-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold"
                  >
                    <option value="السعودية">🇸🇦 السعودية</option>
                    <option value="الإمارات">🇦🇪 الإمارات</option>
                    <option value="مصر">🇪🇬 مصر</option>
                    <option value="الكويت">🇰🇼 الكويت</option>
                    <option value="قطر">🇶🇦 قطر</option>
                    <option value="البحرين">🇧🇭 البحرين</option>
                    <option value="عمان">🇴🇲 عمان</option>
                    <option value="الأردن">🇯🇴 الأردن</option>
                  </select>
                </div>
                <button 
                  type="submit"
                  disabled={isSearching || (searchType === 'SINGLE' ? !companyName : !activity) || !city}
                  className={`bg-blue-600 text-white px-10 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${
                    isSearching || (searchType === 'SINGLE' ? !companyName : !activity) || !city 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-blue-700 active:scale-95 shadow-xl shadow-blue-100'
                  }`}
                >
                  {isSearching ? <Loader2 size={22} className="animate-spin" /> : <Search size={22} />}
                  {isSearching ? 'جاري البحث...' : searchType === 'SINGLE' ? 'ابحث عن الشركة' : 'بحث الآن'}
                </button>
              </div>
              
              {/* Search Type Info */}
              <div className={`text-sm p-3 rounded-xl ${searchType === 'SINGLE' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                {searchType === 'SINGLE' 
                  ? '🎯 البحث الفردي: سيتم البحث عن شركة واحدة بالاسم المحدد وإرجاع أقرب نتيجة مطابقة.'
                  : '📊 البحث المتعدد: سيتم البحث عن جميع الشركات في هذا المجال وإرجاع حتى 30 نتيجة.'}
              </div>
            </form>
          </div>

          {/* Search Progress */}
          {isSearching && (
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-2xl">
                  <Loader2 size={24} className="text-blue-600 animate-spin" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">جاري البحث...</h3>
                  <p className="text-sm text-gray-500">{searchMessage}</p>
                </div>
                <span className="text-2xl font-black text-blue-600">{searchProgress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${searchProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                تأكد من أن إضافة Chrome مفتوحة ومتصلة بالمنصة
              </p>
            </div>
          )}

          {/* Error State */}
          {searchState === 'error' && (
            <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 animate-in fade-in duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-2xl">
                  <AlertCircle size={24} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-900">فشل البحث</h3>
                  <p className="text-sm text-red-600">{searchError}</p>
                </div>
                <button 
                  onClick={handleRefreshResults}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-all flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  إعادة المحاولة
                </button>
              </div>
            </div>
          )}

          {/* No Results State */}
          {searchState === 'no_results' && (
            <div className="bg-amber-50 p-8 rounded-[2rem] border border-amber-100 text-center animate-in fade-in duration-300">
              <div className="p-4 bg-amber-100 rounded-2xl w-fit mx-auto mb-4">
                <Search size={32} className="text-amber-600" />
              </div>
              <h3 className="font-bold text-amber-900 text-lg mb-2">لم يتم العثور على نتائج</h3>
              <p className="text-sm text-amber-700 mb-4">
                جرب تغيير كلمات البحث أو المدينة للحصول على نتائج أفضل
              </p>
              <button 
                onClick={handleRefreshResults}
                className="px-6 py-2 bg-amber-200 text-amber-800 rounded-xl font-bold hover:bg-amber-300 transition-all"
              >
                تحديث النتائج
              </button>
            </div>
          )}

          {/* Results */}
          {searchState === 'success' && searchResults.length > 0 && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              {/* Results Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-2 rounded-xl">
                    <CheckCircle2 size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      نتائج البحث: {lastSearchQuery}
                    </h3>
                    <p className="text-sm text-gray-500">
                      تم العثور على {filteredResults.length} {lastSearchType === 'SINGLE' ? 'شركة' : 'شركات'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleRefreshResults}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="تحديث النتائج"
                  >
                    <RefreshCw size={20} />
                  </button>
                  
                  <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
                    <SmartFilters onFilterChange={setActiveFilters} activeFilters={activeFilters} />
                  </div>
                  
                  <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                    <button 
                      onClick={() => setViewMode('TABLE')}
                      className={`p-2 rounded-xl transition-all ${viewMode === 'TABLE' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                      <List size={20} />
                    </button>
                    <button 
                      onClick={() => setViewMode('GRID')}
                      className={`p-2 rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                      <LayoutGrid size={20} />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Results Table */}
              {viewMode === 'TABLE' ? (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-6 py-4 w-12">
                            <input 
                              type="checkbox"
                              checked={selectedLeadIds.length === filteredResults.length && filteredResults.length > 0}
                              onChange={selectAllLeads}
                              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">اسم الشركة</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">النشاط</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">الموقع</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">التواصل</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">التقييم</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">التطابق</th>
                          <th className="px-6 py-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredResults.map((lead) => (
                          <tr 
                            key={lead.id} 
                            className={`hover:bg-blue-50/50 transition-colors group cursor-pointer ${selectedLeadIds.includes(lead.id) ? 'bg-blue-50/30' : ''}`}
                            onClick={() => navigate(`/app/leads/${lead.id}`)}
                          >
                            <td className="px-6 py-5">
                              <input 
                                type="checkbox" 
                                checked={selectedLeadIds.includes(lead.id)}
                                onChange={(e) => toggleSelectLead(lead.id, e as any)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl flex items-center justify-center font-black shadow-lg shadow-blue-100">
                                  {lead.companyName?.[0] || '?'}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{lead.companyName}</p>
                                  {lead.address && (
                                    <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{lead.address}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-sm font-bold text-gray-600">{lead.industry || '-'}</span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-1 text-sm font-bold text-gray-400">
                                <MapPin size={14} />
                                {lead.city || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center justify-center gap-2">
                                {lead.phone ? (
                                  <a 
                                    href={`tel:${lead.phone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2.5 bg-green-50 text-green-600 rounded-xl border border-green-100 hover:bg-green-100 transition-all" 
                                    title={lead.phone}
                                  >
                                    <Phone size={16} />
                                  </a>
                                ) : (
                                  <div className="p-2.5 bg-gray-50 text-gray-300 rounded-xl border border-gray-100">
                                    <Phone size={16} />
                                  </div>
                                )}
                                {lead.website ? (
                                  <a 
                                    href={lead.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all" 
                                    title={lead.website}
                                  >
                                    <Globe size={16} />
                                  </a>
                                ) : (
                                  <div className="p-2.5 bg-gray-50 text-gray-300 rounded-xl border border-gray-100">
                                    <Globe size={16} />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center justify-center gap-1">
                                {(lead as any).metadata?.rating ? (
                                  <>
                                    <Star size={14} className="text-amber-400 fill-amber-400" />
                                    <span className="text-sm font-bold text-gray-600">{(lead as any).metadata.rating}</span>
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-300">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center justify-center">
                                {(lead as any).metadata?.matchScore ? (
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                    (lead as any).metadata.matchScore >= 90 
                                      ? 'bg-green-100 text-green-700' 
                                      : (lead as any).metadata.matchScore >= 70 
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {(lead as any).metadata.matchScore}%
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-300">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5 text-left">
                              <button className="text-gray-300 group-hover:text-blue-600 transition-all transform group-hover:-translate-x-1">
                                <ChevronLeft size={24} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredResults.map(lead => (
                    <div 
                      key={lead.id}
                      onClick={() => navigate(`/app/leads/${lead.id}`)}
                      className={`bg-white p-6 rounded-[2rem] border transition-all cursor-pointer hover:shadow-lg hover:border-blue-200 ${
                        selectedLeadIds.includes(lead.id) ? 'border-blue-400 bg-blue-50/30' : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-100">
                          {lead.companyName?.[0] || '?'}
                        </div>
                        <input 
                          type="checkbox" 
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={(e) => toggleSelectLead(lead.id, e as any)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                      
                      <h3 className="font-bold text-gray-900 text-lg mb-1">{lead.companyName}</h3>
                      <div className="flex items-center gap-2 mb-3">
                        {lead.industry && (
                          <span className="inline-block text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                            {lead.industry}
                          </span>
                        )}
                        {(lead as any).metadata?.matchScore && (
                          <span className={`inline-block text-xs font-bold px-2 py-1 rounded-lg ${
                            (lead as any).metadata.matchScore >= 90 
                              ? 'bg-green-100 text-green-700' 
                              : (lead as any).metadata.matchScore >= 70 
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}>
                            {(lead as any).metadata.matchScore}%
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-500">
                        {lead.city && (
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-gray-400" />
                            <span>{lead.city}</span>
                          </div>
                        )}
                        {(lead as any).metadata?.rating && (
                          <div className="flex items-center gap-2">
                            <Star size={14} className="text-amber-400 fill-amber-400" />
                            <span>{(lead as any).metadata.rating}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                        {lead.phone && (
                          <a 
                            href={`tel:${lead.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 py-2 bg-green-50 text-green-600 rounded-xl text-center font-bold text-sm hover:bg-green-100 transition-all"
                          >
                            اتصال
                          </a>
                        )}
                        {lead.website && (
                          <a 
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl text-center font-bold text-sm hover:bg-blue-100 transition-all"
                          >
                            الموقع
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty State - No search yet */}
          {searchState === 'idle' && (
            <div className="bg-gradient-to-br from-gray-50 to-white p-12 rounded-[2.5rem] border border-gray-100 text-center">
              <div className="p-4 bg-blue-100 rounded-2xl w-fit mx-auto mb-6">
                <Search size={40} className="text-blue-600" />
              </div>
              <h3 className="font-black text-gray-900 text-xl mb-2">ابدأ البحث عن عملاء جدد</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                أدخل النشاط أو اسم الشركة والمدينة للبحث عن عملاء محتملين من خرائط جوجل
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Search History */}
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <h3 className="font-black text-lg text-gray-900 mb-4 flex items-center gap-2">
              <History size={18} className="text-blue-600" /> 
              آخر عمليات البحث
            </h3>
            {searchHistory.length > 0 ? (
              <>
                <div className="space-y-3">
                  {searchHistory.slice(0, 5).map((h, i) => (
                    <div 
                      key={i} 
                      onClick={() => rerunSearch(h)}
                      className="p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {h.type === 'SINGLE' ? (
                          <Building2 size={14} className="text-amber-500" />
                        ) : (
                          <Database size={14} className="text-blue-500" />
                        )}
                        <p className="font-bold text-gray-800 group-hover:text-blue-600 text-sm">{h.query}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                          <MapPin size={10} />
                          {h.city}
                        </span>
                        <span className="text-[10px] text-blue-600 font-black">{h.results} نتيجة</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={clearSearchHistory}
                  className="w-full mt-4 text-xs font-black text-gray-400 hover:text-red-500 transition-all"
                >
                  مسح السجل
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">لا يوجد سجل بحث</p>
            )}
          </div>

          {/* AI Discovery Card */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div className="p-3 bg-white/20 rounded-2xl w-fit border border-white/20 shadow-lg">
                <Sparkles size={24} />
              </div>
              <h4 className="text-xl font-black">اكتشاف بـ AI</h4>
              <p className="text-sm opacity-80 leading-relaxed font-bold">
                دع الذكاء الاصطناعي يقترح عليك قطاعات جديدة بناءً على نجاحاتك السابقة.
              </p>
              <button className="w-full bg-white text-blue-600 py-3 rounded-xl font-black text-xs shadow-xl active:scale-95 transition-all">
                تفعيل الذكاء الاستكشافي
              </button>
            </div>
            <Zap className="absolute -bottom-10 -left-10 text-white/5 rotate-12 transition-transform group-hover:scale-125 duration-1000" size={180} />
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar 
        count={selectedLeadIds.length} 
        onClear={() => setSelectedLeadIds([])} 
        onSaveToList={() => setShowSaveModal(true)}
      />

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-black text-2xl text-gray-900">اختر القائمة</h3>
              <button onClick={() => setShowSaveModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto space-y-3">
              <button 
                onClick={() => {
                  showToast('SUCCESS', 'تم الحفظ', `تم حفظ ${selectedLeadIds.length} عملاء`);
                  setSelectedLeadIds([]);
                  setShowSaveModal(false);
                }}
                className="w-full text-right p-5 rounded-2xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="font-black text-gray-900 group-hover:text-blue-600">بدون قائمة (CRM العام)</p>
                  <p className="text-xs text-gray-400 font-bold">حفظ العملاء فقط دون تصنيف</p>
                </div>
                <ChevronLeft size={20} className="text-gray-300 group-hover:text-blue-600" />
              </button>
              {lists.map(list => (
                <button 
                  key={list.id}
                  onClick={() => {
                    showToast('SUCCESS', 'تم الحفظ', `تم إضافة ${selectedLeadIds.length} عملاء إلى ${list.name}`);
                    setSelectedLeadIds([]);
                    setShowSaveModal(false);
                  }}
                  className="w-full text-right p-5 rounded-2xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">
                      {list.name[0]}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 group-hover:text-blue-600">{list.name}</p>
                      <p className="text-xs text-gray-400 font-bold">{list.count} عميل حالي</p>
                    </div>
                  </div>
                  <ChevronLeft size={20} className="text-gray-300 group-hover:text-blue-600" />
                </button>
              ))}
            </div>
            <div className="p-8 bg-gray-50 flex justify-end">
              <button onClick={() => setShowSaveModal(false)} className="px-8 py-3 font-bold text-gray-500 hover:text-gray-900">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProspectingPage;
