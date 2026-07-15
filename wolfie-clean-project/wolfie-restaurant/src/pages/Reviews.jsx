import React, { useState } from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, MessageSquare, AlertTriangle, CheckCircle, ArrowLeftRight, ThumbsUp, Send, Sparkles, Filter
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
};

const QUICK_REPLIES = [
  "Thank you so much for the feedback! We are thrilled you enjoyed the food.",
  "We sincerely apologize for this experience. We will address this with our kitchen staff immediately.",
  "Thank you for letting us know. We have credited a $5 refund coupon to your account for next time.",
  "We appreciate your review. Rest assured we are working to improve our delivery times."
];

export default function Reviews() {
  const reviews = useRestaurantStore((s) => s.reviews) || [];
  const replyToReview = useRestaurantStore((s) => s.replyToReview);
  
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'pending' | 'critical' | 'positive'
  const [replyInputs, setReplyInputs] = useState({}); // { [reviewId]: string }
  const [showReplyForm, setShowReplyForm] = useState({}); // { [reviewId]: boolean }

  // Calculations
  const totalReviewsCount = reviews.length;
  const answeredCount = reviews.filter(r => r.reply).length;
  const responseRate = totalReviewsCount > 0 ? Math.round((answeredCount / totalReviewsCount) * 100) : 100;
  
  const averageRating = totalReviewsCount > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount).toFixed(1) 
    : "5.0";

  const criticalReviews = reviews.filter(r => r.rating <= 2);
  const criticalCount = criticalReviews.length;
  const negativeReviewRatio = totalReviewsCount > 0 ? ((criticalCount / totalReviewsCount) * 100).toFixed(1) : "0.0";

  // Category specific ratings breakdown (mocked averages based on data)
  const categoryAverages = {
    quality: totalReviewsCount > 0 
      ? (reviews.reduce((sum, r) => sum + r.categoryRatings.quality, 0) / totalReviewsCount).toFixed(1) 
      : "5.0",
    speed: totalReviewsCount > 0 
      ? (reviews.reduce((sum, r) => sum + r.categoryRatings.speed, 0) / totalReviewsCount).toFixed(1) 
      : "5.0",
    accuracy: totalReviewsCount > 0 
      ? (reviews.reduce((sum, r) => sum + r.categoryRatings.accuracy, 0) / totalReviewsCount).toFixed(1) 
      : "5.0"
  };

  // Filter reviews
  const filteredReviews = reviews.filter(rev => {
    if (activeFilter === 'pending') return !rev.reply;
    if (activeFilter === 'critical') return rev.rating <= 2;
    if (activeFilter === 'positive') return rev.rating >= 4;
    return true; // 'all'
  });

  const handleSendReply = (reviewId) => {
    const text = replyInputs[reviewId]?.trim();
    if (!text) return;
    
    replyToReview(reviewId, text);
    setReplyInputs(prev => ({ ...prev, [reviewId]: '' }));
    setShowReplyForm(prev => ({ ...prev, [reviewId]: false }));
  };

  const handleSelectQuickReply = (reviewId, text) => {
    setReplyInputs(prev => ({ ...prev, [reviewId]: text }));
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            size={14} 
            fill={star <= rating ? "#FFE100" : "transparent"} 
            color={star <= rating ? "#FFE100" : "var(--text-secondary)"} 
            style={{ opacity: star <= rating ? 1 : 0.25 }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full h-full text-[var(--text-primary)] p-8 lg:p-12 overflow-y-auto overflow-x-hidden relative bg-[var(--bg-app)] transition-colors duration-300">
      
      {/* Background ambient glow */}
      <div className="fixed top-[-10%] right-[-10%] w-[35%] h-[35%] bg-[var(--accent-red)] opacity-5 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[35%] h-[35%] bg-[var(--accent-yellow)] opacity-5 blur-[120px] pointer-events-none" />

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-10 relative z-10">
        
        {/* Header Title */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between border-none pb-6">
          <div>
            <motion.div initial={{ width: 0 }} animate={{ width: "40px" }} className="h-1 bg-[var(--accent-yellow)] mb-6 shadow-[0_0_10px_var(--accent-yellow)]" />
            <h1 className="text-4xl font-extrabold tracking-tight uppercase font-poppins">Customer Reviews</h1>
            <p className="text-[14px] uppercase tracking-[0.15em] text-[var(--text-secondary)] mt-4 font-poppins flex items-center gap-2">
              <Sparkles size={12} className="text-[var(--accent-yellow)]" /> Reputation & Customer Satisfaction Index
            </p>
          </div>
        </motion.div>

        {/* Top KPI Summaries */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          
          {/* Average rating card */}
          <div className="bg-[var(--bg-card)] rounded-[24px] p-6 border-none flex flex-col justify-between h-36 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent-yellow)]/5 blur-[25px] group-hover:scale-125 transition-transform duration-700" />
            <span className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] font-poppins">Average Rating</span>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-black font-poppins text-[var(--accent-yellow)]">{averageRating}</span>
              <span className="text-xs text-[var(--text-secondary)] font-bold">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {renderStars(Math.round(parseFloat(averageRating)))}
              <span className="text-[12px] font-bold text-[var(--text-secondary)] font-poppins uppercase tracking-wider ml-1">({totalReviewsCount} reviews)</span>
            </div>
          </div>

          {/* Response rate card */}
          <div className="bg-[var(--bg-card)] rounded-[24px] p-6 border-none flex flex-col justify-between h-36 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent-yellow)]/5 blur-[25px] group-hover:scale-125 transition-transform duration-700" />
            <span className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] font-poppins">Response Rate</span>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-black font-poppins text-white">{responseRate}%</span>
            </div>
            <div className="text-[12px] font-bold text-[var(--text-secondary)] font-poppins uppercase tracking-wider flex items-center gap-1 mt-2">
              <CheckCircle size={10} className="text-green-500" /> {answeredCount} answered reviews
            </div>
          </div>

          {/* Critical reviews alert */}
          <div className="bg-[var(--bg-card)] rounded-[24px] p-6 border-none flex flex-col justify-between h-36 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent-red)]/5 blur-[25px] group-hover:scale-125 transition-transform duration-700" />
            <span className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] font-poppins">Critical Alerts</span>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-black font-poppins text-[var(--accent-red)]">{criticalCount}</span>
              <span className="text-xs text-[var(--text-secondary)] font-bold">Negative Reviews</span>
            </div>
            <div className="text-[12px] font-bold text-[var(--accent-red)] font-poppins uppercase tracking-wider flex items-center gap-1 mt-2">
              <AlertTriangle size={10} /> Needs immediate replies
            </div>
          </div>

          {/* Negative ratio card */}
          <div className="bg-[var(--bg-card)] rounded-[24px] p-6 border-none flex flex-col justify-between h-36 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent-red)]/5 blur-[25px] group-hover:scale-125 transition-transform duration-700" />
            <span className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] font-poppins">Critical Review Ratio</span>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-black font-poppins text-white">{negativeReviewRatio}%</span>
            </div>
            <div className="text-[12px] font-bold text-green-500 font-poppins uppercase tracking-wider flex items-center gap-1 mt-2">
              Healthy platform target (&lt; 5%)
            </div>
          </div>

        </motion.div>

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Main Area: Filter tabs and Reviews Feed */}
          <motion.div variants={itemVariants} className="lg:col-span-8 space-y-6">
            
            {/* Filter controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-card)] p-4 rounded-[20px]">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'All Reviews' },
                  { id: 'pending', label: 'Pending Reply' },
                  { id: 'critical', label: 'Critical Alerts (1-2★)' },
                  { id: 'positive', label: 'Positive (4-5★)' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-4 py-2 rounded-xl text-[13px] uppercase tracking-wider font-extrabold transition-all border-none cursor-pointer font-poppins ${
                      activeFilter === tab.id 
                        ? 'bg-[var(--accent-yellow)] text-black' 
                        : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)] font-bold uppercase tracking-wider font-poppins">
                <Filter size={12} /> {filteredReviews.length} shown
              </div>
            </div>

            {/* Feed Cards List */}
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {filteredReviews.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="bg-[var(--bg-card)] p-12 text-center rounded-[24px] text-[var(--text-secondary)] font-poppins text-sm"
                  >
                    No reviews matching this filter at this time.
                  </motion.div>
                ) : (
                  filteredReviews.map((rev) => (
                    <motion.div
                      key={rev.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className={`bg-[var(--bg-card)] rounded-[24px] p-6 text-left relative overflow-hidden transition-all duration-300 border-l-4 ${
                        rev.rating <= 2 
                          ? 'border-[var(--accent-red)]' 
                          : rev.rating >= 4 
                            ? 'border-green-500' 
                            : 'border-[var(--accent-yellow)]'
                      }`}
                    >
                      {/* Top Row: User details & rating */}
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="text-sm font-extrabold font-poppins text-white">{rev.customerName}</h4>
                          <span className="text-[12px] text-[var(--text-secondary)] font-bold uppercase tracking-wider font-poppins block mt-0.5">
                            {new Date(rev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {renderStars(rev.rating)}
                          <span className="text-[13px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{
                            backgroundColor: rev.rating <= 2 ? 'rgba(239, 42, 57, 0.15)' : rev.rating >= 4 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 225, 0, 0.15)',
                            color: rev.rating <= 2 ? '#EF2A39' : rev.rating >= 4 ? '#22C55E' : '#FFE100'
                          }}>
                            {rev.rating} Star Review
                          </span>
                        </div>
                      </div>

                      {/* Items Ordered */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <span className="text-[13px] font-bold uppercase tracking-wider text-[var(--text-secondary)]/50 mr-1 self-center font-poppins">Bought:</span>
                        {rev.items.map(item => (
                          <span key={item} className="text-[12px] font-bold text-[var(--text-secondary)] bg-[var(--bg-app)] px-2 py-0.5 rounded-md font-poppins">
                            {item}
                          </span>
                        ))}
                      </div>

                      {/* Comment text */}
                      <p className="text-sm leading-relaxed text-neutral-300 mt-4 font-poppins font-light">
                        "{rev.comment}"
                      </p>

                      {/* Rating Categories Sub-breakdown */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--text-secondary)]/10 text-[12px] uppercase tracking-wider font-poppins font-bold text-[var(--text-secondary)]">
                        <span>Quality: <span className="text-white">{rev.categoryRatings.quality}★</span></span>
                        <span>Speed: <span className="text-white">{rev.categoryRatings.speed}★</span></span>
                        <span>Accuracy: <span className="text-white">{rev.categoryRatings.accuracy}★</span></span>
                      </div>

                      {/* Reply section */}
                      <div className="mt-6">
                        {rev.reply ? (
                          /* Existing reply bubble */
                          <div className="bg-[var(--bg-card-hover)] rounded-2xl p-4 text-xs font-poppins relative">
                            <div className="absolute top-[-6px] left-6 w-3 h-3 bg-[var(--bg-card-hover)] rotate-45" />
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[13px] font-extrabold uppercase tracking-wider text-[var(--accent-yellow)] flex items-center gap-1">
                                <Sparkles size={10} /> Owner Response
                              </span>
                            </div>
                            <p className="text-neutral-300 font-light leading-relaxed text-sm">
                              {rev.reply}
                            </p>
                          </div>
                        ) : (
                          /* Reply input form */
                          <div className="space-y-4">
                            {!showReplyForm[rev.id] ? (
                              <button
                                onClick={() => setShowReplyForm(prev => ({ ...prev, [rev.id]: true }))}
                                className="px-4 py-2 rounded-xl text-[13px] font-extrabold uppercase tracking-wider bg-[var(--bg-card-hover)] text-[var(--accent-yellow)] hover:bg-[var(--accent-yellow)] hover:text-black transition-all border-none cursor-pointer font-poppins"
                              >
                                Reply publicly
                              </button>
                            ) : (
                              <div className="bg-[var(--bg-card-hover)] rounded-2xl p-4 space-y-4 border border-[var(--accent-yellow)]/10">
                                <span className="text-[13px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] font-poppins block">Compose Public Response</span>
                                
                                {/* Quick reply template chips */}
                                <div className="space-y-1">
                                  <label className="text-[13px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-poppins">Quick Templates</label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {QUICK_REPLIES.map(text => (
                                      <button
                                        key={text}
                                        onClick={() => handleSelectQuickReply(rev.id, text)}
                                        className="text-[12px] text-left px-2.5 py-1.5 rounded-lg bg-[var(--bg-app)] hover:bg-[var(--accent-yellow)]/10 hover:text-[var(--accent-yellow)] text-[var(--text-secondary)] border-none transition-colors cursor-pointer font-poppins max-w-full truncate"
                                        title={text}
                                      >
                                        {text}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Main Textarea input */}
                                <div className="flex gap-2">
                                  <textarea
                                    rows={2}
                                    value={replyInputs[rev.id] || ''}
                                    onChange={(e) => setReplyInputs(prev => ({ ...prev, [rev.id]: e.target.value }))}
                                    placeholder="Type your response to the customer..."
                                    className="flex-1 bg-[var(--bg-app)] border border-[var(--text-secondary)]/10 rounded-xl p-3 text-sm text-white outline-none focus:border-[var(--accent-yellow)] transition-colors font-poppins resize-none"
                                  />
                                  <button
                                    onClick={() => handleSendReply(rev.id)}
                                    className="p-3 rounded-xl bg-[var(--accent-yellow)] text-black border-none hover:scale-105 active:scale-95 transition-transform flex items-center justify-center cursor-pointer shrink-0"
                                  >
                                    <Send size={14} />
                                  </button>
                                </div>
                                
                                <button
                                  onClick={() => setShowReplyForm(prev => ({ ...prev, [rev.id]: false }))}
                                  className="text-[13px] uppercase tracking-wider font-bold text-[var(--text-secondary)] hover:text-white bg-transparent border-none cursor-pointer font-poppins"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

          </motion.div>

          {/* Right Area: Insights & Metrics Breakdown */}
          <motion.div variants={itemVariants} className="lg:col-span-4 space-y-6 text-left">
            
            {/* Sentiment Breakdown Chart / Card */}
            <div className="bg-[var(--bg-card)] rounded-[24px] p-6 border-none">
              <p className="text-[14px] uppercase tracking-[0.15em] text-[var(--accent-yellow)] font-bold mb-6 font-poppins flex items-center gap-2">
                <ArrowLeftRight size={14} /> Performance Breakdown
              </p>
              
              <div className="space-y-5">
                {[
                  { label: "Food Quality", value: categoryAverages.quality, color: "bg-green-500" },
                  { label: "Delivery Speed", value: categoryAverages.speed, color: "bg-[var(--accent-yellow)]" },
                  { label: "Order Accuracy", value: categoryAverages.accuracy, color: "bg-green-500" }
                ].map(item => {
                  const percent = (parseFloat(item.value) / 5) * 100;
                  return (
                    <div key={item.label} className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-poppins">
                        <span className="font-semibold text-neutral-300 text-sm">{item.label}</span>
                        <span className="font-extrabold text-white text-sm">{item.value} / 5.0</span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--bg-card-hover)] rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Sentiment Analysis Insights */}
            <div className="bg-[var(--bg-card)] rounded-[24px] p-6 border-none relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-yellow)]/5 blur-[30px] pointer-events-none" />
              <p className="text-[14px] uppercase tracking-[0.15em] text-[var(--accent-yellow)] font-bold mb-6 font-poppins flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--accent-yellow)]" /> AI Sentiment Insights
              </p>

              <div className="space-y-6">
                
                {/* Positive insights */}
                <div className="space-y-3">
                  <span className="text-[12px] font-black uppercase tracking-wider text-green-500 bg-green-500/10 px-2 py-0.5 rounded font-poppins">Customer Loves</span>
                  <ul className="space-y-2.5 text-sm text-neutral-300 font-poppins font-light list-none p-0 m-0">
                    <li className="flex items-start gap-2">
                      <ThumbsUp size={12} className="text-green-500 shrink-0 mt-0.5" />
                      <span><strong>Alpha Wolf Burger</strong> taste, seasoning, and texture consistently receive 5-star mentions.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ThumbsUp size={12} className="text-green-500 shrink-0 mt-0.5" />
                      <span><strong>Packaging design</strong> and branding aesthetics are frequently praised for premium quality.</span>
                    </li>
                  </ul>
                </div>

                {/* Negative insights / Bottlenecks */}
                <div className="space-y-3 pt-4 border-t border-[var(--text-secondary)]/10">
                  <span className="text-[12px] font-black uppercase tracking-wider text-[var(--accent-red)] bg-[var(--accent-red)]/10 px-2 py-0.5 rounded font-poppins">Action Points</span>
                  <ul className="space-y-2.5 text-sm text-neutral-300 font-poppins font-light list-none p-0 m-0">
                    <li className="flex items-start gap-2">
                      <AlertTriangle size={12} className="text-[var(--accent-red)] shrink-0 mt-0.5" />
                      <span><strong>Delivery temperature</strong>: 3 reports of cold/soggy loaded fries on trips exceeding 15 minutes.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle size={12} className="text-[var(--accent-red)] shrink-0 mt-0.5" />
                      <span><strong>Missing custom extras</strong>: 2 instances of missing paid toppings (like cheese/bacon) inside combos.</span>
                    </li>
                  </ul>
                </div>

              </div>
            </div>

          </motion.div>

        </div>

      </motion.div>
    </div>
  );
}
