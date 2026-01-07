
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in zoom-in duration-500">
      <div className="bg-gray-50 p-10 rounded-[3rem] mb-6 group">
        <Icon size={64} className="text-gray-200 group-hover:text-blue-400 transition-colors duration-500" />
      </div>
      <h3 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h3>
      <p className="text-gray-500 max-w-sm mx-auto mt-2 font-bold leading-relaxed">{description}</p>
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
};

export default EmptyState;
