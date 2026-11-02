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
import { FeedbackItem, UserProfile } from '../types/content';

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
      className="gc-feedback-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="gc-feedback-modal modal-daily-box w-full max-w-lg bg-[#0e1217] border border-[#22272f] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="gc-feedback-header modal-daily-header p-5 border-b border-[#22272f] flex items-center justify-between bg-[#13171f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#CE3DF3] to-[#8B5CF6] text-white flex items-center justify-center shadow-lg shadow-[#CE3DF3]/25">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                انتقادات و پیشنهادات
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#CE3DF3]/15 text-[#CE3DF3] border border-[#CE3DF3]/30">
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
            className="btn-daily-secondary btn-close-feedback-modal p-2 rounded-xl bg-[#161b22] hover:bg-[#21262d] text-slate-400 hover:text-white border border-[#282d35] transition cursor-pointer"
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
          <form onSubmit={handleSubmit} className="form-feedback p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
            {/* Sender identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label-daily block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#CE3DF3]" />
                  نام شما {user ? '(وارد شده)' : '(مهمان)'}
                </label>
                <input
                  type="text"
                  id="feedbackNameInput"
                  name="feedbackName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: علی رضایی یا کاربر مهمان"
                  className="input-daily input-feedback-name w-full px-3.5 py-2.5 rounded-2xl bg-[#0e1217] border border-[#282d35] text-slate-100 placeholder-[#6e7681] text-xs sm:text-sm focus:outline-none focus:border-[#CE3DF3] focus:ring-2 focus:ring-[#CE3DF3]/25 transition"
                />
              </div>

              <div>
                <label className="label-daily block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#CE3DF3]" />
                  ایمیل یا راه ارتباطی (اختیاری)
                </label>
                <input
                  type="text"
                  id="feedbackEmailInput"
                  name="feedbackEmail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="جهت دریافت پاسخ مدیریت"
                  className="input-daily input-feedback-email w-full px-3.5 py-2.5 rounded-2xl bg-[#0e1217] border border-[#282d35] text-slate-100 placeholder-[#6e7681] text-xs sm:text-sm focus:outline-none focus:border-[#CE3DF3] focus:ring-2 focus:ring-[#CE3DF3]/25 font-mono dir-ltr text-left transition"
                />
              </div>
            </div>

            {/* Type selector */}
            <div>
              <label className="label-daily block text-xs font-semibold text-slate-300 mb-2">
                موضوع بازخورد:
              </label>
              <div className="gc-feedback-types-grid grid grid-cols-2 sm:grid-cols-4 gap-2">
                {typesList.map((t) => {
                  const Icon = t.icon;
                  const isSelected = type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={`btn-feedback-type btn-feedback-type-${t.id} p-2.5 rounded-2xl border text-xs font-medium flex flex-col items-center gap-1.5 transition cursor-pointer ${
                        isSelected 
                          ? 'border-[#CE3DF3] bg-[#CE3DF3]/15 text-[#CE3DF3] font-bold shadow-sm shadow-[#CE3DF3]/20 ring-1 ring-[#CE3DF3]/40' 
                          : 'bg-[#13171f] border-[#282d35] text-slate-400 hover:text-slate-200 hover:bg-[#1a202c]'
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
              <label className="label-daily block text-xs font-semibold text-slate-300 mb-1.5">
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
                className="input-daily input-feedback-title w-full px-3.5 py-2.5 rounded-2xl bg-[#0e1217] border border-[#282d35] text-slate-100 placeholder-[#6e7681] text-xs sm:text-sm focus:outline-none focus:border-[#CE3DF3] focus:ring-2 focus:ring-[#CE3DF3]/25 transition"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="label-daily block text-xs font-semibold text-slate-300 mb-1.5">
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
                className="textarea-daily input-feedback-message w-full p-3.5 rounded-2xl bg-[#0e1217] border border-[#282d35] text-slate-100 placeholder-[#6e7681] text-xs sm:text-sm focus:outline-none focus:border-[#CE3DF3] focus:ring-2 focus:ring-[#CE3DF3]/25 resize-none leading-relaxed transition"
              />
            </div>

            {/* Submit Buttons */}
            <div className="modal-daily-footer gc-feedback-footer pt-3 border-t border-[#22272f] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="btn-daily-secondary btn-feedback-cancel px-4 py-2.5 rounded-xl bg-[#161b22] hover:bg-[#21262d] text-slate-300 text-xs font-semibold border border-[#282d35] transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={!title.trim() || !message.trim()}
                className="btn-daily-primary btn-feedback-submit btn-submit-feedback px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#CE3DF3] to-[#8B5CF6] hover:from-[#d84df7] hover:to-[#9d71f8] disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-[#CE3DF3]/25 transition active:scale-95 cursor-pointer"
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
