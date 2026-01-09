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

        {/* Other sections - placeholder */}
        {['gaps', 'priorities', 'services', 'packages', 'competitors', 'sales'].includes(activeSection) && (
          <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl">
            <HelpCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p>محتوى هذا القسم سيتم عرضه بعد تحليل البيانات</p>
            {report.rawResponse && (
              <details className="mt-4 text-right">
                <summary className="cursor-pointer text-blue-600 hover:underline">
                  عرض الاستجابة الخام
                </summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded-xl text-xs text-gray-600 overflow-auto max-h-96 text-left" dir="ltr">
                  {report.rawResponse}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyReportViewer;
