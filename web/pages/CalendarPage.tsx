import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, ChevronRight, ChevronLeft, LayoutGrid, AlertCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { getPosts, Post, POST_STATUS_CONFIG, PostStatus, ALL_POST_STATUSES } from '../lib/posts-api';
import { getClients, Client } from '../lib/clients-api';

type ViewMode = 'calendar' | 'board';

const BOARD_COLUMNS: { status: PostStatus; label: string }[] = [
  { status: 'DRAFT', label: 'مسودة' },
  { status: 'PENDING_APPROVAL', label: 'بانتظار الموافقة' },
  { status: 'APPROVED', label: 'تمت الموافقة' },
  { status: 'SCHEDULED', label: 'مجدول' },
  { status: 'PUBLISHING', label: 'جاري النشر' },
  { status: 'PUBLISHED', label: 'تم النشر' },
  { status: 'FAILED', label: 'فشل' },
];

const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<Post[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadPosts();
  }, [currentDate, selectedClientId]);

  const loadClients = async () => {
    try {
      const data = await getClients();
      setClients(data);
    } catch (err: any) {
      console.error('Failed to load clients:', err);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate month range
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const from = new Date(year, month, 1).toISOString();
      const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      
      const data = await getPosts({
        from,
        to,
        clientId: selectedClientId || undefined,
      });
      setPosts(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل المنشورات');
    } finally {
      setLoading(false);
    }
  };

  const getPostsForDay = (day: number): Post[] => {
    return posts.filter(post => {
      if (!post.scheduledAt) return false;
      const postDate = new Date(post.scheduledAt);
      return postDate.getDate() === day &&
             postDate.getMonth() === currentDate.getMonth() &&
             postDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();
  const isToday = (day: number) => {
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="تقويم المحتوى"
        subtitle="جدولة ومتابعة المنشورات"
        actions={
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 ${
                  viewMode === 'calendar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'
                }`}
              >
                <Calendar size={18} />
                تقويم
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 ${
                  viewMode === 'board' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'
                }`}
              >
                <LayoutGrid size={18} />
                لوحة
              </button>
            </div>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-bold border-0 outline-none"
            >
              <option value="">كل العملاء</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
            <button 
              onClick={() => navigate('/app/posts/new')}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-100"
            >
              <Plus size={20} />
              منشور جديد
            </button>
          </div>
        }
      />

      {/* Calendar View */}
      {viewMode === 'calendar' && (
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <button 
              onClick={prevMonth}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ChevronRight size={24} className="text-gray-600" />
            </button>
            <h2 className="text-xl font-black text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button 
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ChevronLeft size={24} className="text-gray-600" />
            </button>
          </div>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="text-blue-600 font-bold hover:underline"
          >
            اليوم
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {dayNames.map(day => (
            <div key={day} className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayPosts = day ? getPostsForDay(day) : [];
            return (
              <div 
                key={index}
                className={`min-h-[120px] p-3 border-b border-l border-gray-50 ${
                  day === null ? 'bg-gray-50/50' : 'hover:bg-blue-50/30 cursor-pointer'
                }`}
                onClick={() => day && navigate(`/app/posts/new?date=${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
              >
                {day !== null && (
                  <>
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      isToday(day) 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-700'
                    }`}>
                      {day}
                    </span>
                    {/* Posts for this day */}
                    <div className="mt-2 space-y-1">
                      {dayPosts.slice(0, 3).map(post => {
                        const statusConfig = POST_STATUS_CONFIG[post.status];
                        return (
                          <div 
                            key={post.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/app/posts/${post.id}`);
                            }}
                            className={`text-xs p-1.5 rounded-lg truncate font-bold ${statusConfig.color} hover:opacity-80`}
                          >
                            {post.title || post.client.name}
                          </div>
                        );
                      })}
                      {dayPosts.length > 3 && (
                        <div className="text-xs text-gray-400 font-bold">
                          +{dayPosts.length - 3} المزيد
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {BOARD_COLUMNS.map(column => {
              const columnPosts = posts.filter(p => p.status === column.status);
              const statusConfig = POST_STATUS_CONFIG[column.status];
              return (
                <div key={column.status} className="w-72 flex-shrink-0">
                  <div className={`rounded-t-2xl p-3 ${statusConfig.color}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{column.label}</span>
                      <span className="text-sm opacity-75">{columnPosts.length}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-b-2xl p-3 min-h-[400px] space-y-3">
                    {columnPosts.map(post => (
                      <div
                        key={post.id}
                        onClick={() => navigate(`/app/posts/${post.id}`)}
                        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <p className="font-bold text-gray-900 text-sm mb-2">
                          {post.title || 'بدون عنوان'}
                        </p>
                        <p className="text-xs text-gray-500 mb-2">{post.client.name}</p>
                        {post.scheduledAt && (
                          <p className="text-xs text-gray-400">
                            {new Date(post.scheduledAt).toLocaleDateString('ar-SA')}
                          </p>
                        )}
                        {post.platforms && post.platforms.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {post.platforms.slice(0, 3).map(p => (
                              <span key={p} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-bold">
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {columnPosts.length === 0 && (
                      <div className="text-center text-gray-400 text-sm py-8">
                        لا توجد منشورات
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {posts.length === 0 && viewMode === 'calendar' && (
        <div className="mt-8">
          <EmptyState 
            icon={Calendar}
            title="لا توجد منشورات مجدولة"
            description="ابدأ بإنشاء منشور جديد وجدولته للنشر"
            action={
              <button 
                onClick={() => navigate('/app/posts/new')}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                إنشاء منشور
              </button>
            }
          />
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
