import { useState, useEffect, useCallback, useMemo } from 'react';
import { FeedPost, CartItem, MenuItem, Story, UserProfile } from './types';
import { FEED_POSTS, STORIES, DEMO_USER, RESTAURANTS } from './data';
import {
  loadAlgorithmProfile, saveAlgorithmProfile,
  recordLike, recordSave, recordAddToCart, recordDwell, sortFeed
} from './algorithm';

import TopHeader from './components/TopHeader';
import StoriesBar from './components/StoriesBar';
import StoryViewer from './components/StoryViewer';
import PostCard from './components/PostCard';
import CommentsSheet from './components/CommentsSheet';
import CartDrawer from './components/CartDrawer';
import QuickAddToast from './components/QuickAddToast';
import SearchView from './components/SearchView';
import ProfileView from './components/ProfileView';
import BottomNav from './components/BottomNav';

type View = 'feed' | 'search' | 'cart' | 'profile';

export default function App() {
  // ── View state ─────────────────────────────────────────────────
  const [activeView, setActiveView] = useState<View>('feed');

  // ── Posts state ────────────────────────────────────────────────
  const [posts, setPosts] = useState<FeedPost[]>(() =>
    FEED_POSTS.map(p => ({
      ...p,
      isLiked: DEMO_USER.likedPostIds.includes(p.id),
      isSaved: DEMO_USER.savedPostIds.includes(p.id),
    }))
  );

  // ── User & Social state ────────────────────────────────────────
  const [user, setUser] = useState<UserProfile>(DEMO_USER);
  const [followingIds, setFollowingIds] = useState<string[]>(DEMO_USER.followingIds);

  // ── Stories state ──────────────────────────────────────────────
  const [stories, setStories] = useState<Story[]>(STORIES);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);

  // ── Comments state ─────────────────────────────────────────────
  const [commentPost, setCommentPost] = useState<FeedPost | null>(null);

  // ── Cart state ──────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toast, setToast] = useState<{ item: MenuItem; restaurantName: string } | null>(null);

  // ── Algorithm ──────────────────────────────────────────────────
  const [algoProfile, setAlgoProfile] = useState(loadAlgorithmProfile);

  // Sorted feed (re-computed when algo profile or following changes)
  const sortedPosts = useMemo(
    () => sortFeed(posts, algoProfile, followingIds),
    [posts, algoProfile, followingIds]
  );

  // Persist algo profile
  useEffect(() => {
    saveAlgorithmProfile(algoProfile);
  }, [algoProfile]);

  // ── Cart derived ───────────────────────────────────────────────
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // ── Handlers ───────────────────────────────────────────────────

  const handleLike = useCallback((postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const nowLiked = !p.isLiked;
      return { ...p, isLiked: nowLiked, likes: p.likes + (nowLiked ? 1 : -1) };
    }));
    const post = posts.find(p => p.id === postId);
    if (post && !post.isLiked) {
      setAlgoProfile(prev => recordLike(post, prev));
    }
  }, [posts]);

  const handleSave = useCallback((postId: string) => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, isSaved: !p.isSaved } : p
    ));
    const post = posts.find(p => p.id === postId);
    if (post && !post.isSaved) {
      setAlgoProfile(prev => recordSave(post, prev));
    }
    setUser(prev => ({
      ...prev,
      savedPostIds: prev.savedPostIds.includes(postId)
        ? prev.savedPostIds.filter(id => id !== postId)
        : [...prev.savedPostIds, postId],
    }));
  }, [posts]);

  const handleFollow = useCallback((restaurantId: string) => {
    setFollowingIds(prev => {
      const isFollowing = prev.includes(restaurantId);
      const next = isFollowing ? prev.filter(id => id !== restaurantId) : [...prev, restaurantId];
      setUser(u => ({ ...u, followingCount: next.length, followingIds: next }));
      return next;
    });
  }, []);

  const handleAddToCart = useCallback((item: MenuItem, restaurant: FeedPost['restaurant']) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.menuItem.id === item.id && ci.restaurant.id === restaurant.id);
      if (existing) {
        return prev.map(ci =>
          ci.menuItem.id === item.id && ci.restaurant.id === restaurant.id
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        );
      }
      return [...prev, {
        id: `ci_${item.id}_${Date.now()}`,
        menuItem: item,
        restaurant,
        quantity: 1,
      }];
    });

    // Record to algorithm
    const fakePost = { linkedDish: item, restaurant, id: item.id } as any;
    setAlgoProfile(prev => recordAddToCart(fakePost, prev));

    // Show toast
    setToast({ item, restaurantName: restaurant.name });
  }, []);

  const handleUpdateCartQty = useCallback((cartItemId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(ci => ci.id === cartItemId);
      if (!item) return prev;
      if (item.quantity + delta <= 0) return prev.filter(ci => ci.id !== cartItemId);
      return prev.map(ci => ci.id === cartItemId ? { ...ci, quantity: ci.quantity + delta } : ci);
    });
  }, []);

  const handleDwell = useCallback((post: FeedPost, seconds: number) => {
    setAlgoProfile(prev => recordDwell(post, seconds, prev));
  }, []);

  // Story navigation
  const handleStoryOpen = (storyId: string) => {
    const idx = stories.findIndex(s => s.id === storyId);
    if (idx === -1) return;
    setActiveStoryIndex(idx);
    setActiveStory(stories[idx]);
    // Mark as seen
    setStories(prev => prev.map((s, i) => i === idx ? { ...s, isSeen: true } : s));
  };

  const handleStoryNext = () => {
    const next = activeStoryIndex + 1;
    if (next < stories.length) {
      setActiveStoryIndex(next);
      setActiveStory(stories[next]);
      setStories(prev => prev.map((s, i) => i === next ? { ...s, isSeen: true } : s));
    } else {
      setActiveStory(null);
    }
  };

  const handleStoryPrev = () => {
    const prev = activeStoryIndex - 1;
    if (prev >= 0) {
      setActiveStoryIndex(prev);
      setActiveStory(stories[prev]);
    } else {
      setActiveStory(null);
    }
  };

  // Derived: saved posts
  const savedPosts = useMemo(() =>
    posts.filter(p => p.isSaved),
    [posts]
  );

  // Derived: following restaurants
  const followingRestaurants = useMemo(() =>
    RESTAURANTS.filter(r => followingIds.includes(r.id)),
    [followingIds]
  );

  // ── Bottom nav change with view management ──────────────────────
  const handleNavChange = (view: View) => {
    if (view === 'cart') { setIsCartOpen(true); return; }
    setActiveView(view);
  };

  return (
    <div className="min-h-screen bg-black max-w-lg mx-auto relative overflow-hidden">
      {/* ── Top Header ──────────────────────────────────────────── */}
      <TopHeader
        cartCount={cartCount}
        onCartOpen={() => setIsCartOpen(true)}
        onSearchOpen={() => setActiveView('search')}
        activeView={activeView}
        notifCount={2}
      />

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main
        className="overflow-y-auto no-scrollbar"
        style={{
          paddingTop: 'calc(56px + env(safe-area-inset-top))',
          paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
          minHeight: '100vh',
        }}
      >
        {/* FEED VIEW */}
        {activeView === 'feed' && (
          <>
            {/* Stories */}
            <StoriesBar stories={stories} onStoryOpen={handleStoryOpen} />

            {/* Divider */}
            <div className="h-px bg-white/6 mb-1" />

            {/* Feed posts */}
            {sortedPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                isFollowing={followingIds.includes(post.restaurant.id)}
                onLike={handleLike}
                onSave={handleSave}
                onFollow={handleFollow}
                onCommentOpen={setCommentPost}
                onAddToCart={handleAddToCart}
                onDwell={handleDwell}
              />
            ))}

            {/* End of feed */}
            <div className="flex flex-col items-center py-8 gap-2">
              <p className="text-white/30 text-sm">You're all caught up! 🎉</p>
              <p className="text-white/20 text-xs">Follow more restaurants to see more posts</p>
            </div>
          </>
        )}

        {/* SEARCH VIEW */}
        {activeView === 'search' && (
          <SearchView
            posts={sortedPosts}
            onAddToCart={handleAddToCart}
            onClose={() => setActiveView('feed')}
          />
        )}

        {/* PROFILE VIEW */}
        {activeView === 'profile' && (
          <ProfileView
            user={user}
            posts={posts}
            followingRestaurants={followingRestaurants}
            savedPosts={savedPosts}
          />
        )}
      </main>

      {/* ── Bottom Navigation ─────────────────────────────────────── */}
      <BottomNav
        active={activeView === 'search' ? 'search' : activeView}
        onChange={handleNavChange}
        cartCount={cartCount}
      />

      {/* ── Story Viewer (full-screen overlay) ────────────────────── */}
      {activeStory && (
        <StoryViewer
          story={activeStory}
          onClose={() => setActiveStory(null)}
          onNext={handleStoryNext}
          onPrev={handleStoryPrev}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* ── Comments Sheet ────────────────────────────────────────── */}
      {commentPost && (
        <CommentsSheet
          post={commentPost}
          onClose={() => setCommentPost(null)}
        />
      )}

      {/* ── Cart Drawer ───────────────────────────────────────────── */}
      {isCartOpen && (
        <CartDrawer
          cart={cart}
          onClose={() => setIsCartOpen(false)}
          onUpdateQty={handleUpdateCartQty}
          onCheckout={() => {
            setIsCartOpen(false);
            alert(`🎉 Order placed! Total: $${cart.reduce((s, i) => s + i.menuItem.price * i.quantity, 0).toFixed(2)}\n\n🐺 Wolfie Delivery is on the way!`);
            setCart([]);
          }}
        />
      )}

      {/* ── Quick Add Toast ───────────────────────────────────────── */}
      {toast && (
        <QuickAddToast
          item={toast.item}
          restaurantName={toast.restaurantName}
          onViewCart={() => { setToast(null); setIsCartOpen(true); }}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
