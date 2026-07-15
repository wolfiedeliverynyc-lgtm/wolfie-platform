// ─────────────────────────────────────────────────────────────────────────────
// Core food & ordering types
// ─────────────────────────────────────────────────────────────────────────────

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isPopular?: boolean;
  isVegetarian?: boolean;
  rating?: number;
}

export interface Restaurant {
  id: string;
  name: string;
  handle: string; // e.g. @wolfieburger
  avatar: string;
  heroImage: string;
  category: string;
  rating: number;
  ratingCount: number;
  deliveryTimeMin: number;
  deliveryFee: number;
  address: string;
  isVerified: boolean;
  followersCount: number;
  bio: string;
  menu: MenuItem[];
  isOpen: boolean;
  coordinates: { lat: number; lng: number };
}

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  restaurant: Restaurant;
  quantity: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Social / Feed types
// ─────────────────────────────────────────────────────────────────────────────

export type PostType = 'dish' | 'content' | 'promo' | 'behind_scenes' | 'new_item';

export interface Comment {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
}

export interface DeliveryInfo {
  available: boolean;
  provider: string; // "Wolfie Delivery"
  estimatedMinutes?: number;
  fee?: number;
}

export interface FeedPost {
  id: string;
  type: PostType;
  restaurant: Restaurant;
  // Media
  image: string;
  videoUrl?: string;
  isVideo: boolean;
  // Caption & content
  caption: string;
  tags: string[]; // ['#healthy', '#ramen', '#nyc']
  // Linked dish (if type is 'dish' or 'new_item')
  linkedDish?: MenuItem;
  delivery?: DeliveryInfo;
  // Social data
  likes: number;
  comments: Comment[];
  shares: number;
  // State (mutated locally)
  isLiked: boolean;
  isSaved: boolean;
  // Metadata
  postedAt: string; // "2h ago"
  postedAtHours: number; // for algorithm sorting
  location?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stories
// ─────────────────────────────────────────────────────────────────────────────

export interface StorySegment {
  id: string;
  image: string;
  caption?: string;
  ctaText?: string;
  ctaItem?: MenuItem;
  duration: number; // seconds
  gradient?: string;
}

export interface Story {
  id: string;
  restaurant: Restaurant;
  segments: StorySegment[];
  isSeen: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// User & Social graph
// ─────────────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  avatar: string;
  bio: string;
  followingIds: string[]; // restaurant/user ids
  savedPostIds: string[];
  likedPostIds: string[];
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Algorithm / Personalisation
// ─────────────────────────────────────────────────────────────────────────────

export interface AlgorithmProfile {
  likedCategories: Record<string, number>;   // category → like count
  likedRestaurants: Record<string, number>;  // restaurant id → interaction count
  orderedCategories: Record<string, number>; // category → order count
  avgSpend: number;
  savedPosts: string[];
  lastUpdated: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────────────────────────────────────

export type SearchTab = 'content' | 'dishes' | 'restaurants';

export interface SearchResult {
  type: SearchTab;
  post?: FeedPost;
  dish?: MenuItem & { restaurant: Restaurant; delivery: DeliveryInfo };
  restaurant?: Restaurant;
}
