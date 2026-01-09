
import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, ShieldCheck, Mail, MoreVertical, 
  Trash2, Shield, Activity, TrendingUp, Zap, X,
  Clock, MessageSquare, ChevronLeft,
  Search, Filter, Loader2
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Guard from '../components/Guard';
import { showToast } from '../components/NotificationToast';
import { getTeamMembers, createInvite, removeMember, TeamMember as ApiTeamMember } from '../lib/api';

const TeamPage: React.FC = () => {
  const [team, setTeam] = useState<ApiTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [newMember, setNewMember] = useState({ email: '', role: 'SALES' });
  const [isInviting, setIsInviting] = useState(false);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const members = await getTeamMembers();
      setTeam(members);
    } catch (err: any) {
      console.error('Failed to load team:', err);
      showToast('ERROR', 'خطأ', 'فشل تحميل بيانات الفريق');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.email) return;
    
    setIsInviting(true);
    try {
      await createInvite({ email: newMember.email, role: newMember.role });
      setNewMember({ email: '', role: 'SALES' });
      setShowInvite(false);
      showToast('SUCCESS', 'تم إرسال الدعوة', 'سيصل العضو الجديد رابط تفعيل الحساب.');
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل إرسال الدعوة');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العضو؟')) return;
    try {
      await removeMember(userId);
      setTeam(team.filter(m => m.userId !== userId));
      showToast('SUCCESS', 'تم الحذف', 'تم حذف العضو بنجاح');
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل حذف العضو');
    }
  };

  return (
    <Guard role="ADMIN">
      <div className="space-y-12 animate-in fade-in duration-500 pb-20">
        <PageHeader 
          title="إدارة فريق المبيعات" 
          subtitle="تحكم في الصلاحيات وراقب أداء المناديب في الوقت الفعلي لرفع كفاءة التحويل المبيعاتي"
          actions={
            <button 
              onClick={() => setShowInvite(true)}
              className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-3"
            >
              <UserPlus size={24} /> دعوة عضو جديد
            </button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'أعضاء الفريق', val: team.length, icon: Users, color: 'text-blue-600 bg-blue-50' },
            { label: 'إجمالي الصفقات', val: '154', icon: TrendingUp, color: 'text-green-600 bg-green-50' },
            { label: 'رسائل واتساب', val: '8,402', icon: MessageSquare, color: 'text-orange-600 bg-orange-50' },
            { label: 'معدل النشاط', val: '92%', icon: Zap, color: 'text-purple-600 bg-purple-50' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group cursor-default">
              <div className="flex items-center justify-between mb-4">
                 <div className={`p-4 rounded-2xl ${stat.color} group-hover:scale-110 transition-transform duration-500`}>
                   <stat.icon size={24} />
                 </div>
                 <div className="h-10 w-24 bg-gray-50 rounded-xl overflow-hidden flex items-end px-1 gap-0.5">
                    {[...Array(6)].map((_, j) => (
                      <div key={j} className="flex-1 bg-blue-100 rounded-t-sm group-hover:bg-blue-600 transition-colors" style={{ height: `${Math.random() * 80 + 20}%` }}></div>
                    ))}
                 </div>
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-gray-900 mt-1">{stat.val}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[550px]">
          <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-50/20">
            <div>
               <h3 className="font-black text-2xl text-gray-900">قائمة الأعضاء</h3>
               <p className="text-gray-400 font-bold text-sm mt-1">إدارة الأدوار الوظيفية وصلاحيات الوصول</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="relative group">
                 {/* Fixed: Added missing Search icon import */}
                 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600" size={18} />
                 <input type="text" placeholder="البحث عن موظف..." className="bg-white border border-gray-100 py-3 pr-11 pl-4 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all w-64 shadow-sm" />
               </div>
               {/* Fixed: Added missing Filter icon import */}
               <button className="p-3 bg-white border border-gray-100 rounded-xl text-gray-500 hover:text-blue-600 shadow-sm transition-all"><Filter size={20} /></button>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-600" size={32} />
              </div>
            ) : team.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-bold">لا يوجد أعضاء في الفريق</p>
                <p className="text-sm">قم بدعوة أعضاء جدد للانضمام</p>
              </div>
            ) : team.map((member) => (
              <div key={member.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50/50 transition-all group gap-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="h-16 w-16 bg-white border border-gray-100 text-blue-600 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-sm group-hover:scale-110 transition-transform duration-500 ring-4 ring-transparent group-hover:ring-blue-50">
                      {member.user?.name?.[0] || member.user?.email?.[0] || '?'}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white shadow-md ${member.user?.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{member.user?.name || member.user?.email || 'غير معروف'}</p>
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${member.role === 'ADMIN' || member.role === 'OWNER' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                        {member.role === 'OWNER' ? 'مالك' : member.role === 'ADMIN' ? 'مدير نظام' : member.role === 'MANAGER' ? 'مدير فريق' : 'مندوب مبيعات'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <span className="text-xs text-gray-400 font-bold flex items-center gap-1.5"><Mail size={12} className="text-blue-400" /> {member.user?.email || '-'}</span>
                      <span className="text-gray-200">•</span>
                      <span className="text-xs text-gray-400 font-bold flex items-center gap-1.5"><Clock size={12} className="text-blue-400" /> انضم: {new Date(member.createdAt).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                   <div className="hidden lg:flex flex-col text-left items-end">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">أداء المبيعات</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-black text-gray-800">12 صفقات</span>
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                           <div className="h-full bg-green-500 w-[65%]"></div>
                        </div>
                      </div>
                   </div>

                   <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                    <button className="p-3 bg-white text-gray-400 hover:text-blue-600 rounded-xl shadow-sm border border-gray-100 transition-all hover:border-blue-200" title="تعديل الصلاحيات"><Shield size={20} /></button>
                    <button className="p-3 bg-white text-gray-400 hover:text-orange-500 rounded-xl shadow-sm border border-gray-100 transition-all" title="سجل نشاط العضو"><Activity size={20} /></button>
                    {member.role !== 'OWNER' && (
                        <button 
                        onClick={() => handleRemoveMember(member.userId)}
                        className="p-3 bg-white text-red-400 hover:text-red-600 rounded-xl shadow-sm border border-gray-100 transition-all"
                        >
                        <Trash2 size={20} />
                        </button>
                    )}
                    <button className="p-3 bg-white text-gray-400 hover:text-gray-900 rounded-xl shadow-sm border border-gray-100 transition-all"><MoreVertical size={20} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invite Modal */}
        {showInvite && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-gray-100">
              <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm"><UserPlus size={24} /></div>
                  <h3 className="font-black text-2xl text-gray-900">دعوة للفريق</h3>
                </div>
                <button onClick={() => setShowInvite(false)} className="p-3 text-gray-400 hover:text-gray-600 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-gray-200"><X size={24} /></button>
              </div>
              <form onSubmit={handleInvite}>
                <div className="p-10 space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">البريد الإلكتروني المهني</label>
                    <div className="relative">
                       <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                       <input 
                        type="email" 
                        required
                        placeholder="name@leadz.sa" 
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-12 pl-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner" 
                        dir="ltr" 
                        value={newMember.email}
                        onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                        />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">الدور الوظيفي والصلاحيات</label>
                    <select 
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none"
                        value={newMember.role}
                        onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                    >
                      <option value="SALES">مندوب مبيعات (Sales Rep)</option>
                      <option value="MANAGER">مدير فريق (Team Lead)</option>
                      <option value="ADMIN">مسؤول نظام (Admin)</option>
                    </select>
                  </div>
                  
                  <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50 flex gap-4 items-center">
                     <ShieldCheck size={24} className="text-blue-500" />
                     <p className="text-xs text-blue-800 leading-relaxed font-bold">سيتم إرسال دعوة مشفرة صالحة لمدة 24 ساعة فقط لإتمام عملية الانضمام.</p>
                  </div>
                </div>
                <div className="p-10 bg-gray-50 flex gap-4">
                  <button type="button" onClick={() => setShowInvite(false)} className="flex-1 px-6 py-4 font-black text-gray-500 hover:bg-white rounded-2xl border border-transparent hover:border-gray-200 transition-all">إلغاء</button>
                  <button type="submit" disabled={isInviting} className="flex-[2] bg-blue-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                    {/* Fixed: Added missing Loader2 icon import */}
                    {isInviting ? <Loader2 size={20} className="animate-spin" /> : <>إرسال الدعوة <ChevronLeft size={20} className="rtl-flip" /></>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Guard>
  );
};

export default TeamPage;
