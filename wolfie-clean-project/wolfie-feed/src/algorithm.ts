import { FeedPost, AlgorithmProfile } from './types';

const STORAGE_KEY = 'wolfie_feed_algorithm_profile';

// ─────────────────────────────────────────────────────────────────────────────
// Load / Save profile from localStorage
// ─────────────────────────────────────────────────────────────────────────────

export function loadAlgorithmProfile(): AlgorithmProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    likedCategories: {},
    likedRestaurants: {},
    orderedCategories: {},
    avgSpend: 18,
    savedPosts: [],
    lastUpdated: Date.now(),
  };
}

export function saveAlgorithmProfile(profile: AlgorithmProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...profile, lastUpdated: Date.now() }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal recording — called on user interactions
// ─────────────────────────────────────────────────────────────────────────────

export function recordLike(post: FeedPost, profile: AlgorithmProfile): AlgorithmProfile {
  const category = post.linkedDish?.category || post.type;
  return {
    ...profile,
    likedCategories: { ...profile.likedCategories, [category]: (profile.likedCategories[category] || 0) + 2 },
    likedRestaurants: { ...profile.likedRestaurants, [post.restaurant.id]: (profile.likedRestaurants[post.restaurant.id] || 0) + 1 },
  };
}

export function recordSave(post: FeedPost, profile: AlgorithmProfile): AlgorithmProfile {
  const category = post.linkedDish?.category || post.type;
  return {
    ...profile,
    likedCategories: { ...profile.likedCategories, [category]: (profile.likedCategories[category] || 0) + 3 },
    likedRestaurants: { ...profile.likedRestaurants, [post.restaurant.id]: (profile.likedRestaurants[post.restaurant.id] || 0) + 2 },
    savedPosts: [...profile.savedPosts.filter(id => id !== post.id), post.id],
  };
}

export function recordAddToCart(post: FeedPost, profile: AlgorithmProfile): AlgorithmProfile {
  const category = post.linkedDish?.category || '';
  const price = post.linkedDish?.price || profile.avgSpend;
  const newAvg = profile.avgSpend * 0.8 + price * 0.2; // rolling average
  return {
    ...profile,
    orderedCategories: { ...profile.orderedCategories, [category]: (profile.orderedCategories[category] || 0) + 5 },
    likedRestaurants: { ...profile.likedRestaurants, [post.restaurant.id]: (profile.likedRestaurants[post.restaurant.id] || 0) + 3 },
    avgSpend: Math.round(newAvg * 100) / 100,
  };
}

export function recordDwell(post: FeedPost, dwellSeconds: number, profile: AlgorithmProfile): AlgorithmProfile {
  if (dwellSeconds < 2) return profile; // skip quick scrolls
  const category = post.linkedDish?.category || post.type;
  const boost = dwellSeconds >= 5 ? 1 : 0.5;
  return {
    ...profile,
    likedCategories: { ...profile.likedCategories, [category]: (profile.likedCategories[category] || 0) + boost },
    likedRestaurants: { ...profile.likedRestaurants, [post.restaurant.id]: (profile.likedRestaurants[post.restaurant.id] || 0) + boost * 0.5 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring engine
// ─────────────────────────────────────────────────────────────────────────────

function getTimeRelevanceBoost(post: FeedPost, hour: number): number {
  const cat = (post.linkedDish?.category || '').toLowerCase();
  if ((hour >= 7 && hour <= 10) && cat.includes('break')) return 12;
  if ((hour >= 11 && hour <= 14) && (cat.includes('salad') || cat.includes('bowl') || cat.includes('ramen') || cat.includes('burger'))) return 10;
  if ((hour >= 17 && hour <= 21) && (cat.includes('pizza') || cat.includes('pasta') || cat.includes('burger') || cat.includes('ramen'))) return 10;
  if ((hour >= 20 || hour <= 2) && cat.includes('dessert')) return 15;
  return 0;
}

function getRecencyBoost(postedAtHours: number): number {
  if (postedAtHours <= 1) return 20;
  if (postedAtHours <= 6) return 15;
  if (postedAtHours <= 12) return 10;
  if (postedAtHours <= 24) return 5;
  return 0;
}

export function scorePost(post: FeedPost, profile: AlgorithmProfile, followingIds: string[]): number {
  let score = 30; // baseline

  // 1. Following boost — content from followed accounts gets a big bump
  if (followingIds.includes(post.restaurant.id)) {
    score += 35;
  }

  // 2. Category preference (liked + ordered combined)
  const category = post.linkedDish?.category || post.type;
  const likedScore = (profile.likedCategories[category] || 0) * 4;
  const orderedScore = (profile.orderedCategories[category] || 0) * 6;
  score += Math.min(likedScore + orderedScore, 30);

  // 3. Restaurant affinity
  const restScore = (profile.likedRestaurants[post.restaurant.id] || 0) * 3;
  score += Math.min(restScore, 20);

  // 4. Content type preference — dish posts with delivery rank higher
  if (post.type === 'dish' && post.delivery?.available) {
    score += 8;
  } else if (post.type === 'promo' && post.delivery?.available) {
    score += 12; // promos with delivery = very actionable
  }

  // 5. Popularity signal
  score += Math.min(post.likes / 500, 10);

  // 6. Time relevance (meal time matching)
  const hour = new Date().getHours();
  score += getTimeRelevanceBoost(post, hour);

  // 7. Recency
  score += getRecencyBoost(post.postedAtHours);

  // 8. Saved post gets negative signal (already seen deeply)
  if (profile.savedPosts.includes(post.id)) {
    score -= 5;
  }

  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main sort function — call this to get personalised feed order
// ─────────────────────────────────────────────────────────────────────────────

export function sortFeed(posts: FeedPost[], profile: AlgorithmProfile, followingIds: string[]): FeedPost[] {
  const scored = posts.map(post => ({
    post,
    score: scorePost(post, profile, followingIds),
  }));
  // Sort descending by score, with tiny random noise to prevent identical ordering
  scored.sort((a, b) => (b.score + Math.random() * 2) - (a.score + Math.random() * 2));
  return scored.map(s => s.post);
}
