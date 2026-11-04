import React, { useState } from 'react';
import { 
  X, 
  MessageSquarePlus, 
  Send, 
  Sparkles, 
  AlertCircle, 
  Lightbulb, 
  Bug, 
  HelpCircle,
  CheckCircle2,
  User,
  Mail
} from 'lucide-react';
import { FeedbackItem, UserProfile } from '../../types/content';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSubmitFeedback: (feedback: Omit<FeedbackItem, 'id' | 'createdAt' | 'status'>) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  user,
  onSubmitFeedback
}) => {
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [type, setType] = useState<FeedbackItem['type']>('suggestion');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    onSubmitFeedback({
      senderName: name.trim() || (user ? user.displayName : 'کاربر مهمان'),
      senderEmail: email.trim() || undefined,
      isGuest: !user,
      type,
      title: title.trim(),
      message: message.trim()
    });

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setTitle('');
      setMessage('');
      onClose();
    }, 1800);
  };

  const typesList: { id: FeedbackItem['type']; label: string; icon: any; color: string }[] = [
    { id: 'suggestion', label: 'پیشنهاد قابلیت', icon: Lightbulb, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { id: 'critique', label: 'انتقاد و بازخورد', icon: AlertCircle, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
    { id: 'bug', label: 'گزارش مشکل / باگ', icon: Bug, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    { id: 'other', label: 'سایر موارد', icon: HelpCircle, color: 'text-slate-400 bg-slate-800 border-slate-700' }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 text-white flex items-center justify-center shadow-md">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                انتقادات و پیشنهادات
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {user ? 'کاربر عضو' : 'کاربر مهمان'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                دیدگاه، ایده یا انتقاد شما مستقیماً به دست مدیریت سایت می‌رسد.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {isSubmitted ? (
          <div className="p-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">با تشکر از پیام ارزشمند شما!</h4>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
              پیام شما با موفقیت در سیستم ثبت گردید و توسط تیم مدیریت گیک کلاب بررسی خواهد شد.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
            {/* Sender identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  نام شما {user ? '(وارد شده)' : '(مهمان)'}
                </label>
                <input
                  type="text"
                  id="feedbackNameInput"
                  name="feedbackName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: علی رضایی یا کاربر مهمان"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  ایمیل یا راه ارتباطی (اختیاری)
                </label>
                <input
                  type="text"
                  id="feedbackEmailInput"
                  name="feedbackEmail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="جهت دریافت پاسخ مدیریت"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono dir-ltr text-left"
                />
              </div>
            </div>

            {/* Type selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                موضوع بازخورد:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {typesList.map((t) => {
                  const Icon = t.icon;
                  const isSelected = type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={`p-2.5 rounded-2xl border text-xs font-medium flex flex-col items-center gap-1.5 transition cursor-pointer ${
                        isSelected 
                          ? `${t.color} font-bold ring-2 ring-indigo-500/40 shadow-sm` 
                          : 'bg-slate-800/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                عنوان پیام *
              </label>
              <input
                type="text"
                id="feedbackTitleInput"
                name="feedbackTitle"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="خلاصه موضوع پیشنهاد یا انتقاد شما..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                شرح کامل پیشنهاد یا انتقاد *
              </label>
              <textarea
                id="feedbackMessageTextarea"
                name="feedbackMessage"
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="توضیحات خود را بنویسید..."
                className="w-full p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none leading-relaxed"
              />
            </div>

            {/* Submit Buttons */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={!title.trim() || !message.trim()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4 ml-0.5" />
                ارسال به مدیریت
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
