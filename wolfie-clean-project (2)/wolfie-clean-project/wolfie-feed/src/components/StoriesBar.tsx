import { Story } from '../types';

interface Props {
  stories: Story[];
  onStoryOpen: (storyId: string) => void;
}

export default function StoriesBar({ stories, onStoryOpen }: Props) {
  return (
    <div className="flex gap-3 px-4 py-3 overflow-x-auto no-scrollbar">
      {stories.map((story) => (
        <button
          key={story.id}
          id={`story-${story.id}`}
          onClick={() => onStoryOpen(story.id)}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform"
          aria-label={`${story.restaurant.name} story`}
        >
          {/* Story ring */}
          <div className={`p-[2px] rounded-full ${story.isSeen ? 'bg-white/20' : 'gradient-story-ring'}`}>
            <div className="p-[2px] rounded-full bg-black">
              <img
                src={story.restaurant.avatar}
                alt={story.restaurant.name}
                className="w-14 h-14 rounded-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          {/* Label */}
          <span className="text-[10px] text-white/80 font-medium text-center leading-tight max-w-[60px] truncate">
            {story.restaurant.name.split(' ')[0]}
          </span>
        </button>
      ))}
    </div>
  );
}
