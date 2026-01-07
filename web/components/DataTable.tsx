
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MoreHorizontal, Search, Download, Trash2, Smartphone, Building2 } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  actions?: (item: T) => React.ReactNode;
}

const DataTable = <T extends { id: string }>({ 
  data, 
  columns, 
  onRowClick, 
  selectedIds = [], 
  onSelectionChange,
  actions
}: DataTableProps<T>) => {
  const [searchTerm, setSearchTerm] = useState('');

  const toggleAll = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? data.map(item => item.id) : []);
    }
  };

  const toggleOne = (id: string, checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange([...selectedIds, id]);
      } else {
        onSelectionChange(selectedIds.filter(sid => sid !== id));
      }
    }
  };

  return (
    <div className="w-full bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              {onSelectionChange && (
                <th className="px-8 py-5 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5 cursor-pointer transition-all"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
              )}
              {columns.map((col, idx) => (
                <th key={idx} className={`px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
              {actions && <th className="px-8 py-5"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((item) => (
              <tr 
                key={item.id} 
                onClick={() => onRowClick?.(item)}
                className={`hover:bg-blue-50/30 transition-all group cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-50/50' : ''}`}
              >
                {onSelectionChange && (
                  <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5 cursor-pointer transition-all"
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => toggleOne(item.id, e.target.checked)}
                    />
                  </td>
                )}
                {columns.map((col, idx) => (
                  <td key={idx} className={`px-6 py-6 ${col.className || ''}`}>
                    {typeof col.accessor === 'function' 
                      ? col.accessor(item) 
                      : (item[col.accessor] as React.ReactNode)}
                  </td>
                ))}
                {actions && (
                  <td className="px-8 py-6 text-left" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                      {actions(item)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <div className="py-20 text-center text-gray-400 font-bold">لا توجد بيانات متاحة حالياً</div>
      )}
    </div>
  );
};

export default DataTable;
