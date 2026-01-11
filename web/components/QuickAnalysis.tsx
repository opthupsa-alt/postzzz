import React, { useState } from 'react';
import { Zap, TrendingUp, AlertCircle, CheckCircle2, Target, Lightbulb, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { analyzeCompanyLocal, LocalAnalysisResult, CompanyDataForAnalysis } from '../lib/api';
import { showToast } from './NotificationToast';

interface QuickAnalysisProps {
  companyData: CompanyDataForAnalysis;
  onAnalysisComplete?: (result: LocalAnalysisResult) => void;
}

const QuickAnalysis: React.FC<QuickAnalysisProps> = ({ companyData, onAnalysisComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LocalAnalysisResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // استخراج جميع البيانات من metadata وتمريرها للتحليل
      const metadata = companyData.metadata || {};
      const enrichedData = {
        ...companyData,
        // البيانات الأساسية - استخدام البيانات المستخرجة إذا لم تكن موجودة
        phone: companyData.phone || metadata.allPhones?.[0],
        email: companyData.email || metadata.allEmails?.[0],
        // بيانات السوشيال ميديا
        socialLinks: companyData.socialLinks || metadata.socialLinks,
        socialProfiles: metadata.socialProfiles,
        // البيانات الموسعة من البحث
        allEmails: metadata.allEmails,
        allPhones: metadata.allPhones,
        totalFollowers: metadata.totalFollowers,
        strongestPlatform: metadata.strongestPlatform,
        dataCompleteness: metadata.dataCompleteness,
        dataSources: metadata.dataSources,
        description: metadata.description,
      };
      
      const analysisResult = await analyzeCompanyLocal(enrichedData);
      setResult(analysisResult);
      onAnalysisComplete?.(analysisResult);
      showToast('SUCCESS', 'تحليل سريع', 'تم إنشاء التحليل بنجاح');
    } catch (err: any) {
      setError(err.message || 'فشل التحليل');
      showToast('ERROR', 'خطأ', 'فشل إنشاء التحليل السريع');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GOOD': return 'text-green-600 bg-green-50 border-green-100';
      case 'NEEDS_IMPROVEMENT': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'MISSING': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'GOOD': return 'جيد';
      case 'NEEDS_IMPROVEMENT': return 'يحتاج تحسين';
      case 'MISSING': return 'غائب';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600 bg-red-50';
      case 'MEDIUM': return 'text-amber-600 bg-amber-50';
      case 'LOW': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'عالية';
      case 'MEDIUM': return 'متوسطة';
      case 'LOW': return 'منخفضة';
      default: return priority;
    }
  };

  if (!result) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-2xl border border-purple-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Zap size={24} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">تحليل سريع</h3>
              <p className="text-sm text-gray-500">تحليل فوري بدون انتظار - نتائج في ثانية</p>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-200"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                جاري التحليل...
              </>
            ) : (
              <>
                <Zap size={18} />
                تحليل الآن
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header with Score */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Zap size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">التحليل السريع</h3>
              <p className="text-white/80 text-sm">تحليل محلي فوري</p>
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black">{result.digitalPresenceScore}%</div>
            <div className="text-white/80 text-sm">الحضور الرقمي</div>
          </div>
        </div>
      </div>

      {/* Summary Points */}
      <div className="p-6 border-b border-gray-100">
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Target size={18} className="text-purple-600" />
          ملخص التحليل
        </h4>
        <ul className="space-y-2">
          {result.executiveSummary.points.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              {point}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-400">مستوى الثقة:</span>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            result.executiveSummary.confidenceLevel === 'HIGH' ? 'bg-green-100 text-green-700' :
            result.executiveSummary.confidenceLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {result.executiveSummary.confidenceLevel === 'HIGH' ? 'عالي' :
             result.executiveSummary.confidenceLevel === 'MEDIUM' ? 'متوسط' : 'منخفض'}
          </span>
        </div>
      </div>

      {/* Qualification Score */}
      <div className="p-6 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-gray-900">درجة التأهيل للبيع</h4>
            <p className="text-sm text-gray-500">احتمالية نجاح البيع</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  result.qualificationScore >= 70 ? 'bg-green-500' :
                  result.qualificationScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${result.qualificationScore}%` }}
              />
            </div>
            <span className="font-black text-xl">{result.qualificationScore}%</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(result.priority)}`}>
              أولوية {getPriorityLabel(result.priority)}
            </span>
          </div>
        </div>
      </div>

      {/* Recommended Services */}
      <div className="p-6 border-b border-gray-100">
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-blue-600" />
          الخدمات المقترحة
        </h4>
        <div className="space-y-2">
          {result.recommendedServices.slice(0, 4).map((service, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm">{service.service}</p>
                <p className="text-xs text-gray-500">{service.reason}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${getPriorityColor(service.priority)}`}>
                {getPriorityLabel(service.priority)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Toggle Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-4 flex items-center justify-center gap-2 text-purple-600 font-bold hover:bg-purple-50 transition-all"
      >
        {showDetails ? (
          <>
            <ChevronUp size={18} />
            إخفاء التفاصيل
          </>
        ) : (
          <>
            <ChevronDown size={18} />
            عرض المزيد من التفاصيل
          </>
        )}
      </button>

      {/* Detailed Sections */}
      {showDetails && (
        <div className="border-t border-gray-100">
          {/* Gaps */}
          <div className="p-6 border-b border-gray-100">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-600" />
              تحليل الفجوات
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.gaps.map((gap, i) => (
                <div key={i} className={`p-3 rounded-xl border ${getStatusColor(gap.status)}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{gap.category}</span>
                    <span className="text-xs font-bold">{getStatusLabel(gap.status)}</span>
                  </div>
                  <p className="text-xs opacity-80">{gap.recommendation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sales Tips */}
          <div className="p-6">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Lightbulb size={18} className="text-yellow-600" />
              نصائح للمبيعات
            </h4>
            <ul className="space-y-2">
              {result.salesTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 p-2 bg-yellow-50 rounded-lg">
                  <span className="text-yellow-600 font-bold">{i + 1}.</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Re-analyze Button */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="w-full py-2 text-purple-600 font-bold hover:bg-purple-100 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Zap size={16} />
          إعادة التحليل
        </button>
      </div>
    </div>
  );
};

export default QuickAnalysis;
