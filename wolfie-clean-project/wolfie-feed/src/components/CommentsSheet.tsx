import { useState, useRef, useEffect } from 'react';
import { X, Heart, Send } from 'lucide-react';
import { FeedPost, Comment } from '../types';

interface Props {
  post: FeedPost;
  onClose: () => void;
}

export default function CommentsSheet({ post, onClose }: Props) {
  const [comments, setComments] = useState<Comment[]>(post.comments);
  const [text, setText] = useState('');
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const newComment: Comment = {
      id: `c_${Date.now()}`,
      userId: 'user_me',
      username: 'you',
      avatar: 'https://i.pravatar.cc/40?img=15',
      text: text.trim(),
      timestamp: 'now',
      likes: 0,
      isLiked: false,
    };
    setComments(prev => [...prev, newComment]);
    setText('');
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const toggleLike = (commentId: string) => {
    setLikedComments(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[80] glass rounded-t-3xl max-w-lg mx-auto flex flex-col" style={{ height: '75vh', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Handle */}
        <div className="drag-handle mt-3" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-white/8">
          <h3 className="text-white font-bold text-base">Comments</h3>
          <button
            id="comments-close-btn"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full glass-light"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Comments list */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4 no-scrollbar">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <img
                src={comment.avatar}
                alt={comment.username}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm leading-relaxed">
                      <span className="font-semibold mr-1.5">{comment.username}</span>
                      {comment.text}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-white/35 text-xs">{comment.timestamp}</span>
                      {(comment.likes + (likedComments[comment.id] ? 1 : 0)) > 0 && (
                        <span className="text-white/35 text-xs">
                          {(comment.likes + (likedComments[comment.id] ? 1 : 0)).toLocaleString()} likes
                        </span>
                      )}
                      <button className="text-white/35 text-xs hover:text-white/60 transition-colors">Reply</button>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleLike(comment.id)}
                    className="flex-shrink-0 active:scale-90 transition-transform pt-1"
                  >
                    <Heart
                      size={14}
                      className={likedComments[comment.id] ? 'fill-red-500 text-red-500' : 'text-white/40'}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3 border-t border-white/8">
          <img
            src="https://i.pravatar.cc/40?img=15"
            alt="You"
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
          <input
            ref={inputRef}
            id="comment-input"
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 bg-white/8 text-white text-sm rounded-full px-4 py-2 outline-none border border-white/10 focus:border-[#FF6B00]/60 transition-colors placeholder:text-white/35"
          />
          <button
            type="submit"
            id="comment-submit-btn"
            disabled={!text.trim()}
            className={`flex-shrink-0 active:scale-90 transition-all ${text.trim() ? 'text-[#FF6B00]' : 'text-white/25'}`}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </>
  );
}
