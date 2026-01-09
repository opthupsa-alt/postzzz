import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface SurveyButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SurveyButton: React.FC<SurveyButtonProps> = ({
  onClick,
  isLoading = false,
  disabled = false,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        flex items-center ${sizeClasses[size]}
        bg-gradient-to-r from-purple-600 to-blue-600
        hover:from-purple-700 hover:to-blue-700
        text-white font-bold rounded-xl
        shadow-lg shadow-purple-200
        transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:scale-105 active:scale-95
      `}
    >
      {isLoading ? (
        <>
          <Loader2 size={iconSizes[size]} className="animate-spin" />
          <span>جاري التحليل...</span>
        </>
      ) : (
        <>
          <Sparkles size={iconSizes[size]} />
          <span>سيرفيه AI</span>
        </>
      )}
    </button>
  );
};

export default SurveyButton;
