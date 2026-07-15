import { Restaurant, FeedPost, Story, Comment, UserProfile } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Restaurants
// ─────────────────────────────────────────────────────────────────────────────

export const RESTAURANTS: Restaurant[] = [
  {
    id: 'rest_0',
    name: 'Wolfie Burger Grill',
    handle: '@wolfieburger',
    avatar: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=150&h=150&q=80',
    heroImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&h=500&q=80',
    category: 'Burgers',
    rating: 4.9, ratingCount: 2450,
    deliveryTimeMin: 15, deliveryFee: 0,
    address: '120 Lafayette St, New York, NY',
    isVerified: true, followersCount: 48200,
    bio: 'NYC\'s finest plancha-smashed premium burgers. Fresh daily. 🍔🔥',
    isOpen: true,
    coordinates: { lat: 40.718, lng: -74.0015 },
    menu: [
      { id: 'w_m1', name: 'Classic Smash Burger', description: 'Double plancha-smashed angus beef, vintage cheddar, house pickles, secret sauce on brioche.', price: 14.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&h=600&q=80', isPopular: true, rating: 4.9 },
      { id: 'w_m2', name: 'Crispy Chicken Deluxe', description: 'Southern-style crispy fried chicken, honey slaw, pickled jalapeños, maple aioli.', price: 13.49, category: 'Burgers', image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&h=600&q=80', isPopular: true },
      { id: 'w_m3', name: 'Truffle Parmesan Fries', description: 'Hand-cut fries tossed in white truffle oil, shaved parmesan, fresh herbs.', price: 7.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&h=600&q=80' },
    ]
  },
  {
    id: 'rest_1',
    name: 'Neo-Tokyo Ramen',
    handle: '@neotokyonyc',
    avatar: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=150&h=150&q=80',
    heroImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&h=500&q=80',
    category: 'Japanese',
    rating: 4.8, ratingCount: 1240,
    deliveryTimeMin: 25, deliveryFee: 1.99,
    address: '28 Orchard Street, New York, NY',
    isVerified: true, followersCount: 31500,
    bio: 'Authentic 18-hour tonkotsu broth meets NYC energy. Ramen is life. 🍜',
    isOpen: true,
    coordinates: { lat: 40.7183, lng: -73.9904 },
    menu: [
      { id: 'r_m1', name: 'Signature Tonkotsu Special', description: 'Rich 18-hour pork bone broth, soft-cooked egg, nori, bamboo shoots, flame-seared chashu pork belly.', price: 18.50, category: 'Ramen', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&h=600&q=80', isPopular: true, rating: 4.9 },
      { id: 'r_m2', name: 'Spicy Black Garlic Miso', description: 'Creamy red & white miso, spicy minced pork, wood-ear mushrooms, roasted garlic paste.', price: 19.00, category: 'Ramen', image: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=600&h=600&q=80', isPopular: true },
      { id: 'r_m3', name: 'Pork Gyoza (6 pcs)', description: 'Pan-fried handmade dumplings, Berkshire pork, fresh garlic, tangy dipping sauce.', price: 8.50, category: 'Sides', image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&h=600&q=80' },
    ]
  },
  {
    id: 'rest_2',
    name: 'The Truffle Grove',
    handle: '@trufflegrove',
    avatar: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=150&h=150&q=80',
    heroImage: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&h=500&q=80',
    category: 'Italian',
    rating: 4.9, ratingCount: 840,
    deliveryTimeMin: 35, deliveryFee: 4.99,
    address: '422 West Broadway, New York, NY',
    isVerified: true, followersCount: 22100,
    bio: 'Michelin-starred Italian. Handmade truffled pasta crafted with love. 🍝✨',
    isOpen: true,
    coordinates: { lat: 40.7246, lng: -74.0018 },
    menu: [
      { id: 't_m1', name: 'Truffle Tagliolini d\'Oro', description: 'House-milled egg pasta, cultured French butter, aged Parmigiano, 5g fresh black winter truffles.', price: 36.00, category: 'Pasta', image: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=600&h=600&q=80', isPopular: true },
      { id: 't_m2', name: 'Wild Mushroom Gnocchi', description: 'Pillowy potato gnocchi, caramelized porcini & chanterelle mushrooms, sweet sage butter.', price: 28.00, category: 'Pasta', image: 'https://images.unsplash.com/photo-1621996346565-e3bb64e0be91?auto=format&fit=crop&w=600&h=600&q=80', isVegetarian: true, isPopular: true },
      { id: 't_m3', name: 'Heirloom Caprese Burrata', description: 'Organic tomatoes, fresh burrata pugliese, gold-grade balsamic, hand-torn basil.', price: 19.50, category: 'Antipasti', image: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&w=600&h=600&q=80', isVegetarian: true },
    ]
  },
  {
    id: 'rest_3',
    name: 'Green Garden Bistro',
    handle: '@greengardenbklyn',
    avatar: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=150&h=150&q=80',
    heroImage: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&h=500&q=80',
    category: 'Healthy',
    rating: 4.7, ratingCount: 610,
    deliveryTimeMin: 20, deliveryFee: 0.99,
    address: '159 Prince Street, New York, NY',
    isVerified: false, followersCount: 15800,
    bio: '100% organic. Plant-powered. Carbon-neutral delivery. 🌱💚',
    isOpen: true,
    coordinates: { lat: 40.7259, lng: -74.0011 },
    menu: [
      { id: 'g_m1', name: 'Harvest Superfood Bowl', description: 'Organic baby kale, brown rice, maple-roasted sweet potato, avocado, edamame, tahini.', price: 15.50, category: 'Healthy', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&h=600&q=80', isVegetarian: true, isPopular: true, rating: 4.8 },
      { id: 'g_m2', name: 'Avocado Citrus Salad', description: 'Shaved raw fennel, grapefruit, avocado wheels, watermelon radishes, lime vinaigrette.', price: 14.00, category: 'Healthy', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&h=600&q=80', isVegetarian: true },
      { id: 'g_m3', name: 'Cold-Pressed Green Zing', description: 'Fresh organic celery, cucumber, green apple, ginger, lemon zest.', price: 7.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&h=600&q=80', isVegetarian: true },
    ]
  },
  {
    id: 'rest_4',
    name: 'Dolce Velvet Gelateria',
    handle: '@dolcevelvet',
    avatar: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=150&h=150&q=80',
    heroImage: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&h=500&q=80',
    category: 'Desserts',
    rating: 4.95, ratingCount: 380,
    deliveryTimeMin: 15, deliveryFee: 1.50,
    address: '94 Lafayette St, New York, NY',
    isVerified: true, followersCount: 28700,
    bio: 'Artisanal Italian gelato. Churned daily with organic cream & premium ingredients. 🍦💜',
    isOpen: true,
    coordinates: { lat: 40.718, lng: -74.0015 },
    menu: [
      { id: 'd_m1', name: 'Belgian Fudge Bubble Waffle', description: 'Golden bubble waffle, warm Belgian dark chocolate, powdered sugar, toasted hazelnuts.', price: 13.50, category: 'Desserts', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&h=600&q=80', isPopular: true },
      { id: 'd_m2', name: 'Madagascar Vanilla Gelato', description: 'Double-churned gelato, slow-extracted Madagascar vanilla orchids, honeycomb shards.', price: 14.50, category: 'Desserts', image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=600&h=600&q=80', isPopular: true },
      { id: 'd_m3', name: 'Bronte Pistachio Gelato', description: 'Rich Sicilian pistachio paste emulsified into organic sweet milk gelato.', price: 15.50, category: 'Desserts', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&h=600&q=80' },
    ]
  },
  {
    id: 'rest_5',
    name: 'Vesuvius Fire & Pizza',
    handle: '@vesuviusnyc',
    avatar: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=150&h=150&q=80',
    heroImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&h=500&q=80',
    category: 'Pizza',
    rating: 4.9, ratingCount: 1530,
    deliveryTimeMin: 22, deliveryFee: 1.99,
    address: '112 Lafayette St, New York, NY',
    isVerified: true, followersCount: 41300,
    bio: 'Neapolitan sourdough pizza baked at 800°F. No shortcuts. Never. 🍕🔥',
    isOpen: true,
    coordinates: { lat: 40.7198, lng: -74.0001 },
    menu: [
      { id: 'p_m1', name: 'Hot Honey Serrano Pizza', description: 'Blistered sourdough, San Marzano tomato, fior di latte, serrano pepperoni, spicy honey.', price: 18.00, category: 'Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&h=600&q=80', isPopular: true },
      { id: 'p_m2', name: 'White Truffle Mushroom Pizza', description: 'Pecorino cream base, wild oyster & chanterelle mushrooms, fresh thyme, white truffle.', price: 19.50, category: 'Pizza', image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=600&h=600&q=80', isVegetarian: true },
      { id: 'p_m3', name: 'Smash Burger Special', description: 'Double flame-finished angus brisket, vintage cheddar, caramelized onions, Antigravity sauce.', price: 16.50, category: 'Burgers', image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&h=600&q=80', isPopular: true },
    ]
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Demo Comments
// ─────────────────────────────────────────────────────────────────────────────

const makeComments = (dishName: string): Comment[] => [
  { id: 'c1', userId: 'u1', username: 'sarah_eats_nyc', avatar: 'https://i.pravatar.cc/40?img=1', text: `This ${dishName.split(' ')[0]} hits different every single time 🔥`, timestamp: '2h', likes: 127, isLiked: false },
  { id: 'c2', userId: 'u2', username: 'foodie_marcus', avatar: 'https://i.pravatar.cc/40?img=3', text: 'Just ordered this and I cannot stop thinking about it 😭', timestamp: '4h', likes: 89, isLiked: true },
  { id: 'c3', userId: 'u3', username: 'nycfoodscene', avatar: 'https://i.pravatar.cc/40?img=5', text: 'Best thing on the menu, no debate 🙌', timestamp: '6h', likes: 210, isLiked: false },
  { id: 'c4', userId: 'u4', username: 'brooklyn_bites', avatar: 'https://i.pravatar.cc/40?img=7', text: 'Ordered twice this week already 😅 no regrets', timestamp: '8h', likes: 43, isLiked: false },
  { id: 'c5', userId: 'u5', username: 'chef_inspires', avatar: 'https://i.pravatar.cc/40?img=9', text: 'The flavour profile on this is insane. Absolute craft.', timestamp: '10h', likes: 156, isLiked: false },
  { id: 'c6', userId: 'u6', username: 'jasmine.food', avatar: 'https://i.pravatar.cc/40?img=11', text: 'My absolute go-to! Never disappoints ⭐⭐⭐⭐⭐', timestamp: '1d', likes: 72, isLiked: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// Feed Posts — Mix of dish posts and content posts
// ─────────────────────────────────────────────────────────────────────────────

export const FEED_POSTS: FeedPost[] = [
  // 1 — Wolfie Burger: dish post
  {
    id: 'post_1', type: 'dish', restaurant: RESTAURANTS[0],
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&h=900&q=80',
    isVideo: false,
    caption: 'The Classic Smash Burger. Double-stacked. Golden-crusted. Every single bite a moment. 🍔🔥',
    tags: ['#smashburger', '#nyceats', '#burgerlover', '#wolfie'],
    linkedDish: RESTAURANTS[0].menu[0],
    delivery: { available: true, provider: 'Wolfie Delivery', estimatedMinutes: 15, fee: 0 },
    likes: 4820, comments: makeComments('Classic Smash Burger'), shares: 312,
    isLiked: false, isSaved: false, postedAt: '2h ago', postedAtHours: 2,
    location: 'SoHo, NYC',
  },
  // 2 — Neo-Tokyo: dish post
  {
    id: 'post_2', type: 'dish', restaurant: RESTAURANTS[1],
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&h=900&q=80',
    isVideo: false,
    caption: '18 hours of love in every bowl 🍜 Our Signature Tonkotsu is not a meal — it\'s an experience.',
    tags: ['#ramen', '#tonkotsu', '#japanesefood', '#nycramen'],
    linkedDish: RESTAURANTS[1].menu[0],
    delivery: { available: true, provider: 'Wolfie Delivery', estimatedMinutes: 25, fee: 1.99 },
    likes: 3210, comments: makeComments('Tonkotsu Ramen'), shares: 198,
    isLiked: true, isSaved: false, postedAt: '4h ago', postedAtHours: 4,
    location: 'Lower East Side, NYC',
  },
  // 3 — Green Garden: content post (no ordering)
  {
    id: 'post_3', type: 'behind_scenes', restaurant: RESTAURANTS[3],
    image: 'https://images.unsplash.com/photo-1498579397066-22750a3cb424?auto=format&fit=crop&w=800&h=900&q=80',
    isVideo: false,
    caption: 'Sunday morning at the market. Every leaf, every root — sourced with intention 🌱 This is what clean eating looks like before it hits your bowl.',
    tags: ['#farmtotable', '#organic', '#sustainable', '#healthy'],
    delivery: { available: false, provider: '' },
    likes: 1890, comments: makeComments('farm fresh ingredients'), shares: 445,
    isLiked: false, isSaved: true, postedAt: '5h ago', postedAtHours: 5,
    location: 'Union Square Market, NYC',
  },
  // 4 — Truffle Grove: dish post
  {
    id: 'post_4', type: 'dish', restaurant: RESTAURANTS[2],
    image: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&h=900&q=80',
    isVideo: false,
    caption: 'Truffle Tagliolini d\'Oro. 5 grams of freshly shaved black winter truffle on house-milled pasta. This is what luxury tastes like. ✨🍝',
    tags: ['#truffle', '#pasta', '#finedining', '#italian'],
    linkedDish: RESTAURANTS[2].menu[0],
    delivery: { available: true, provider: 'Wolfie Delivery', estimatedMinutes: 35, fee: 4.99 },
    likes: 6540, comments: makeComments('Truffle Tagliolini'), shares: 821,
    isLiked: false, isSaved: true, postedAt: '7h ago', postedAtHours: 7,
    location: 'SoHo, NYC',
  },
  // 5 — Dolce Velvet: dish post
  {
    id: 'post_5', type: 'dish', restaurant: RESTAURANTS[4],
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=800&h=900&q=80',
    isVideo: false,
    caption: 'Warm Belgian fudge bubble waffle + artisanal gelato. The most dangerous dessert in NYC 🧇🍫 You\'ve been warned.',
    tags: ['#dessert', '#gelato', '#waffle', '#sweettooth'],
    linkedDish: RESTAURANTS[4].menu[0],
    delivery: { available: true, provider: 'Wolfie Delivery', estimatedMinutes: 15, fee: 1.50 },
    likes: 9230, comments: makeComments('Bubble Waffle'), shares: 1204,
    isLiked: false, isSaved: false, postedAt: '9h ago', postedAtHours: 9,
    location: 'Tribeca, NYC',
  },
  // 6 — Vesuvius: content post (behind-the-scenes)
  {
    id: 'post_6', type: 'behind_scenes', restaurant: RESTAURANTS[5],
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&h=900&q=80',
    isVideo: false,
    caption: 'The oven is the heart of everything we do. 800°F, 90 seconds, perfection every time. No shortcuts. No freezer. Just fire. 🔥',
    tags: ['#pizzaiolo', '#woodfired', '#craft', '#neapolitan'],
    delivery: { available: false, provider: '' },
    likes: 5120, comments: makeComments('wood fired pizza'), shares: 632,
    isLiked: false, isSaved: false, postedAt: '11h ago', postedAtHours: 11,
    location: 'SoHo, NYC',
  },
  // 7 — Neo-Tokyo: promo post
  {
    id: 'post_7', type: 'promo', restaurant: RESTAURANTS[1],
    image: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=800&h=900&q=80',
    isVideo: false,
    caption: '🎉 TODAY ONLY — Spicy Black Garlic Miso at $14.50 (was $19). Limited bowls available. Order NOW before they run out! ⏰',
    tags: ['#deal', '#limitedoffer', '#ramen', '#nyceats'],
    linkedDish: RESTAURANTS[1].menu[1],
    delivery: { available: true, provider: 'Wolfie Delivery', estimatedMinutes: 25, fee: 1.99 },
    likes: 2140, comments: makeComments('Spicy Miso Ramen'), shares: 987,
    isLiked: false, isSaved: false, postedAt: '12h ago', postedAtHours: 12,
    location: 'Lower East Side, NYC',
  },
  // 8 — Green Garden: dish post
  {
    id: 'post_8', type: 'dish', restaurant: RESTAURANTS[3],
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&h=900&q=80',
    isVideo: false,
    caption: 'Your body deserves the best. Our Harvest Superfood Bowl has everything you need to feel absolutely alive 🥗✨',
    tags: ['#healthy', '#superfood', '#cleaneating', '#vegan'],
    linkedDish: RESTAURANTS[3].menu[0],
    delivery: { available: true, provider: 'Wolfie Delivery', estimatedMinutes: 20, fee: 0.99 },
    likes: 3870, comments: makeComments('Harvest Bowl'), shares: 428,
    isLiked: true, isSaved: true, postedAt: '14h ago', postedAtHours: 14,
    location: 'SoHo, NYC',
  },
  // 9 — Wolfie: content post (new item reveal)
  {
    id: 'post_9', type: 'new_item', restaurant: RESTAURANTS[0],
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&h=900&q=80',
    isVideo: false,
    caption: 'Something new is coming to the menu this Friday 👀 Drop a 🔥 in the comments if you want a hint...',
    tags: ['#comingsoon', '#newmenu', '#wolfie', '#staytuned'],
    delivery: { available: false, provider: '' },
    likes: 7340, comments: makeComments('new burger'), shares: 1102,
    isLiked: false, isSaved: false, postedAt: '18h ago', postedAtHours: 18,
    location: 'SoHo, NYC',
  },
  // 10 — Vesuvius: dish post
  {
    id: 'post_10', type: 'dish', restaurant: RESTAURANTS[5],
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&h=900&q=80',
    isVideo: false,
    caption: 'Hot Honey Serrano 🍕🌶️ The perfect balance of sweet heat and crispy sourdough. One of NYC\'s most talked-about pizzas right now.',
    tags: ['#pizza', '#hothoney', '#serrano', '#nycpizza'],
    linkedDish: RESTAURANTS[5].menu[0],
    delivery: { available: true, provider: 'Wolfie Delivery', estimatedMinutes: 22, fee: 1.99 },
    likes: 11200, comments: makeComments('Hot Honey Pizza'), shares: 2340,
    isLiked: false, isSaved: false, postedAt: '1d ago', postedAtHours: 24,
    location: 'SoHo, NYC',
  },
  // 11 — Truffle Grove: content post
  {
    id: 'post_11', type: 'behind_scenes', restaurant: RESTAURANTS[2],
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&h=900&q=80',
    isVideo: false,
    caption: 'Chef Isabella hand-rolling pasta at 6am. Before the rush, before the noise — just flour, eggs, and craft. This is why every bite matters. 🍝❤️',
    tags: ['#chef', '#pastachef', '#handmade', '#finedining'],
    delivery: { available: false, provider: '' },
    likes: 4450, comments: makeComments('handmade pasta'), shares: 892,
    isLiked: true, isSaved: false, postedAt: '1d ago', postedAtHours: 26,
    location: 'SoHo, NYC',
  },
  // 12 — Dolce: content post
  {
    id: 'post_12', type: 'behind_scenes', restaurant: RESTAURANTS[4],
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&h=900&q=80',
    isVideo: false,
    caption: 'A peek into our gelato lab 🍦 Micro-batch churning, real ingredients, no shortcuts. Pierre has been perfecting this recipe for 12 years.',
    tags: ['#gelato', '#artisan', '#behindthescenes', '#foodcraft'],
    delivery: { available: false, provider: '' },
    likes: 6780, comments: makeComments('artisan gelato'), shares: 1433,
    isLiked: false, isSaved: false, postedAt: '2d ago', postedAtHours: 48,
    location: 'Tribeca, NYC',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Stories
// ─────────────────────────────────────────────────────────────────────────────

export const STORIES = RESTAURANTS.map((r, i) => ({
  id: `story_${r.id}`,
  restaurant: r,
  isSeen: i > 2,
  segments: [
    {
      id: `seg_${r.id}_1`,
      image: r.heroImage,
      caption: r.menu[0]?.name || r.name,
      ctaText: r.menu[0] ? 'Order Now' : undefined,
      ctaItem: r.menu[0],
      duration: 5,
      gradient: 'from-black/80 via-transparent to-black/60',
    },
    ...(r.menu[1] ? [{
      id: `seg_${r.id}_2`,
      image: r.menu[1].image,
      caption: r.menu[1].name,
      ctaText: 'Order Now',
      ctaItem: r.menu[1],
      duration: 5,
      gradient: 'from-black/80 via-transparent to-black/60',
    }] : []),
  ]
}));

// ─────────────────────────────────────────────────────────────────────────────
// Demo User
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_USER: UserProfile = {
  id: 'user_me',
  username: 'foodlover_nyc',
  fullName: 'Alex Johnson',
  avatar: 'https://i.pravatar.cc/150?img=15',
  bio: 'NYC food explorer 🍕🍜 | Always hungry | Wolfie fan',
  followingIds: ['rest_0', 'rest_1', 'rest_4'],
  savedPostIds: ['post_3', 'post_4', 'post_8'],
  likedPostIds: ['post_2', 'post_8', 'post_11'],
  postsCount: 0,
  followersCount: 248,
  followingCount: 3,
};
