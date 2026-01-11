import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, ChevronRight, ChevronLeft, Filter, AlertCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { getPosts, Post, POST_STATUS_CONFIG } from '../lib/posts-api';
import { getClients, Client } from '../lib/clients-api';

const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<Post[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

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

      {/* Calendar Header */}
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

      {posts.length === 0 && (
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
