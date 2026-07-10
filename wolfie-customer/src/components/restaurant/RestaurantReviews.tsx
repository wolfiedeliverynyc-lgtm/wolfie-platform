import React from 'react';

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
}

interface RestaurantReviewsProps {
  restaurantName: string;
  rating: number;
  reviews: Review[];
}

export default function RestaurantReviews({ restaurantName, rating, reviews }: RestaurantReviewsProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm space-y-6 animate-fadeIn">
      <div className="flex gap-6 items-center border-b border-gray-50 pb-6">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
          <span className="text-[28px]">🍔</span>
        </div>
        <div className="text-left flex-1">
          <h4 className="font-poppins font-bold text-[16.5px] text-[#3C2F2F]">Verified Customer Reviews</h4>
          <p className="font-roboto text-[12px] text-[#A6A6A6] mt-0.5">Showing latest reviews for {restaurantName}</p>
        </div>
        <div className="bg-[#FFE100]/10 border border-[#FFE100]/25 rounded-2xl p-4 text-center">
          <span className="font-poppins font-black text-[22px] text-[#3C2F2F] leading-none block">{rating}</span>
          <span className="font-roboto text-[11px] text-[#A6A6A6] mt-1 block">out of 5</span>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map(rev => (
          <div key={rev.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0 flex gap-4 text-left">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
              <img src={rev.avatar} alt={rev.author} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="font-poppins font-bold text-[13.5px] text-[#3C2F2F]">{rev.author}</span>
                <span className="font-roboto text-[11px] text-[#A6A6A6]">{rev.date}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[#FFE100] text-[11px]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i}>{i < rev.rating ? '★' : '☆'}</span>
                ))}
              </div>
              <p className="font-roboto text-[13.5px] text-[#6A6A6A] mt-2 leading-relaxed">{rev.comment}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
