import { Grid3X3, Bookmark, Heart, UserCheck, UserPlus } from 'lucide-react';
import { UserProfile, FeedPost, Restaurant } from '../types';

interface Props {
  user: UserProfile;
  posts: FeedPost[];
  followingRestaurants: Restaurant[];
  savedPosts: FeedPost[];
}

export default function ProfileView({ user, posts, followingRestaurants, savedPosts }: Props) {
  return (
    <div className="pb-4">
      {/* Profile header */}
      <div className="px-4 pt-4 pb-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="p-[2px] rounded-full gradient-story-ring">
            <div className="p-[2px] rounded-full bg-black">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-20 h-20 rounded-full object-cover"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1">
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-white font-bold text-lg">{user.postsCount}</p>
                <p className="text-white/50 text-xs">Posts</p>
              </div>
              <div>
                <p className="text-white font-bold text-lg">{user.followersCount.toLocaleString()}</p>
                <p className="text-white/50 text-xs">Followers</p>
              </div>
              <div>
                <p className="text-white font-bold text-lg">{user.followingCount}</p>
                <p className="text-white/50 text-xs">Following</p>
              </div>
            </div>

            {/* Edit profile button */}
            <button
              id="edit-profile-btn"
              className="mt-3 w-full py-1.5 glass-light rounded-xl text-white/80 text-sm font-semibold border border-white/15"
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* Bio */}
        <div className="mt-3">
          <p className="text-white font-semibold text-sm">{user.fullName}</p>
          <p className="text-white/70 text-sm mt-0.5">{user.bio}</p>
          <p className="text-[#FF6B00] text-sm mt-0.5">@{user.username}</p>
        </div>
      </div>

      {/* Following Restaurants */}
      {followingRestaurants.length > 0 && (
        <div className="px-4 mb-5">
          <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <UserCheck size={16} className="text-[#FF6B00]" />
            Following ({followingRestaurants.length})
          </p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {followingRestaurants.map(r => (
              <div key={r.id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="p-[2px] rounded-full gradient-story-ring">
                  <div className="p-[2px] rounded-full bg-black">
                    <img src={r.avatar} alt={r.name} className="w-12 h-12 rounded-full object-cover" />
                  </div>
                </div>
                <span className="text-white/60 text-[10px] text-center max-w-[52px] truncate">{r.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved Posts Grid */}
      <div className="px-4">
        <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Bookmark size={16} className="text-[#FF6B00]" />
          Saved ({savedPosts.length})
        </p>

        {savedPosts.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <Bookmark size={40} className="text-white/20" />
            <p className="text-white/40 text-sm">No saved posts yet</p>
            <p className="text-white/30 text-xs text-center">Tap 🔖 on any post to save it here</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {savedPosts.map(post => (
              <div key={post.id} className="aspect-square relative overflow-hidden">
                <img
                  src={post.image}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {post.linkedDish && (
                  <div className="absolute bottom-1 left-1 bg-[#FF6B00] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    🛒
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Liked posts count */}
      <div className="px-4 mt-5">
        <div className="glass-light rounded-2xl p-4 flex items-center gap-3">
          <Heart size={20} className="text-red-400 fill-red-400" />
          <div>
            <p className="text-white font-medium text-sm">Liked Posts</p>
            <p className="text-white/50 text-xs">{user.likedPostIds.length} posts liked</p>
          </div>
        </div>
      </div>
    </div>
  );
}
