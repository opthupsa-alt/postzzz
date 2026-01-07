
import React, { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, Filter, Database, Phone, Globe, ChevronLeft, Check, Plus, ListPlus, X, LayoutGrid, List, History, Zap, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { JobStatus, Lead } from '../types';
import { useNavigate } from 'react-router-dom';
import SmartFilters from '../components/SmartFilters';
import BulkActionsBar from '../components/BulkActionsBar';
import LeadGridCard from '../components/LeadGridCard';
import { showToast } from '../components/NotificationToast';
import { createJob, getLeads, bulkCreateLeads, CreateLeadDto } from '../lib/api';

const ProspectingPage: React.FC = () => {
  const navigate = useNavigate();
  const { addJob, updateJob, leads, setLeads, lists, bulkSaveLeads, assignLeadsToList } = useStore();
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');
  const [searchHistory, setSearchHistory] = useState([
    { query: 'مطاعم الرياض', date: 'منذ ساعتين', results: 15 },
    { query: 'مقاولات جدة', date: 'أمس', results: 42 }
  ]);

  // Load leads from API on mount
  useEffect(() => {
    const loadLeads = async () => {
      try {
        const apiLeads = await getLeads({ limit: 100 });
        // Convert API leads to frontend Lead type
        const frontendLeads = apiLeads.map(l => ({
          id: l.id,
          companyName: l.companyName,
          industry: l.industry || '',
          city: l.city || '',
          phone: l.phone,
          website: l.website,
          status: 'NEW' as const,
          evidenceCount: 0,
          hasReport: false,
          tags: l.industry ? [l.industry] : [],
        })) as Lead[];
        setLeads(frontendLeads);
      } catch (err) {
        console.error('Failed to load leads:', err);
      }
    };
    loadLeads();
  }, [setLeads]);

  const filteredResults = useMemo(() => {
    return leads.filter(lead => {
      if (activeFilters.hasPhone && !lead.phone) return false;
      if (activeFilters.hasWebsite && !lead.website) return false;
      if (activeFilters.status && lead.status !== activeFilters.status) return false;
      return true;
    });
  }, [leads, activeFilters]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword || !city) return;

    setIsSearching(true);
    setSelectedLeadIds([]);
    
    showToast('JOB', 'بدء البحث الذكي', `جاري البحث عن "${keyword}" في مدينة ${city}...`);

    try {
      // Create real job in API
      const apiJob = await createJob('PROSPECT_SEARCH', { keyword, city });
      const jobId = apiJob.id;

      addJob({
        id: jobId,
        type: 'SEARCH',
        status: JobStatus.RUNNING,
        progress: 0,
        message: 'بدء تحليل كلمات البحث...',
        createdAt: new Date().toISOString()
      });

      // Simulate progress (in real app, this would poll the API or use WebSocket)
      let progress = 0;
      const interval = setInterval(async () => {
        progress += Math.floor(Math.random() * 25);
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // Demo leads to save to DB (in production, these would come from the Runner/Extension)
          const leadsToSave: CreateLeadDto[] = [
            { companyName: 'مؤسسة الحلول الذكية', industry: keyword, city: city, phone: '0501234567', website: 'https://smart.sa', source: 'PROSPECT_SEARCH', jobId: jobId },
            { companyName: 'مطعم مذاق الشرق', industry: keyword, city: city, phone: '0502234568', website: 'https://taste.sa', source: 'PROSPECT_SEARCH', jobId: jobId },
            { companyName: 'المركز الطبي المتقدم', industry: keyword, city: city, source: 'PROSPECT_SEARCH', jobId: jobId },
            { companyName: 'مكتب المهندس خالد', industry: keyword, city: city, phone: '0504434570', source: 'PROSPECT_SEARCH', jobId: jobId },
            { companyName: 'شركة نماء العقارية', industry: keyword, city: city, phone: '0505534571', website: 'https://namaa.sa', source: 'PROSPECT_SEARCH', jobId: jobId },
          ];
          
          try {
            // Save leads to DB via API
            await bulkCreateLeads(leadsToSave);
            
            // Reload leads from API to get the saved ones with IDs
            const apiLeads = await getLeads({ limit: 100 });
            const frontendLeads = apiLeads.map(l => ({
              id: l.id,
              companyName: l.companyName,
              industry: l.industry || '',
              city: l.city || '',
              phone: l.phone,
              website: l.website,
              status: 'NEW' as const,
              evidenceCount: 0,
              hasReport: false,
              tags: l.industry ? [l.industry] : [],
            })) as Lead[];
            setLeads(frontendLeads);
            
            updateJob(jobId, { 
              status: JobStatus.SUCCESS, 
              progress: 100, 
              message: `اكتمل البحث: تم العثور على ${leadsToSave.length} عملاء`
            });
            showToast('SUCCESS', 'اكتمل البحث', `تم العثور على ${leadsToSave.length} عملاء جدد وحفظهم في قاعدة البيانات.`);
            setSearchHistory([{ query: `${keyword} - ${city}`, date: 'الآن', results: leadsToSave.length }, ...searchHistory]);
          } catch (saveErr) {
            console.error('Failed to save leads:', saveErr);
            showToast('ERROR', 'فشل الحفظ', 'تم العثور على العملاء لكن فشل حفظهم');
          }
          setIsSearching(false);
        } else {
          const messages = ['تحميل البيانات من الخرائط...', 'استخراج العناوين والنشاط...', 'فلترة النتائج المكررة...', 'تحليل جودة البيانات...'];
          updateJob(jobId, { 
            progress, 
            message: messages[Math.floor(progress / 25)] 
          });
        }
      }, 600);
    } catch (err) {
      console.error('Failed to create job:', err);
      showToast('ERROR', 'فشل البحث', 'حدث خطأ أثناء إنشاء عملية البحث');
      setIsSearching(false);
    }
  };

  const toggleSelectLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkSave = (listId?: string) => {
    const leadsToSave = leads.filter(l => selectedLeadIds.includes(l.id));
    bulkSaveLeads(leadsToSave);
    if (listId) {
      assignLeadsToList(selectedLeadIds, listId);
    }
    showToast('SUCCESS', 'تم الحفظ', `تمت إضافة ${selectedLeadIds.length} عملاء إلى قاعدة بياناتك.`);
    setSelectedLeadIds([]);
    setShowSaveModal(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-24">
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
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-[2] relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="النشاط (مثلاً: برمجيات، مطاعم، مقاولات...)" 
                  className="w-full pr-12 pl-4 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
              <div className="flex-1 relative">
                <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="المدينة" 
                  className="w-full pr-12 pl-4 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                disabled={isSearching}
                className={`bg-blue-600 text-white px-10 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${isSearching ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 active:scale-95 shadow-xl shadow-blue-100'}`}
              >
                {isSearching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Search size={22} />}
                {isSearching ? 'جاري البحث...' : 'بحث الآن'}
              </button>
            </form>
          </div>

          {leads.length > 0 && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              
              {viewMode === 'TABLE' ? (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-gray-100">
                          <th className="px-6 py-4 w-12"></th>
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">اسم الشركة</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">النشاط</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">الموقع</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">التواصل</th>
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
                                <div className="h-12 w-12 bg-white border border-gray-100 text-blue-600 rounded-2xl flex items-center justify-center font-black shadow-sm">
                                  {lead.companyName[0]}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{lead.companyName}</p>
                                  <div className="flex gap-1 mt-0.5">
                                    {lead.tags?.map((t, i) => (
                                      <span key={i} className="text-[9px] font-bold text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded-md">{t}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-sm font-bold text-gray-600">{lead.industry}</span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-1 text-sm font-bold text-gray-400">
                                <MapPin size={14} />
                                {lead.city}
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center justify-center gap-2">
                                {lead.phone && (
                                  <div className="p-2.5 bg-green-50 text-green-600 rounded-xl border border-green-100" title={lead.phone}>
                                    <Phone size={16} />
                                  </div>
                                )}
                                {lead.website && (
                                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100" title={lead.website}>
                                    <Globe size={16} />
                                  </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredResults.map(lead => (
                    <LeadGridCard 
                      key={lead.id}
                      lead={lead}
                      selected={selectedLeadIds.includes(lead.id)}
                      onClick={() => navigate(`/app/leads/${lead.id}`)}
                      onSelect={(e) => toggleSelectLead(lead.id, e)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
           <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
             <h3 className="font-black text-lg text-gray-900 mb-4 flex items-center gap-2"><History size={18} className="text-blue-600" /> آخر عمليات البحث</h3>
             <div className="space-y-4">
               {searchHistory.map((h, i) => (
                 <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-200 transition-all cursor-pointer group">
                   <p className="font-bold text-gray-800 group-hover:text-blue-600 text-sm">{h.query}</p>
                   <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-gray-400 font-bold">{h.date}</span>
                      <span className="text-[10px] text-blue-600 font-black">{h.results} نتيجة</span>
                   </div>
                 </div>
               ))}
             </div>
             <button className="w-full mt-4 text-xs font-black text-gray-400 hover:text-blue-600">مسح السجل</button>
           </div>

           <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10 space-y-4">
                 <div className="p-3 bg-white/20 rounded-2xl w-fit border border-white/20 shadow-lg"><Sparkles size={24} /></div>
                 <h4 className="text-xl font-black">اكتشاف بـ AI</h4>
                 <p className="text-sm opacity-80 leading-relaxed font-bold">دع الذكاء الاصطناعي يقترح عليك قطاعات جديدة بناءً على نجاحاتك السابقة.</p>
                 <button className="w-full bg-white text-blue-600 py-3 rounded-xl font-black text-xs shadow-xl active:scale-95 transition-all">تفعيل الذكاء الاستكشافي</button>
              </div>
              <Zap className="absolute -bottom-10 -left-10 text-white/5 rotate-12 transition-transform group-hover:scale-125 duration-1000" size={180} />
           </div>
        </div>
      </div>

      <BulkActionsBar 
        count={selectedLeadIds.length} 
        onClear={() => setSelectedLeadIds([])} 
        onSaveToList={() => setShowSaveModal(true)}
      />

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
                onClick={() => handleBulkSave()}
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
                  onClick={() => handleBulkSave(list.id)}
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
