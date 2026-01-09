import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Calendar,
  TrendingUp,
  Users,
  BarChart3,
  X,
  Eye,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import {
  getDataBankStats,
  getDataBankLeads,
  getDataBankFilters,
  exportDataBankLeads,
  DataBankStats,
  DataBankLead,
  DataBankFilters,
  DataBankLeadsParams,
} from '../../lib/api';
import { showToast } from '../../components/NotificationToast';

const ITEMS_PER_PAGE = 25;

const statusLabels: Record<string, { label: string; color: string }> = {
  NEW: { label: 'جديد', color: 'bg-blue-100 text-blue-700' },
  CONTACTED: { label: 'تم التواصل', color: 'bg-yellow-100 text-yellow-700' },
  QUALIFIED: { label: 'مؤهل', color: 'bg-green-100 text-green-700' },
  PROPOSAL: { label: 'عرض سعر', color: 'bg-purple-100 text-purple-700' },
  NEGOTIATION: { label: 'تفاوض', color: 'bg-orange-100 text-orange-700' },
  WON: { label: 'تم الفوز', color: 'bg-emerald-100 text-emerald-700' },
  LOST: { label: 'خسارة', color: 'bg-red-100 text-red-700' },
};

const AdminDataBank: React.FC = () => {
  const [stats, setStats] = useState<DataBankStats | null>(null);
  const [leads, setLeads] = useState<DataBankLead[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<DataBankFilters | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState<DataBankLead | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadStats = async () => {
    try {
      const data = await getDataBankStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadFilters = async () => {
    try {
      const data = await getDataBankFilters();
      setFilters(data);
    } catch (err: any) {
      console.error('Failed to load filters:', err);
    }
  };

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params: DataBankLeadsParams = {
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
        sortBy,
        sortOrder,
      };

      if (searchQuery) params.search = searchQuery;
      if (selectedTenant) params.tenantId = selectedTenant;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedSource) params.source = selectedSource;
      if (selectedCity) params.city = selectedCity;
      if (selectedIndustry) params.industry = selectedIndustry;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const data = await getDataBankLeads(params);
      setLeads(data.leads);
      setTotal(data.total);
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedTenant, selectedStatus, selectedSource, selectedCity, selectedIndustry, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => {
    loadStats();
    loadFilters();
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLeads();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTenant('');
    setSelectedStatus('');
    setSelectedSource('');
    setSelectedCity('');
    setSelectedIndustry('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const data = await exportDataBankLeads({
        tenantId: selectedTenant || undefined,
        status: selectedStatus || undefined,
        source: selectedSource || undefined,
        city: selectedCity || undefined,
        industry: selectedIndustry || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });

      // Convert to CSV
      if (data.length === 0) {
        showToast('ERROR', 'تنبيه', 'لا توجد بيانات للتصدير');
        return;
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${(row as any)[h] || ''}"`).join(',')),
      ].join('\n');

      // Add BOM for Arabic support
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `data-bank-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      showToast('SUCCESS', 'تم التصدير', `تم تصدير ${data.length} سجل بنجاح`);
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل التصدير');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const activeFiltersCount = [selectedTenant, selectedStatus, selectedSource, selectedCity, selectedIndustry, dateFrom, dateTo].filter(Boolean).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <Database className="text-blue-600" />
            بنك البيانات
          </h1>
          <p className="text-gray-500 font-medium">جميع بيانات العملاء المحتملين من كافة المنظمات</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { loadStats(); loadLeads(); }}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            title="تحديث"
          >
            <RefreshCw size={18} className="text-gray-500" />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={18} />
            )}
            تصدير Excel
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Database className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">إجمالي البيانات</p>
                <p className="text-2xl font-black text-gray-900">{stats.totalLeads.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingUp className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">اليوم</p>
                <p className="text-2xl font-black text-gray-900">{stats.leadsToday.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Calendar className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">هذا الأسبوع</p>
                <p className="text-2xl font-black text-gray-900">{stats.leadsThisWeek.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-xl">
                <BarChart3 className="text-orange-600" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">هذا الشهر</p>
                <p className="text-2xl font-black text-gray-900">{stats.leadsThisMonth.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats by Status & Source */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* By Status */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="font-bold text-gray-900 mb-3">حسب الحالة</h3>
            <div className="space-y-2">
              {stats.byStatus.map((item) => {
                const statusInfo = statusLabels[item.status] || { label: item.status, color: 'bg-gray-100 text-gray-700' };
                const percentage = stats.totalLeads > 0 ? (item.count / stats.totalLeads) * 100 : 0;
                return (
                  <div key={item.status} className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${statusInfo.color} min-w-[80px] text-center`}>
                      {statusInfo.label}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-600 min-w-[50px] text-left">
                      {item.count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By Tenant */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="font-bold text-gray-900 mb-3">أعلى المنظمات</h3>
            <div className="space-y-2">
              {stats.byTenant.slice(0, 5).map((item) => {
                const percentage = stats.totalLeads > 0 ? (item.count / stats.totalLeads) * 100 : 0;
                return (
                  <div key={item.tenantId} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-700 min-w-[120px] truncate">
                      {item.tenantName}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-600 min-w-[50px] text-left">
                      {item.count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم، البريد، الهاتف، المدينة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter size={18} />
            فلاتر
            {activeFiltersCount > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Search Button */}
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            بحث
          </button>
        </form>

        {/* Advanced Filters */}
        {showFilters && filters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Tenant Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">المنظمة</label>
              <select
                value={selectedTenant}
                onChange={(e) => { setSelectedTenant(e.target.value); setPage(1); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium"
              >
                <option value="">الكل</option>
                {filters.tenants.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">الحالة</label>
              <select
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium"
              >
                <option value="">الكل</option>
                {filters.statuses.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">المصدر</label>
              <select
                value={selectedSource}
                onChange={(e) => { setSelectedSource(e.target.value); setPage(1); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium"
              >
                <option value="">الكل</option>
                {filters.sources.map((s) => (
                  <option key={s.value} value={s.value}>{s.label} ({s.count})</option>
                ))}
              </select>
            </div>

            {/* City Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">المدينة</label>
              <select
                value={selectedCity}
                onChange={(e) => { setSelectedCity(e.target.value); setPage(1); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium"
              >
                <option value="">الكل</option>
                {filters.cities.map((c) => (
                  <option key={c.value} value={c.value}>{c.label} ({c.count})</option>
                ))}
              </select>
            </div>

            {/* Industry Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">القطاع</label>
              <select
                value={selectedIndustry}
                onChange={(e) => { setSelectedIndustry(e.target.value); setPage(1); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium"
              >
                <option value="">الكل</option>
                {filters.industries.map((i) => (
                  <option key={i.value} value={i.value}>{i.label} ({i.count})</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">من تاريخ</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium"
              />
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
                مسح الفلاتر
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase">الشركة</th>
                <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase">المنظمة</th>
                <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase">القطاع</th>
                <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase">المدينة</th>
                <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase">الحالة</th>
                <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase">المصدر</th>
                <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase">التاريخ</th>
                <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    لا توجد بيانات مطابقة
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const statusInfo = statusLabels[lead.status] || { label: lead.status, color: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <Building2 className="text-blue-600" size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{lead.companyName}</p>
                            {lead.email && (
                              <p className="text-xs text-gray-400">{lead.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-600">{lead.tenant.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{lead.industry || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{lead.city || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{lead.source || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">
                          {new Date(lead.createdAt).toLocaleDateString('ar-SA')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye size={16} className="text-gray-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-sm text-gray-500">
              عرض {((page - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(page * ITEMS_PER_PAGE, total)} من {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
              <span className="px-4 py-2 font-bold text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-black text-gray-900">تفاصيل العميل المحتمل</h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Company Info */}
              <div className="flex items-start gap-4">
                <div className="p-4 bg-blue-100 rounded-2xl">
                  <Building2 className="text-blue-600" size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-gray-900">{selectedLead.companyName}</h3>
                  <p className="text-gray-500">{selectedLead.industry || 'قطاع غير محدد'}</p>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-lg text-sm font-bold ${statusLabels[selectedLead.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                    {statusLabels[selectedLead.status]?.label || selectedLead.status}
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                {selectedLead.phone && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Phone className="text-gray-400" size={18} />
                    <div>
                      <p className="text-xs text-gray-400">الهاتف</p>
                      <p className="font-bold text-gray-900">{selectedLead.phone}</p>
                    </div>
                  </div>
                )}
                {selectedLead.email && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Mail className="text-gray-400" size={18} />
                    <div>
                      <p className="text-xs text-gray-400">البريد</p>
                      <p className="font-bold text-gray-900">{selectedLead.email}</p>
                    </div>
                  </div>
                )}
                {selectedLead.website && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Globe className="text-gray-400" size={18} />
                    <div>
                      <p className="text-xs text-gray-400">الموقع</p>
                      <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 hover:underline">
                        {selectedLead.website}
                      </a>
                    </div>
                  </div>
                )}
                {selectedLead.city && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <MapPin className="text-gray-400" size={18} />
                    <div>
                      <p className="text-xs text-gray-400">المدينة</p>
                      <p className="font-bold text-gray-900">{selectedLead.city}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Address */}
              {selectedLead.address && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">العنوان</p>
                  <p className="font-medium text-gray-900">{selectedLead.address}</p>
                </div>
              )}

              {/* Notes */}
              {selectedLead.notes && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">ملاحظات</p>
                  <p className="font-medium text-gray-900">{selectedLead.notes}</p>
                </div>
              )}

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-400">المنظمة</p>
                  <p className="font-bold text-gray-900">{selectedLead.tenant.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">المصدر</p>
                  <p className="font-bold text-gray-900">{selectedLead.source || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">أضافه</p>
                  <p className="font-bold text-gray-900">{selectedLead.createdBy.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">تاريخ الإضافة</p>
                  <p className="font-bold text-gray-900">
                    {new Date(selectedLead.createdAt).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDataBank;
