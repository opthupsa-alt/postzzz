
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  declare props: Props;
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-500">
          <div className="bg-red-50 p-6 rounded-[2rem] mb-6 text-red-500 shadow-xl shadow-red-100">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">عذراً، حدث خطأ غير متوقع</h2>
          <p className="text-gray-500 font-bold max-w-md leading-relaxed mb-8">
            لقد واجه النظام مشكلة تقنية أثناء تحميل هذه الصفحة. يرجى محاولة التحديث أو العودة لاحقاً.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95"
          >
            <RefreshCcw size={20} />
            تحديث الصفحة الآن
          </button>
        </div>
      );
    }

    // Fix: access children from this.props
    return this.props.children;
  }
}

export default ErrorBoundary;
