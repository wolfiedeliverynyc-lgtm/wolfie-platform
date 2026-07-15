import { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ShoppingBag, MapPin, CheckCircle } from 'lucide-react';
import { FeedPost, CartItem, MenuItem } from '../types';
import { recordDwell } from '../algorithm';

interface Props {
  post: FeedPost;
  isFollowing: boolean;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onFollow: (restaurantId: string) => void;
  onCommentOpen: (post: FeedPost) => void;
  onAddToCart: (item: MenuItem, restaurant: FeedPost['restaurant']) => void;
  onDwell?: (post: FeedPost, seconds: number) => void;
}

export default function PostCard({
  post, isFollowing, onLike, onSave, onFollow, onCommentOpen, onAddToCart, onDwell
}: Props) {
  const [showHeart, setShowHeart] = useState(false);
  const [heartPos, setHeartPos] = useState({ x: 0, y: 0 });
  const [addedToCart, setAddedToCart] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lastTap = useRef(0);
  const dwellStart = useRef<number>(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Dwell time tracking
  useEffect(() => {
    if (!cardRef.current || !onDwell) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          dwellStart.current = Date.now();
        } else if (dwellStart.current > 0) {
          const secs = (Date.now() - dwellStart.current) / 1000;
          onDwell(post, secs);
          dwellStart.current = 0;
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const handleDoubleTap = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap!
      const touch = e.touches[0] || e.changedTouches[0];
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setHeartPos({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 900);
      if (!post.isLiked) onLike(post.id);
    }
    lastTap.current = now;
  };

  const handleAddToCart = () => {
    if (!post.linkedDish) return;
    onAddToCart(post.linkedDish, post.restaurant);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const caption = post.caption;
  const shortCaption = caption.length > 120 ? caption.slice(0, 120) + '…' : caption;
  const firstTwoComments = post.comments.slice(0, 2);

  return (
    <article ref={cardRef} id={`post-${post.id}`} className="border-b border-white/6">
      {/* ── Post Header ─────────────────────────────────────── */}
      <div className="flex items-center px-3.5 py-3 gap-3">
        <img
          src={post.restaurant.avatar}
          alt={post.restaurant.name}
          className="w-9 h-9 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-white font-semibold text-sm leading-none">{post.restaurant.name}</span>
            {post.restaurant.isVerified && (
              <span className="verified-badge text-white">✓</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-white/40 text-[11px]">{post.postedAt}</span>
            {post.location && (
              <>
                <span className="text-white/20 text-[11px]">·</span>
                <span className="text-white/40 text-[11px] flex items-center gap-0.5">
                  <MapPin size={9} />
                  {post.location}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isFollowing && (
            <button
              id={`follow-${post.restaurant.id}`}
              onClick={() => onFollow(post.restaurant.id)}
              className="btn-follow text-white/80 text-xs font-semibold px-3 py-1 rounded-full"
            >
              Follow
            </button>
          )}
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/8 transition-colors" aria-label="More options">
            <MoreHorizontal size={18} className="text-white/60" />
          </button>
        </div>
      </div>

      {/* ── Post Image ──────────────────────────────────────── */}
      <div
        className="relative w-full bg-white/5 overflow-hidden"
        style={{ aspectRatio: '4/5' }}
        onTouchEnd={handleDoubleTap}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 bg-white/5 animate-pulse" />
        )}
        <img
          src={post.image}
          alt={post.caption}
          className={`w-full h-full object-cover post-image transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
          draggable={false}
        />

        {/* Double-tap heart overlay */}
        {showHeart && (
          <div
            className="absolute pointer-events-none heart-overlay"
            style={{ left: heartPos.x - 40, top: heartPos.y - 40 }}
          >
            <Heart size={80} className="text-white fill-white drop-shadow-2xl" />
          </div>
        )}

        {/* Post type badge */}
        {(post.type === 'promo') && (
          <div className="absolute top-3 left-3 gradient-brand text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            🎉 DEAL
          </div>
        )}
        {(post.type === 'new_item') && (
          <div className="absolute top-3 left-3 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            ✨ NEW
          </div>
        )}
      </div>

      {/* ── Social Actions ──────────────────────────────────── */}
      <div className="flex items-center px-3.5 pt-3 pb-1">
        {/* Like */}
        <button
          id={`like-${post.id}`}
          onClick={() => onLike(post.id)}
          className="flex items-center gap-1.5 mr-4 active:scale-90 transition-transform"
          aria-label={post.isLiked ? 'Unlike' : 'Like'}
        >
          <Heart
            size={26}
            className={`transition-colors duration-200 ${post.isLiked ? 'fill-red-500 text-red-500 heart-pop' : 'text-white'}`}
          />
          <span className="text-white/80 text-sm font-medium">
            {(post.likes + (post.isLiked ? 0 : 0)).toLocaleString()}
          </span>
        </button>

        {/* Comment */}
        <button
          id={`comment-${post.id}`}
          onClick={() => onCommentOpen(post)}
          className="flex items-center gap-1.5 mr-4 active:scale-90 transition-transform"
          aria-label="Comments"
        >
          <MessageCircle size={26} className="text-white" />
          <span className="text-white/80 text-sm font-medium">{post.comments.length.toLocaleString()}</span>
        </button>

        {/* Share */}
        <button
          id={`share-${post.id}`}
          className="flex items-center gap-1.5 mr-auto active:scale-90 transition-transform"
          aria-label="Share"
        >
          <Send size={24} className="text-white" />
        </button>

        {/* Save */}
        <button
          id={`save-${post.id}`}
          onClick={() => onSave(post.id)}
          className="active:scale-90 transition-transform"
          aria-label={post.isSaved ? 'Unsave' : 'Save'}
        >
          <Bookmark
            size={26}
            className={`transition-colors duration-200 ${post.isSaved ? 'fill-white text-white bookmark-pop' : 'text-white'}`}
          />
        </button>
      </div>

      {/* ── Caption ─────────────────────────────────────────── */}
      <div className="px-3.5 pb-2">
        <p className="text-white text-sm leading-relaxed">
          <span className="font-semibold mr-1.5">{post.restaurant.handle}</span>
          {expanded ? caption : shortCaption}
          {caption.length > 120 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-white/50 ml-1 text-sm hover:text-white/80 transition-colors"
            >
              more
            </button>
          )}
        </p>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {post.tags.slice(0, 4).map(tag => (
              <span key={tag} className="text-blue-400 text-xs">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── Comments preview ─────────────────────────────────── */}
      {firstTwoComments.length > 0 && (
        <div className="px-3.5 pb-2 space-y-1">
          {firstTwoComments.map(c => (
            <p key={c.id} className="text-white/80 text-sm leading-snug">
              <span className="font-semibold text-white">{c.username}</span>
              <span className="ml-1.5">{c.text}</span>
            </p>
          ))}
          {post.comments.length > 2 && (
            <button
              onClick={() => onCommentOpen(post)}
              className="text-white/40 text-sm hover:text-white/60 transition-colors"
            >
              View all {post.comments.length} comments
            </button>
          )}
        </div>
      )}

      {/* ── Order Bar (only if linked to a dish) ─────────────── */}
      {post.linkedDish && (
        <div className="mx-3.5 mb-4 mt-1 glass-light rounded-2xl p-3 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{post.linkedDish.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[#FF6B00] font-bold text-base">${post.linkedDish.price.toFixed(2)}</span>
              {post.delivery?.available ? (
                <span className="flex items-center gap-1 text-green-400 text-[11px] font-medium">
                  <CheckCircle size={10} />
                  {post.delivery.provider} · {post.delivery.estimatedMinutes}min
                </span>
              ) : (
                <span className="text-white/35 text-[11px]">Pick-up only</span>
              )}
            </div>
          </div>
          <button
            id={`add-to-cart-${post.id}`}
            onClick={handleAddToCart}
            disabled={!post.delivery?.available}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm text-white flex-shrink-0 transition-all ${
              addedToCart ? 'btn-order-success' : post.delivery?.available ? 'btn-order' : 'bg-white/10 cursor-not-allowed'
            }`}
          >
            {addedToCart ? (
              <><CheckCircle size={15} /> Added!</>
            ) : (
              <><ShoppingBag size={15} /> Add to Cart</>
            )}
          </button>
        </div>
      )}
    </article>
  );
}
