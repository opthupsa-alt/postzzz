
import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, CheckCircle2, Copy, Info, Sparkles, Wand2, Edit3, Phone } from 'lucide-react';
import { useStore } from '../store/useStore';
import { JobStatus } from '../types';
import { useParams } from 'react-router-dom';
import { sendWhatsAppWebMessage } from '../lib/api';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadName: string;
  phone?: string;
}

const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose, leadName, phone: initialPhone }) => {
  const { id: leadId } = useParams();
  const { addJob, updateJob, addActivity, templates, reports, connectedPhone } = useStore();
  const [message, setMessage] = useState('');
  const [recipientPhone, setRecipientPhone] = useState(initialPhone || '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isAiFilling, setIsAiFilling] = useState(false);

  // تحديث رقم المرسل إليه والرسالة عند تغيير الـ props
  useEffect(() => {
    if (initialPhone) {
      setRecipientPhone(initialPhone);
    }
    // تحديث الرسالة الافتراضية مع اسم العميل
    if (leadName) {
      setMessage(`مرحباً فريق،\n${leadName}\n\nنحن مهتمون بالتعاون معكم في مجال الحلول التقنية. هل لديكم وقت لمكالمة سريعة؟`);
    }
  }, [initialPhone, leadName]);

  if (!isOpen) return null;

  const leadReport = leadId ? reports[leadId] : null;

  const handleAiFill = () => {
    setIsAiFilling(true);
    // Simulated AI drafting based on the report summary
    setTimeout(() => {
      const summarySnippet = leadReport?.summary || "نشاطكم المتزايد في السوق";
      const draftedMessage = `مرحباً فريق ${leadName}،\n\nلقد قمنا بتحليل ${summarySnippet} ونعتقد أن لدينا حلولاً تقنية ستساهم في رفع كفاءتكم التشغيلية.\n\nهل يمكننا التنسيق لعرض تجريبي سريع؟`;
      setMessage(draftedMessage);
      setIsAiFilling(false);
    }, 1000);
  };

  const handleSend = async () => {
    if (!recipientPhone) {
      alert('يرجى إدخال رقم المرسل إليه');
      return;
    }
    
    if (!connectedPhone) {
      alert('يرجى ربط رقم واتساب أولاً من صفحة إدارة الواتساب');
      return;
    }

    setSending(true);
    const jobId = Math.random().toString(36).substr(2, 9);
    
    addJob({
      id: jobId,
      type: 'WHATSAPP',
      status: JobStatus.RUNNING,
      progress: 0,
      message: 'جاري تشفير الرسالة والاتصال بخدمة واتساب...',
      createdAt: new Date().toISOString()
    });

    try {
      // إرسال الرسالة عبر API
      const result = await sendWhatsAppWebMessage(recipientPhone, message);
      
      if (result.success) {
        updateJob(jobId, { progress: 100, status: JobStatus.SUCCESS, message: 'تم إرسال الرسالة بنجاح' });
        
        if (leadId) {
          addActivity(leadId, {
            id: Math.random().toString(36).substr(2, 9),
            leadId,
            type: 'WHATSAPP',
            description: `تم إرسال رسالة واتساب إلى ${recipientPhone}: "${message.slice(0, 30)}..."`,
            timestamp: new Date().toISOString(),
            user: 'أحمد (مبيعات)'
          });
        }

        setSending(false);
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 1500);
      } else {
        throw new Error(result.error || 'فشل إرسال الرسالة');
      }
    } catch (error: any) {
      updateJob(jobId, { progress: 100, status: JobStatus.FAILED, message: error.message || 'فشل إرسال الرسالة' });
      setSending(false);
      alert(error.message || 'فشل إرسال الرسالة');
    }
  };

  const applyTemplate = (content: string) => {
    setMessage(content.replace('${name}', leadName));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-gray-100">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-l from-green-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-xl">تواصل عبر واتساب</h3>
              <p className="text-xs text-green-600 font-medium uppercase tracking-wider">مباشر • آمن • موثق</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"><X /></button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
               {/* رقم المرسل (من إدارة الواتساب) */}
               <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">المرسل من</label>
                <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-xl">
                      <Phone size={16} className="text-green-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-green-600 font-bold">الرقم المربوط</span>
                      <span className="font-bold text-gray-900 font-mono text-sm">{connectedPhone || 'غير مربوط'}</span>
                    </div>
                  </div>
                  <CheckCircle2 size={18} className="text-green-500" />
                </div>
              </div>

               {/* رقم المرسل إليه (قابل للتعديل) */}
               <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">المرسل إليه</label>
                {isEditingPhone ? (
                  <div className="bg-white p-4 rounded-2xl border-2 border-blue-400 flex items-center gap-3">
                    <input
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="flex-1 bg-transparent outline-none font-mono text-gray-900 text-sm"
                      placeholder="05XXXXXXXX"
                      autoFocus
                      dir="ltr"
                    />
                    <button
                      onClick={() => setIsEditingPhone(false)}
                      className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-blue-200 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{leadName}</span>
                      <span className="text-xs text-gray-500 font-mono">{recipientPhone || '05XXXXXXXX'}</span>
                    </div>
                    <button
                      onClick={() => setIsEditingPhone(true)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      title="تعديل الرقم"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">اختر قالباً سريعاً</label>
                    {leadReport && (
                        <button 
                            onClick={handleAiFill}
                            disabled={isAiFilling}
                            className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all disabled:opacity-50"
                        >
                            {isAiFilling ? <Wand2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                            كتابة ذكية بـ AI
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {templates.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => applyTemplate(t.content)}
                      className="px-3 py-2 bg-white text-gray-600 text-xs font-bold rounded-xl border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-all flex items-center gap-1.5"
                    >
                      <Copy size={12} /> {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">نص الرسالة</label>
              <textarea 
                rows={8}
                className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-green-500/10 focus:border-green-500 focus:bg-white outline-none transition-all text-sm leading-relaxed text-gray-700 shadow-inner"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
              />
            </div>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 flex gap-4 items-center">
             <div className="text-blue-500 bg-white p-2 rounded-xl shadow-sm"><Info size={20} /></div>
             <p className="text-xs text-blue-800 leading-relaxed font-medium">سيتم تسجيل هذه المحادثة تلقائياً في "سجل النشاط" الخاص بالعميل لمتابعة حالة المبيعات لاحقاً.</p>
          </div>
        </div>

        <div className="p-8 bg-gray-50 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 text-center md:text-right">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">المزود النشط</p>
            <p className="text-xs font-bold text-gray-600 flex items-center justify-center md:justify-start gap-1">
              WhatsApp Business API <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={onClose}
              className="flex-1 px-8 py-3.5 rounded-2xl font-bold text-gray-500 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-200"
            >
              إلغاء
            </button>
            <button 
              disabled={sending || success}
              onClick={handleSend}
              className={`flex-[2] md:min-w-[200px] bg-green-600 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${sending || success ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700 shadow-xl shadow-green-100 active:scale-95'}`}
            >
              {success ? (
                <><CheckCircle2 size={20} className="animate-in zoom-in" /> تم الإرسال</>
              ) : sending ? (
                <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> جاري الإرسال...</span>
              ) : (
                <><Send size={20} /> إرسال الرسالة</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppModal;
