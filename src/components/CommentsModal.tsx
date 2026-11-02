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
import { handleImageError, FALLBACK_IMAGES } from '../utils/imageHelper';

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
      className="gc-comments-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="gc-comments-modal modal-daily-box w-full max-w-2xl bg-[#0e1217] border border-[#282d35] rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="gc-comments-header modal-daily-header p-4 sm:p-5 border-b border-[#282d35] flex items-center justify-between bg-[#13171f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ce3df3]/20 to-[#8b5cf6]/20 text-[#ce3df3] border border-[#ce3df3]/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                نظرات و دیدگاه‌ها
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#161b22] text-[#c9d1d9] font-semibold border border-[#282d35]">
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
            className="btn-daily-secondary btn-close-comments-modal p-2 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="gc-comments-list flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-[#161b22] border border-[#282d35] flex items-center justify-center mx-auto mb-3 text-slate-400">
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
                className="gc-comment-item p-4 rounded-2xl bg-[#13171f] border border-[#282d35] hover:border-[#3b4351] transition space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={comment.author.avatar}
                      alt={comment.author.name}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-[#282d35]"
                      onError={(e) => handleImageError(e, FALLBACK_IMAGES.avatar)}
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
                    className={`btn-like-comment px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                      comment.userLiked
                        ? 'bg-[#ce3df3]/20 text-[#ce3df3] border border-[#ce3df3]/40'
                        : 'btn-daily-secondary text-slate-400 hover:text-white'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${comment.userLiked ? 'fill-[#ce3df3] text-[#ce3df3]' : ''}`} />
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
        <div className="gc-quick-reactions px-4 py-2 border-t border-[#282d35] bg-[#13171f]/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] text-slate-400 shrink-0">واکنش سریع:</span>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleQuickEmoji(emoji)}
              className="btn-daily-secondary btn-quick-emoji text-xs px-2.5 py-1 rounded-lg shrink-0 transition active:scale-95 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <div className="gc-comments-footer modal-daily-footer p-4 bg-[#0e1217] border-t border-[#282d35]">
          {user ? (
            <form onSubmit={handleSubmit} className="form-submit-comment flex gap-2.5 items-end">
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-9 h-9 rounded-xl object-cover ring-2 ring-[#ce3df3]/40 shrink-0 mb-1"
                onError={(e) => handleImageError(e, FALLBACK_IMAGES.avatar)}
              />
              <div className="flex-1 relative">
                <textarea
                  id="commentTextarea"
                  name="commentText"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="دیدگاه خود را بنویسید..."
                  rows={2}
                  className="textarea-daily input-comment-textarea w-full p-3 rounded-2xl bg-[#0e1217] border border-[#282d35] text-slate-100 placeholder-[#6e7681] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#ce3df3]/25 focus:border-[#ce3df3] resize-none transition"
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
                className="btn-daily-primary btn-submit-comment p-3 rounded-2xl text-white font-medium shadow-lg shadow-[#ce3df3]/20 disabled:opacity-50 disabled:pointer-events-none transition active:scale-95 cursor-pointer shrink-0"
                title="ارسال نظر"
              >
                <Send className="w-4 h-4 ml-0.5 transform -rotate-90" />
              </button>
            </form>
          ) : (
            <div className="gc-login-prompt p-3.5 rounded-2xl bg-[#13171f] border border-[#282d35] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
              <div className="flex items-center gap-2">
                <LogIn className="w-5 h-5 text-[#ce3df3] shrink-0" />
                <span className="text-xs text-slate-300">
                  برای ثبت نظر، ابتدا باید با حساب گوگل خود وارد شوید.
                </span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onStartGoogleLogin();
                }}
                className="btn-comments-google-login px-4 py-2 rounded-xl bg-white text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-slate-100 transition cursor-pointer shrink-0"
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
