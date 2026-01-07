
import React from 'react';

export const TableSkeleton = () => (
  <div className="space-y-4 animate-pulse p-6">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-50 last:border-0">
        <div className="h-12 w-12 bg-gray-100 rounded-xl"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded w-1/4"></div>
          <div className="h-3 bg-gray-50 rounded w-1/6"></div>
        </div>
        <div className="h-4 bg-gray-50 rounded w-20"></div>
      </div>
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 animate-pulse">
    <div className="flex items-start justify-between mb-6">
      <div className="h-16 w-16 bg-gray-100 rounded-2xl"></div>
      <div className="h-8 w-8 bg-gray-50 rounded-xl"></div>
    </div>
    <div className="h-6 bg-gray-100 rounded w-3/4 mb-4"></div>
    <div className="h-4 bg-gray-50 rounded w-1/2 mb-8"></div>
    <div className="flex gap-3">
      <div className="h-10 flex-1 bg-gray-50 rounded-xl"></div>
      <div className="h-10 flex-1 bg-gray-50 rounded-xl"></div>
    </div>
  </div>
);
