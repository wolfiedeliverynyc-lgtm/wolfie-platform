import { useState } from 'react';
import { Search, X, CheckCircle, Clock, Star, MapPin } from 'lucide-react';
import { FeedPost, Restaurant, MenuItem } from '../types';
import { RESTAURANTS } from '../data';

type Tab = 'content' | 'dishes' | 'restaurants';

interface Props {
  posts: FeedPost[];
  onPostSelect?: (post: FeedPost) => void;
  onAddToCart: (item: MenuItem, restaurant: Restaurant) => void;
  onClose: () => void;
}

export default function SearchView({ posts, onAddToCart, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('content');

  const q = query.toLowerCase().trim();

  const contentResults = q
    ? posts.filter(p =>
        p.caption.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q)) ||
        p.restaurant.name.toLowerCase().includes(q) ||
        (p.linkedDish?.name || '').toLowerCase().includes(q)
      )
    : posts.slice(0, 6);

  const dishResults = q
    ? RESTAURANTS.flatMap(r =>
        r.menu
          .filter(m => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.description.toLowerCase().includes(q))
          .map(m => ({ dish: m, restaurant: r }))
      )
    : RESTAURANTS.flatMap(r => r.menu.filter(m => m.isPopular).map(m => ({ dish: m, restaurant: r }))).slice(0, 8);

  const restaurantResults = q
    ? RESTAURANTS.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.handle.toLowerCase().includes(q) ||
        r.bio.toLowerCase().includes(q)
      )
    : RESTAURANTS;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'content', label: 'Posts' },
    { id: 'dishes', label: 'Dishes' },
    { id: 'restaurants', label: 'Restaurants' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="px-4 pt-2 pb-3 border-b border-white/8">
        <div className="flex items-center gap-3 glass-light rounded-2xl px-4 py-2.5">
          <Search size={18} className="text-white/40 flex-shrink-0" />
          <input
            id="search-input"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search food, restaurants, posts…"
            autoFocus
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/35"
          />
          {query && (
            <button onClick={() => setQuery('')} className="active:scale-90 transition-transform">
              <X size={16} className="text-white/50" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {TABS.map(t => (
            <button
              key={t.id}
              id={`search-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t.id ? 'gradient-brand text-white' : 'glass-light text-white/50 hover:text-white/80'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3">
        {/* ── Posts tab ─────────────────────────────────────── */}
        {tab === 'content' && (
          <div className="space-y-3">
            {!q && <p className="text-white/40 text-xs font-medium mb-2 uppercase tracking-wider">Recent Posts</p>}
            {contentResults.length === 0 && q && (
              <div className="text-center py-12 text-white/40">No posts found for "{query}"</div>
            )}
            {contentResults.map(post => (
              <div key={post.id} className="flex gap-3 glass-light rounded-2xl p-3">
                <img src={post.image} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <img src={post.restaurant.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                    <span className="text-white/60 text-xs font-medium">{post.restaurant.handle}</span>
                  </div>
                  <p className="text-white text-sm font-medium leading-snug line-clamp-2">{post.caption.slice(0, 80)}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-white/40 text-xs">
                    <span>❤️ {post.likes.toLocaleString()}</span>
                    <span>💬 {post.comments.length}</span>
                    {post.delivery?.available && (
                      <span className="text-green-400 flex items-center gap-0.5">
                        <CheckCircle size={10} /> Delivery
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Dishes tab ────────────────────────────────────── */}
        {tab === 'dishes' && (
          <div className="space-y-3">
            {!q && <p className="text-white/40 text-xs font-medium mb-2 uppercase tracking-wider">Popular Dishes</p>}
            {dishResults.length === 0 && q && (
              <div className="text-center py-12 text-white/40">No dishes found for "{query}"</div>
            )}
            {dishResults.map(({ dish, restaurant }) => (
              <div key={`${restaurant.id}_${dish.id}`} className="flex gap-3 glass-light rounded-2xl p-3">
                <img src={dish.image} alt={dish.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{dish.name}</p>
                  <p className="text-white/50 text-xs mt-0.5 line-clamp-1">{restaurant.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <span className="text-[#FF6B00] font-bold text-base">${dish.price.toFixed(2)}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {restaurant.isOpen ? (
                          <span className="text-green-400 text-[11px] flex items-center gap-1">
                            <CheckCircle size={9} /> {restaurant.deliveryTimeMin}min · ${restaurant.deliveryFee === 0 ? 'Free' : restaurant.deliveryFee.toFixed(2)} delivery
                          </span>
                        ) : (
                          <span className="text-white/30 text-[11px]">Pick-up only</span>
                        )}
                      </div>
                    </div>
                    <button
                      id={`search-add-${dish.id}`}
                      onClick={() => onAddToCart(dish, restaurant)}
                      disabled={!restaurant.isOpen}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all ${restaurant.isOpen ? 'btn-order' : 'bg-white/10 cursor-not-allowed'}`}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Restaurants tab ───────────────────────────────── */}
        {tab === 'restaurants' && (
          <div className="space-y-3">
            {!q && <p className="text-white/40 text-xs font-medium mb-2 uppercase tracking-wider">All Restaurants</p>}
            {restaurantResults.length === 0 && q && (
              <div className="text-center py-12 text-white/40">No restaurants found for "{query}"</div>
            )}
            {restaurantResults.map(restaurant => (
              <div key={restaurant.id} className="glass-light rounded-2xl p-3 flex gap-3">
                <img src={restaurant.avatar} alt={restaurant.name} className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-white font-semibold text-sm">{restaurant.name}</p>
                    {restaurant.isVerified && (
                      <span className="verified-badge text-white text-[8px]">✓</span>
                    )}
                  </div>
                  <p className="text-white/50 text-xs">{restaurant.handle} · {restaurant.category}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <span className="flex items-center gap-0.5 text-amber-400">
                      <Star size={10} fill="currentColor" /> {restaurant.rating}
                    </span>
                    <span className="text-white/40 flex items-center gap-0.5">
                      <Clock size={10} /> {restaurant.deliveryTimeMin} min
                    </span>
                    <span className={restaurant.isOpen ? 'text-green-400' : 'text-white/30'}>
                      {restaurant.isOpen ? '● Open' : '○ Closed'}
                    </span>
                  </div>
                  <p className="text-white/40 text-[11px] mt-1 line-clamp-1">{restaurant.bio}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
