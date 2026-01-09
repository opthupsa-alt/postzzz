import React, { useState } from 'react';
import {
  FileText,
  Target,
  Globe,
  TrendingUp,
  Package,
  Users,
  MessageSquare,
  CreditCard,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Download,
  Copy,
  RefreshCw,
} from 'lucide-react';

interface SurveyReportViewerProps {
  report: any;
  onRegenerate?: () => void;
  onExportPDF?: () => void;
}

const SurveyReportViewer: React.FC<SurveyReportViewerProps> = ({
  report,
  onRegenerate,
  onExportPDF,
}) => {
  const [activeSection, setActiveSection] = useState('summary');
  const [expandedSections, setExpandedSections] = useState<string[]>(['summary']);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const sections = [
    { id: 'summary', title: 'ملخص تنفيذي', icon: FileText },
    { id: 'identity', title: 'تثبيت الهوية', icon: Target },
    { id: 'digital', title: 'الحضور الرقمي', icon: Globe },
    { id: 'gaps', title: 'تحليل الفجوات', icon: AlertCircle },
    { id: 'priorities', title: 'الأولويات', icon: TrendingUp },
    { id: 'services', title: 'الخدمات المقترحة', icon: Package },
    { id: 'packages', title: 'الباقات', icon: CreditCard },
    { id: 'competitors', title: 'المنافسون', icon: Users },
    { id: 'sales', title: 'مواد المندوب', icon: MessageSquare },
    { id: 'crm', title: 'بطاقة CRM', icon: CreditCard },
  ];

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'text-green-600 bg-green-50';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50';
      case 'LOW':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getConfidenceLabel = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'عالية';
      case 'MEDIUM':
        return 'متوسطة';
      case 'LOW':
        return 'منخفضة';
      default:
        return 'غير محدد';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900">
              تقرير AI EBI
            </h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {report.processingTimeMs
                  ? `${(report.processingTimeMs / 1000).toFixed(1)} ثانية`
                  : 'غير محدد'}
              </span>
              <span className="flex items-center gap-1">
                🔢 {report.totalTokens?.toLocaleString() || 0} tokens
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${getConfidenceColor(
                  report.executiveSummary?.confidenceLevel || 'MEDIUM'
                )}`}
              >
                ثقة {getConfidenceLabel(report.executiveSummary?.confidenceLevel || 'MEDIUM')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onExportPDF && (
              <button
                onClick={onExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Download size={16} />
                تصدير PDF
              </button>
            )}
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors"
              >
                <RefreshCw size={16} />
                إعادة التحليل
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors ${
                activeSection === section.id
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon size={16} />
              {section.title}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Executive Summary */}
        {activeSection === 'summary' && (
          <div className="space-y-4">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <FileText className="text-purple-600" size={24} />
              ملخص تنفيذي
            </h3>
            {report.executiveSummary?.points?.length > 0 ? (
              <ul className="space-y-3">
                {report.executiveSummary.points.map((point: string, index: number) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl"
                  >
                    <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl">
                <HelpCircle size={48} className="mx-auto mb-4 opacity-50" />
                <p>لا توجد نقاط ملخصة متاحة</p>
              </div>
            )}
          </div>
        )}

        {/* Identity Anchors */}
        {activeSection === 'identity' && (
          <div className="space-y-4">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Target className="text-purple-600" size={24} />
              تثبيت الهوية
            </h3>
            
            <div className="grid gap-4">
              {/* Confirmed Identifiers */}
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <h4 className="font-bold text-green-700 mb-3">معرفات مؤكدة</h4>
                {report.identityAnchors?.confirmedIdentifiers?.length > 0 ? (
                  <div className="space-y-2">
                    {report.identityAnchors.confirmedIdentifiers.map(
                      (item: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-2 bg-white rounded-lg"
                        >
                          <CheckCircle2 size={16} className="text-green-600" />
                          <span className="font-bold text-gray-700">{item.type}:</span>
                          <span className="text-gray-600">{item.value}</span>
                          <span className="text-xs text-gray-400">({item.source})</span>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-green-600 text-sm">لا توجد معرفات مؤكدة</p>
                )}
              </div>

              {/* Look-alikes */}
              {report.identityAnchors?.lookAlikes?.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                  <h4 className="font-bold text-yellow-700 mb-3">كيانات مستبعدة (تشابه أسماء)</h4>
                  <div className="space-y-2">
                    {report.identityAnchors.lookAlikes.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 bg-white rounded-lg"
                      >
                        <AlertCircle size={16} className="text-yellow-600" />
                        <span className="font-bold text-gray-700">{item.name}</span>
                        <span className="text-xs text-gray-400">- {item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700">درجة الثقة:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-bold ${getConfidenceColor(
                      report.identityAnchors?.confidenceLevel || 'MEDIUM'
                    )}`}
                  >
                    {getConfidenceLabel(report.identityAnchors?.confidenceLevel || 'MEDIUM')}
                  </span>
                </div>
                {report.identityAnchors?.confidenceReason && (
                  <p className="text-sm text-gray-500 mt-2">
                    {report.identityAnchors.confidenceReason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Digital Footprint */}
        {activeSection === 'digital' && (
          <div className="space-y-4">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Globe className="text-purple-600" size={24} />
              جرد الحضور الرقمي
            </h3>
            
            {report.digitalFootprint?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">المنصة</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">الحالة</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">التفاصيل</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">الرابط</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.digitalFootprint.map((item: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold text-gray-900">{item.platform}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                              item.status === 'EXISTS'
                                ? 'bg-green-100 text-green-700'
                                : item.status === 'NOT_FOUND'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {item.status === 'EXISTS'
                              ? 'موجود'
                              : item.status === 'NOT_FOUND'
                              ? 'غير موجود'
                              : 'غير مؤكد'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.details || '-'}</td>
                        <td className="px-4 py-3">
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink size={14} />
                              زيارة
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl">
                <Globe size={48} className="mx-auto mb-4 opacity-50" />
                <p>لا توجد بيانات حضور رقمي متاحة</p>
              </div>
            )}
          </div>
        )}

        {/* CRM Card */}
        {activeSection === 'crm' && (
          <div className="space-y-4">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <CreditCard className="text-purple-600" size={24} />
              بطاقة CRM
            </h3>
            
            {report.crmCard ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">اسم الشركة:</span>
                    <span className="font-bold">{report.crmCard.companyName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">المجال:</span>
                    <span className="font-bold">{report.crmCard.industry || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">المدينة:</span>
                    <span className="font-bold">{report.crmCard.city || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">الهاتف:</span>
                    <span className="font-bold">{report.crmCard.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">البريد:</span>
                    <span className="font-bold">{report.crmCard.email || '-'}</span>
                  </div>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-xl space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">درجة التأهيل:</span>
                    <span className="font-bold text-purple-600">
                      {report.crmCard.qualificationScore || 0}/100
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">الأولوية:</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        report.crmCard.priority === 'HIGH'
                          ? 'bg-red-100 text-red-700'
                          : report.crmCard.priority === 'MEDIUM'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {report.crmCard.priority === 'HIGH'
                        ? 'عالية'
                        : report.crmCard.priority === 'MEDIUM'
                        ? 'متوسطة'
                        : 'منخفضة'}
                    </span>
                  </div>
                  {report.crmCard.recommendedServices?.length > 0 && (
                    <div>
                      <span className="text-gray-500 block mb-2">الخدمات الموصى بها:</span>
                      <div className="flex flex-wrap gap-1">
                        {report.crmCard.recommendedServices.map((service: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-white rounded-lg text-xs font-bold text-purple-600"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Copy JSON Button */}
                <div className="md:col-span-2">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(report.crmCard, null, 2))}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    <Copy size={16} />
                    نسخ بطاقة CRM (JSON)
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl">
                <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
                <p>لا توجد بطاقة CRM متاحة</p>
              </div>
            )}
          </div>
        )}

        {/* Gap Analysis */}
        {activeSection === 'gaps' && (
          <div className="space-y-4">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <AlertCircle className="text-purple-600" size={24} />
              تحليل الفجوات
            </h3>
            
            {report.gapAnalysis?.length > 0 ? (
              <div className="grid gap-4">
                {report.gapAnalysis.map((gap: any, index: number) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-gray-900">{gap.category}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        gap.status === 'GOOD' ? 'bg-green-100 text-green-700' :
                        gap.status === 'NEEDS_IMPROVEMENT' ? 'bg-yellow-100 text-yellow-700' :
                        gap.status === 'MISSING' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {gap.status === 'GOOD' ? 'جيد' :
                         gap.status === 'NEEDS_IMPROVEMENT' ? 'يحتاج تحسين' :
                         gap.status === 'MISSING' ? 'غائب' : 'غير محدد'}
                      </span>
                    </div>
                    {gap.findings?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-bold text-gray-600 mb-2">النتائج:</p>
                        <ul className="space-y-1">
                          {gap.findings.map((finding: string, i: number) => (
                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-purple-600">•</span>
                              {finding}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {gap.recommendations?.length > 0 && (
                      <div>
                        <p className="text-sm font-bold text-green-600 mb-2">التوصيات:</p>
                        <ul className="space-y-1">
                          {gap.recommendations.map((rec: string, i: number) => (
                            <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                              <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl">
                <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                <p>لا توجد بيانات تحليل فجوات متاحة</p>
              </div>
            )}
          </div>
        )}

        {/* Priorities */}
        {activeSection === 'priorities' && (
          <div className="space-y-4">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <TrendingUp className="text-purple-600" size={24} />
              الأولويات بالترتيب المنطقي
            </h3>
            
            {report.priorities?.length > 0 ? (
              <div className="space-y-3">
                {report.priorities.map((priority: any, index: number) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-4">
                    <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-black ${
                      priority.impact === 'HIGH' ? 'bg-red-100 text-red-700' :
                      priority.impact === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {priority.rank}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-1">{priority.title}</h4>
                      <p className="text-sm text-gray-600">{priority.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`text-xs font-bold ${
                          priority.impact === 'HIGH' ? 'text-red-600' :
                          priority.impact === 'MEDIUM' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          التأثير: {priority.impact === 'HIGH' ? 'عالي' : priority.impact === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                        </span>
                        <span className="text-xs text-gray-400">
                          الجهد: {priority.effort === 'HIGH' ? 'عالي' : priority.effort === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl">
                <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                <p>لا توجد أولويات متاحة</p>
              </div>
            )}
          </div>
        )}

        {/* Services */}
        {activeSection === 'services' && (
          <div className="space-y-4">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Package className="text-purple-600" size={24} />
              خدمات OP-Target المقترحة
            </h3>
            
            {report.serviceMapping?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">الخدمة</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">المشكلة</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">النتيجة المتوقعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.serviceMapping.map((service: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold text-purple-600">{service.suggestedService}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{service.problem || '-'}</td>
                        <td className="px-4 py-3 text-sm text-green-600">{service.expectedOutcome || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl">
                <Package size={48} className="mx-auto mb-4 opacity-50" />
                <p>لا توجد خدمات مقترحة متاحة</p>
              </div>
            )}
          </div>
        )}

        {/* Packages */}
        {activeSection === 'packages' && (
          <div className="space-y-4">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <CreditCard className="text-purple-600" size={24} />
              الباقات المقترحة
            </h3>
            
            {report.packages?.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-4">
                {report.packages.map((pkg: any, index: number) => (
                  <div key={index} className={`p-6 rounded-xl border-2 ${
                    index === 1 ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white'
                  }`}>
                    {index === 1 && (
                      <span className="block text-center text-xs font-bold text-purple-600 mb-2">⭐ الأكثر شيوعاً</span>
                    )}
                    <h4 className="text-lg font-black text-gray-900 text-center mb-1">{pkg.nameAr}</h4>
                    <p className="text-sm text-gray-500 text-center mb-4">{pkg.suitableFor}</p>
                    {pkg.includes?.length > 0 && (
                      <ul className="space-y-2">
                        {pkg.includes.map((item: string, i: number) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <CheckCircle2 size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl">
                <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
                <p>لا توجد باقات مقترحة متاحة</p>
              </div>
            )}
          </div>
        )}

        {/* Competitors */}
        {activeSection === 'competitors' && (
          <div className="space-y-4">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Users className="text-purple-600" size={24} />
              المنافسون
            </h3>
            
            {report.competitors?.length > 0 ? (
              <div className="grid gap-4">
                {report.competitors.map((competitor: any, index: number) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-gray-900">{competitor.name}</h4>
                      {competitor.city && (
                        <span className="text-sm text-gray-500">{competitor.city}</span>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {competitor.strengths?.length > 0 && (
                        <div>
                          <p className="text-sm font-bold text-green-600 mb-2">نقاط القوة:</p>
                          <ul className="space-y-1">
                            {competitor.strengths.map((s: string, i: number) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-green-600">+</span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {competitor.weaknesses?.length > 0 && (
                        <div>
                          <p className="text-sm font-bold text-red-600 mb-2">نقاط الضعف:</p>
                          <ul className="space-y-1">
                            {competitor.weaknesses.map((w: string, i: number) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-red-600">-</span>
                                {w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>لا توجد بيانات منافسين متاحة</p>
              </div>
            )}
          </div>
        )}

        {/* Sales Enablement */}
        {activeSection === 'sales' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <MessageSquare className="text-purple-600" size={24} />
              مواد المندوب
            </h3>
            
            {/* Discovery Questions */}
            {report.salesEnablement?.discoveryQuestions?.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-bold text-blue-700 mb-3">أسئلة الاكتشاف</h4>
                <ul className="space-y-2">
                  {report.salesEnablement.discoveryQuestions.map((q: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="font-bold text-blue-600">{i + 1}.</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Call Script */}
            {report.salesEnablement?.callScript && (
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-green-700">سكريبت الاتصال</h4>
                  <button
                    onClick={() => copyToClipboard(report.salesEnablement.callScript)}
                    className="text-xs text-green-600 hover:underline flex items-center gap-1"
                  >
                    <Copy size={12} />
                    نسخ
                  </button>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.salesEnablement.callScript}</p>
              </div>
            )}

            {/* Objections */}
            {report.salesEnablement?.objections?.length > 0 && (
              <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                <h4 className="font-bold text-yellow-700 mb-3">الاعتراضات المتوقعة والردود</h4>
                <div className="space-y-3">
                  {report.salesEnablement.objections.map((obj: any, i: number) => (
                    <div key={i} className="p-3 bg-white rounded-lg">
                      <p className="text-sm font-bold text-red-600 mb-1">❌ {obj.objection}</p>
                      {obj.response && (
                        <p className="text-sm text-green-600">✓ {obj.response}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Best Action */}
            {report.salesEnablement?.nextBestAction && (
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <h4 className="font-bold text-purple-700 mb-2">الخطوة التالية الموصى بها</h4>
                <p className="text-sm text-gray-700">{report.salesEnablement.nextBestAction}</p>
              </div>
            )}

            {!report.salesEnablement?.discoveryQuestions?.length && 
             !report.salesEnablement?.callScript && 
             !report.salesEnablement?.objections?.length && (
              <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                <p>لا توجد مواد مندوب متاحة</p>
              </div>
            )}
          </div>
        )}

        {/* Raw Response (for debugging) */}
        {report.rawResponse && (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600">
              عرض الاستجابة الخام (للمطورين)
            </summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded-xl text-xs text-gray-600 overflow-auto max-h-96 text-left" dir="ltr">
              {report.rawResponse}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default SurveyReportViewer;
