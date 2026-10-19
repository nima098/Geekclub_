import React, { useState } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  ThumbsUp, 
  Sparkles, 
  CornerDownLeft, 
  User as UserIcon,
  LogIn
} from 'lucide-react';
import { ContentItem, CommentItem, UserProfile } from '../types/content';

interface CommentsModalProps {
  item: ContentItem | null;
  comments: CommentItem[];
  user: UserProfile | null;
  onClose: () => void;
  onAddComment: (contentId: string, text: string) => void;
  onLikeComment: (commentId: string) => void;
  onStartGoogleLogin: () => void;
}

const QUICK_EMOJIS = ['🔥 عالی بود', '👏 خسته نباشید', '💡 نکته بسیار مفیدی بود', '❤️ فوق‌العاده', '🚀 به اشتراک گذاشتم', '👍'];

export const CommentsModal: React.FC<CommentsModalProps> = ({
  item,
  comments,
  user,
  onClose,
  onAddComment,
  onLikeComment,
  onStartGoogleLogin
}) => {
  const [commentText, setCommentText] = useState('');

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(item.id, commentText.trim());
    setCommentText('');
  };

  const handleQuickEmoji = (emoji: string) => {
    setCommentText((prev) => (prev ? `${prev} ${emoji}` : emoji));
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                نظرات و دیدگاه‌ها
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                  {comments.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400 line-clamp-1 max-w-md">
                {item.title}
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

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200 mb-1">
                هنوز دیدگاهی ثبت نشده است
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                اولین نفری باشید که نظر یا بازخورد خود را درباره این محتوا بیان می‌کند!
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div 
                key={comment.id}
                className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 hover:border-slate-700/70 transition space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={comment.author.avatar}
                      alt={comment.author.name}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-200">
                        {comment.author.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {comment.createdAt}
                      </span>
                    </div>
                  </div>

                  {/* Comment Like button */}
                  <button
                    onClick={() => onLikeComment(comment.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                      comment.userLiked
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${comment.userLiked ? 'fill-indigo-400 text-indigo-400' : ''}`} />
                    <span>{comment.likes}</span>
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-loose sm:leading-[1.85] pr-10 whitespace-pre-line">
                  {comment.text}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Quick Reactions Bar */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/40 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] text-slate-400 shrink-0">واکنش سریع:</span>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleQuickEmoji(emoji)}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/60 shrink-0 transition active:scale-95 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          {user ? (
            <form onSubmit={handleSubmit} className="flex gap-2.5 items-end">
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-9 h-9 rounded-xl object-cover ring-2 ring-indigo-500/40 shrink-0 mb-1"
              />
              <div className="flex-1 relative">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="دیدگاه خود را بنویسید..."
                  rows={2}
                  className="w-full p-3 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white font-medium shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer shrink-0"
                title="ارسال نظر"
              >
                <Send className="w-4 h-4 ml-0.5 transform -rotate-90" />
              </button>
            </form>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
              <div className="flex items-center gap-2">
                <LogIn className="w-5 h-5 text-indigo-400 shrink-0" />
                <span className="text-xs text-slate-300">
                  برای ثبت نظر، ابتدا باید با حساب گوگل خود وارد شوید.
                </span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onStartGoogleLogin();
                }}
                className="px-4 py-2 rounded-xl bg-white text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                ورود با گوگل
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
