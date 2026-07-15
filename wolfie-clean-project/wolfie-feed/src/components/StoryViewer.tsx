import { useEffect, useRef, useState } from 'react';
import { X, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { Story, MenuItem, CartItem } from '../types';

interface Props {
  story: Story;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onAddToCart: (item: MenuItem, restaurant: Story['restaurant']) => void;
}

export default function StoryViewer({ story, onClose, onNext, onPrev, onAddToCart }: Props) {
  const [segIndex, setSegIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seg = story.segments[segIndex];
  const TICK = 50; // ms

  const advance = () => {
    if (segIndex < story.segments.length - 1) {
      setSegIndex(i => i + 1);
      setProgress(0);
    } else {
      onNext?.() ?? onClose();
    }
  };

  useEffect(() => {
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    const duration = (seg?.duration ?? 5) * 1000;
    const step = (TICK / duration) * 100;
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { advance(); return 0; }
        return p + step;
      });
    }, TICK);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [segIndex]);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX;
    const w = window.innerWidth;
    if (x < w / 3) {
      if (segIndex > 0) { setSegIndex(i => i - 1); setProgress(0); }
      else onPrev?.();
    } else if (x > (w * 2) / 3) {
      advance();
    }
  };

  const handleAddToCart = () => {
    if (!seg?.ctaItem) return;
    onAddToCart(seg.ctaItem, story.restaurant);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (!seg) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col" onClick={handleTap}>
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-2 pt-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
        {story.segments.map((_, i) => (
          <div key={i} className="flex-1 h-[2px] bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{
                width: i < segIndex ? '100%' : i === segIndex ? `${progress}%` : '0%',
                transition: i === segIndex ? 'none' : undefined,
              }}
            />
          </div>
        ))}
      </div>

      {/* Story image */}
      <img
        src={seg.image}
        alt={seg.caption}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Gradients */}
      <div className="absolute top-0 left-0 right-0 h-40 story-top-gradient pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-56 story-bottom-gradient pointer-events-none" />

      {/* Header */}
      <div
        className="absolute left-0 right-0 flex items-center px-4 gap-3 pointer-events-none"
        style={{ top: 'calc(env(safe-area-inset-top) + 28px)' }}
      >
        <img src={story.restaurant.avatar} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white/60" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-none">{story.restaurant.name}</p>
          <p className="text-white/70 text-xs mt-0.5">{story.restaurant.handle}</p>
        </div>
        <button
          id="story-close-btn"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-8 h-8 flex items-center justify-center rounded-full glass-light pointer-events-auto"
        >
          <X size={16} className="text-white" />
        </button>
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 pointer-events-none" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        {seg.caption && (
          <p className="text-white font-semibold text-xl mb-1 leading-snug">{seg.caption}</p>
        )}
        {seg.ctaItem && (
          <div className="flex items-center justify-between mt-3">
            <span className="text-white/80 text-sm font-medium">
              ${seg.ctaItem.price.toFixed(2)}
            </span>
            <button
              id={`story-order-btn-${seg.id}`}
              onClick={(e) => { e.stopPropagation(); handleAddToCart(); }}
              className={`pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm text-white transition-all ${added ? 'btn-order-success' : 'btn-order'}`}
            >
              <ShoppingBag size={16} />
              {added ? 'Added!' : (seg.ctaText || 'Order Now')}
            </button>
          </div>
        )}
      </div>

      {/* Tap zone labels (invisible but present) */}
      <div className="absolute inset-0 flex pointer-events-none">
        <div className="w-1/3 h-full" />
        <div className="w-1/3 h-full" />
        <div className="w-1/3 h-full" />
      </div>
    </div>
  );
}
