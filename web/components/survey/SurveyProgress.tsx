import React from 'react';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface SurveyProgressProps {
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  message?: string;
  onClose?: () => void;
}

const SurveyProgress: React.FC<SurveyProgressProps> = ({
  status,
  message,
  onClose,
}) => {
  const statusConfig = {
    PENDING: {
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      title: 'في انتظار البدء',
      defaultMessage: 'سيبدأ التحليل قريباً...',
    },
    GENERATING: {
      icon: Loader2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      title: 'جاري التحليل',
      defaultMessage: 'يتم تحليل بيانات العميل باستخدام الذكاء الاصطناعي...',
    },
    COMPLETED: {
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      title: 'اكتمل التحليل',
      defaultMessage: 'تم إنشاء التقرير بنجاح!',
    },
    FAILED: {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      title: 'فشل التحليل',
      defaultMessage: 'حدث خطأ أثناء إنشاء التقرير',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`p-6 rounded-2xl border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${config.bgColor}`}>
          <Icon
            size={24}
            className={`${config.color} ${status === 'GENERATING' ? 'animate-spin' : ''}`}
          />
        </div>
        <div className="flex-1">
          <h3 className={`font-bold text-lg ${config.color}`}>{config.title}</h3>
          <p className="text-gray-600 mt-1">{message || config.defaultMessage}</p>
          
          {status === 'GENERATING' && (
            <div className="mt-4">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                ⏱️ الوقت المتوقع: 1-3 دقائق
              </p>
            </div>
          )}
          
          {status === 'COMPLETED' && onClose && (
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
            >
              عرض التقرير
            </button>
          )}
          
          {status === 'FAILED' && onClose && (
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-xl font-bold hover:bg-gray-700 transition-colors"
            >
              إغلاق
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyProgress;
