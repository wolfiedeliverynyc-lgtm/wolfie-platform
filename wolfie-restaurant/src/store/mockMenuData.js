// ─── MASTER INGREDIENTS LIST ────────────────────────────
export const MOCK_INGREDIENTS = [
  { id: 'i1', name: 'Beef Patty', allergens: [], calories: 240, dietaryTags: ['halal'], inStock: true },
  { id: 'i2', name: 'Brioche Bun', allergens: ['gluten', 'dairy'], calories: 150, dietaryTags: [], inStock: true },
  { id: 'i3', name: 'Cheddar Cheese', allergens: ['dairy'], calories: 80, dietaryTags: [], inStock: true },
  { id: 'i4', name: 'Applewood Bacon', allergens: [], calories: 95, dietaryTags: [], inStock: true },
  { id: 'i5', name: 'Lettuce', allergens: [], calories: 5, dietaryTags: ['vegan', 'halal'], inStock: true },
  { id: 'i6', name: 'Pickles', allergens: [], calories: 5, dietaryTags: ['vegan', 'halal'], inStock: true },
  { id: 'i7', name: 'Onions', allergens: [], calories: 5, dietaryTags: ['vegan', 'halal'], inStock: true },
  { id: 'i8', name: 'Roma Tomatoes', allergens: [], calories: 10, dietaryTags: ['vegan', 'halal'], inStock: true },
  { id: 'i9', name: 'Spicy Mayo Sauce', allergens: ['egg'], calories: 80, dietaryTags: [], inStock: true },
  { id: 'i10', name: 'Gluten-Free Bun', allergens: [], calories: 130, dietaryTags: ['gluten_free'], inStock: true },
];

// ─── MODIFIER GROUPS ────────────────────────────────────
export const MOCK_MODIFIER_GROUPS = [
  { 
    id: 'g1', 
    name: 'Choose Bread', 
    minSelections: 1, 
    maxSelections: 1, 
    isRequired: true,
    options: [
      { id: 'o1_1', name: 'Brioche Bun', price: 0, calories: 150, available: true, isDefault: true },
      { id: 'o1_2', name: 'Potato Bun', price: 0, calories: 140, available: true, isDefault: false },
      { id: 'o1_3', name: 'Gluten-Free Bun', price: 2.0, calories: 130, available: true, isDefault: false }
    ]
  },
  { 
    id: 'g2', 
    name: 'Choose Fries', 
    minSelections: 1, 
    maxSelections: 1, 
    isRequired: true,
    options: [
      { id: 'o2_1', name: 'Regular Fries', price: 0, calories: 300, available: true, isDefault: true },
      { id: 'o2_2', name: 'Curly Fries', price: 1.0, calories: 320, available: true, isDefault: false },
      { id: 'o2_3', name: 'Sweet Potato Fries', price: 2.0, calories: 290, available: true, isDefault: false }
    ]
  },
  { 
    id: 'g3', 
    name: 'Choose Sauce', 
    minSelections: 1, 
    maxSelections: 3, 
    isRequired: false,
    options: [
      { id: 'o3_1', name: 'BBQ Sauce', price: 0, calories: 50, available: true, isDefault: false },
      { id: 'o3_2', name: 'Spicy Mayo', price: 0, calories: 80, available: true, isDefault: false },
      { id: 'o3_3', name: 'Truffle Aioli', price: 1.0, calories: 95, available: true, isDefault: false }
    ]
  },
  { 
    id: 'g4', 
    name: 'Add Extras', 
    minSelections: 0, 
    maxSelections: 5, 
    isRequired: false,
    options: [
      { id: 'o4_1', name: 'Applewood Bacon', price: 2.0, calories: 95, available: true, isDefault: false },
      { id: 'o4_2', name: 'Cheddar Cheese', price: 1.0, calories: 80, available: true, isDefault: false },
      { id: 'o4_3', name: 'Double Beef Patty', price: 4.0, calories: 240, available: true, isDefault: false }
    ]
  },
  {
    id: 'g5',
    name: 'Choose Size',
    minSelections: 1,
    maxSelections: 1,
    isRequired: true,
    options: [
      { id: 'o5_1', name: 'Regular Size', price: 0, calories: 0, available: true, isDefault: true },
      { id: 'o5_2', name: 'Large Size', price: 1.5, calories: 150, available: true, isDefault: false }
    ]
  },
  {
    id: 'g_drinks',
    name: 'Beverage Choice',
    minSelections: 1,
    maxSelections: 1,
    isRequired: true,
    options: [
      { id: 'od_1', name: 'Coca Cola', price: 0, calories: 140, available: true, isDefault: true },
      { id: 'od_2', name: 'Diet Coke', price: 0, calories: 0, available: true, isDefault: false },
      { id: 'od_3', name: 'Craft Lemonade', price: 1.0, calories: 120, available: true, isDefault: false }
    ]
  }
];

// ─── INITIAL MENU ITEMS (Normalized) ───────────────────
export const INITIAL_MENU_ITEMS = [
  { 
    id: 'm1', 
    name: 'Alpha Wolf Burger', 
    category: 'Burgers', 
    price: 14.99,
    sizes: [],
    calories: 850, 
    prepMins: 12, 
    available: true, 
    allergens: ['gluten', 'dairy'], 
    image: '🍔', 
    description: 'Signature double smash beef burger with house melted cheese and special sauce.',
    seoSlug: 'alpha-wolf-burger',
    dietaryTags: ['halal'],
    pairings: ['m8', 'm11'],
    ingredients: [
      { ingredientId: 'i1', removable: false, extraPrice: 4.0, defaultQuantity: 2 },
      { ingredientId: 'i2', removable: true, extraPrice: 2.0, defaultQuantity: 1 },
      { ingredientId: 'i3', removable: true, extraPrice: 1.0, defaultQuantity: 1 },
      { ingredientId: 'i5', removable: true, extraPrice: 0, defaultQuantity: 1 },
      { ingredientId: 'i6', removable: true, extraPrice: 0, defaultQuantity: 1 },
      { ingredientId: 'i7', removable: true, extraPrice: 0, defaultQuantity: 1 },
      { ingredientId: 'i9', removable: true, extraPrice: 0, defaultQuantity: 1 }
    ],
    modifierGroupIds: ['g1', 'g3', 'g4']
  },
  { 
    id: 'm2', 
    name: 'Spicy Ramen Bowl', 
    category: 'Bowls', 
    price: 16.50,
    sizes: [],
    calories: 720, 
    prepMins: 15, 
    available: true, 
    allergens: ['gluten', 'soy'], 
    image: '🍜', 
    description: 'Rich tonkotsu broth, spicy garlic tare, handcut noodles, chashu pork, soft egg.',
    seoSlug: 'spicy-ramen-bowl',
    dietaryTags: ['spicy'],
    pairings: ['m11'],
    ingredients: [],
    modifierGroupIds: ['g5']
  },
  { 
    id: 'm3', 
    name: 'Margherita Pizza', 
    category: 'Pizza', 
    price: 12.00,
    sizes: [],
    calories: 680, 
    prepMins: 18, 
    available: true, 
    allergens: ['gluten', 'dairy'], 
    image: '🍕', 
    description: 'San Marzano tomatoes, fresh mozzarella balls, sweet basil leaves, drizzle of olive oil.',
    seoSlug: 'margherita-pizza',
    dietaryTags: ['vegetarian'],
    pairings: ['m11'],
    ingredients: [],
    modifierGroupIds: []
  },
  { 
    id: 'm8', 
    name: 'Loaded Fries', 
    category: 'Sides', 
    price: 8.99,
    sizes: [],
    calories: 650, 
    prepMins: 7, 
    available: true, 
    allergens: ['dairy'], 
    image: '🍟', 
    description: 'Crispy golden fries topped with cheese sauce, crispy bacon, sour cream, and fresh chives.',
    seoSlug: 'loaded-fries',
    dietaryTags: [],
    pairings: ['m1'],
    ingredients: [
      { ingredientId: 'i3', removable: true, extraPrice: 1.0, defaultQuantity: 1 },
      { ingredientId: 'i4', removable: true, extraPrice: 2.0, defaultQuantity: 1 }
    ],
    modifierGroupIds: []
  },
  { 
    id: 'm10', 
    name: 'Wolf Pack Combo Meal', 
    category: 'Combos', 
    price: 21.99,
    sizes: [],
    calories: 1200, 
    prepMins: 14, 
    available: true, 
    allergens: ['gluten', 'dairy'], 
    image: '🍱', 
    description: 'Upgrade your hunger. Includes choice of any signature burger, side, and refreshing beverage.',
    seoSlug: 'wolf-pack-combo',
    dietaryTags: [],
    pairings: [],
    isCombo: true,
    comboSlots: [
      { id: 'slot1', name: 'Select Main Burger', allowedCategories: ['Burgers'], isRequired: true, upgradePrice: 0, defaultProductId: 'm1' },
      { id: 'slot2', name: 'Select Side', allowedCategories: ['Sides'], isRequired: true, upgradePrice: 0, defaultProductId: 'm8' },
      { id: 'slot3', name: 'Select Beverage', allowedCategories: ['Drinks'], isRequired: true, upgradePrice: 0, defaultProductId: 'm11' }
    ],
    ingredients: [],
    modifierGroupIds: []
  },
  { 
    id: 'm11', 
    name: 'Coca Cola', 
    category: 'Drinks', 
    price: 2.50,
    sizes: [],
    calories: 140, 
    prepMins: 2, 
    available: true, 
    allergens: [], 
    image: '🥤', 
    description: 'Ice cold refreshing classic Coca Cola canned soda.',
    seoSlug: 'coca-cola',
    dietaryTags: ['vegan', 'halal'],
    pairings: ['m1'],
    ingredients: [],
    modifierGroupIds: ['g5']
  }
];

export const INITIAL_CATEGORIES = ['Burgers', 'Bowls', 'Pizza', 'Sides', 'Combos', 'Drinks'];

// ─── CONDITIONAL MODIFIERS ──────────────────────────────
export const MOCK_CONDITIONAL_MODIFIERS = [
  {
    id: 'c1',
    parentOptionId: 'o1_3', // Gluten-Free Bun selected
    childModifierGroupId: 'g3', // Show Sauce modifier group
    priceModifier: 1.0 // Surcharges all sauce selections by $1.00
  },
  {
    id: 'c2',
    parentOptionId: 'o5_2', // Large size selected
    childModifierGroupId: 'g_drinks', // Increases beverage modifiers
    priceModifier: 1.50
  }
];

// ─── VERSION HISTORY ────────────────────────────────────
export const INITIAL_VERSION_HISTORY = [
  {
    id: 'v1',
    versionNumber: 1,
    publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'published',
    categories: INITIAL_CATEGORIES,
    menuItems: INITIAL_MENU_ITEMS,
    modifierGroups: MOCK_MODIFIER_GROUPS,
    conditionalModifiers: MOCK_CONDITIONAL_MODIFIERS
  }
];

// ─── MOCK ORDERS CREATION ───────────────────────────────
export function createMockOrder(id, status, minutesAgo) {
  const items = [
    { menuItemId: 'm1', name: 'Alpha Wolf Burger', quantity: 1, price: 14.99, modifiers: [{ name: 'Brioche Bun', price: 0 }, { name: 'Cheddar Cheese', price: 1.0 }], allergens: ['gluten', 'dairy'] }
  ];
  const driverNames = ['Alex M.', 'Jordan K.', 'Taylor R.', 'Sam P.'];
  const hasDriver = !['new_order', 'cancelled', 'completed'].includes(status);
  const driver = hasDriver ? {
    name: driverNames[Math.floor(Math.random() * driverNames.length)],
    eta: Math.max(1, Math.floor(Math.random() * 8) + 2), // 2 to 9 mins
    status: 'in_transit'
  } : null;

  return {
    id,
    orderNumber: '#' + (40000 + Math.floor(Math.random() * 10000)),
    status,
    items,
    subtotal: 15.99,
    customerName: 'Sam W.',
    customerAddress: '234 Bedford Ave, Brooklyn',
    customerPhone: '+1 (347) 555-1234',
    placedAt: new Date(Date.now() - minutesAgo * 60000).toISOString(),
    acceptedAt: new Date(Date.now() - (minutesAgo - 1) * 60000).toISOString(),
    estimatedPrepMins: 12,
    priority: 'normal',
    slaDeadline: new Date(Date.now() + 20 * 60000).toISOString(),
    driver
  };
}

// ─── REVIEWS & RATINGS ──────────────────────────────────
export const MOCK_REVIEWS = [
  {
    id: 'r1',
    customerName: 'Sarah K.',
    rating: 5,
    date: new Date(Date.now() - 4 * 3600000).toISOString(),
    comment: 'The Alpha Wolf Burger was out of this world! Piping hot and extremely juicy. Best burger in Brooklyn!',
    items: ['Alpha Wolf Burger', 'Loaded Fries'],
    reply: null,
    categoryRatings: { quality: 5, speed: 5, accuracy: 5 }
  },
  {
    id: 'r2',
    customerName: 'Marcus T.',
    rating: 2,
    date: new Date(Date.now() - 12 * 3600000).toISOString(),
    comment: 'Food tasted great but it arrived almost 25 minutes late. The loaded fries were cold and soggy by then.',
    items: ['Loaded Fries', 'Coca Cola'],
    reply: null,
    categoryRatings: { quality: 4, speed: 1, accuracy: 5 }
  },
  {
    id: 'r3',
    customerName: 'Amanda L.',
    rating: 4,
    date: new Date(Date.now() - 24 * 3600000).toISOString(),
    comment: 'Ramen was delicious and packed perfectly. However, they forgot to put the extra Cheddar Cheese I ordered for my combo burger.',
    items: ['Spicy Ramen Bowl', 'Alpha Wolf Burger'],
    reply: 'Hi Amanda, so sorry about the missing cheese! We have credited your account with a $5 discount coupon. Hope to serve you again soon!',
    categoryRatings: { quality: 5, speed: 4, accuracy: 3 }
  },
  {
    id: 'r4',
    customerName: 'Derrick M.',
    rating: 1,
    date: new Date(Date.now() - 36 * 3600000).toISOString(),
    comment: 'Absolute disaster. Order was completely incorrect. I ordered a vegetarian Margherita Pizza but received a pork ramen bowl instead. I am vegetarian!',
    items: ['Margherita Pizza'],
    reply: null,
    categoryRatings: { quality: 1, speed: 3, accuracy: 1 }
  },
  {
    id: 'r5',
    customerName: 'Elena P.',
    rating: 5,
    date: new Date(Date.now() - 48 * 3600000).toISOString(),
    comment: 'Incredibly fast delivery and the packaging is so futuristic! Love the yellow branding. Pizza was still steaming hot!',
    items: ['Margherita Pizza', 'Coca Cola'],
    reply: 'Thank you Elena! We pride ourselves on fast dispatch. Enjoy!',
    categoryRatings: { quality: 5, speed: 5, accuracy: 5 }
  }
];

// ─── STATS, METRICS, AND TIMELINE ───────────────────────
export const MOCK_METRICS = { 
  ordersToday: 47, 
  revenueToday: 1284.50, 
  avgPrepTime: 11.3, 
  slaPerfPercent: 94, 
  cancellationRate: 2.1, 
  activeDriversInbound: 3, 
  currentQueueLength: 6, 
  peakHour: '12:00–13:00', 
  itemsSold: 82, 
  avgOrderValue: 27.33 
};

export const MOCK_HOURLY_DATA = [
  { h: '8AM', orders: 2, revenue: 54 },
  { h: '9AM', orders: 5, revenue: 137 },
  { h: '10AM', orders: 8, revenue: 219 },
  { h: '11AM', orders: 12, revenue: 328 },
  { h: '12PM', orders: 18, revenue: 492 },
  { h: '1PM', orders: 15, revenue: 410 }
];

export const MOCK_TOP_ITEMS = [
  { name: 'Alpha Wolf Burger', sold: 18, revenue: 269.82 }
];

export const MOCK_ACTIVITY = [
  { id: 'a1', type: 'new_order', message: 'New order #40123 received', time: new Date(Date.now() - 60000).toISOString(), icon: '📥' }
];

export const MOCK_SUPPORT_TICKETS = [
  { id: 't1', type: 'driver_no_show', orderId: 'o1', message: 'Driver has not arrived after 15 minutes', status: 'open', time: new Date(Date.now() - 600000).toISOString() }
];

// ─── API.JS FALLBACK DATA ────────────────────────────────
export const MOCK_DASHBOARD = {
  restaurant_name: "Abu Ali's Kitchen",
  is_open: true,
  today: { revenue: 1245.00, orders: 45, avg_prep: 14 },
  changes: { revenue: '+12.5%', orders: '+5.2%', avg_prep: '-2.1 min' },
  recent_orders: [
    { id: '#1042', customer: 'Sarah M.', items: '2x Truffle Burger, 1x Fries', total: 42.50, status: 'preparing', created_at: '10 min ago' },
    { id: '#1041', customer: 'John D.', items: '1x Spicy Chicken Sandwich', total: 18.00, status: 'ready', created_at: '25 min ago' },
    { id: '#1040', customer: 'Emma W.', items: '3x Veggie Wrap, 2x Smoothie', total: 55.00, status: 'delivered', created_at: '45 min ago' },
    { id: '#1039', customer: 'Michael R.', items: '1x Classic Burger', total: 15.00, status: 'delivered', created_at: '1 hr ago' },
    { id: '#1038', customer: 'Aisha K.', items: '2x Falafel Wrap', total: 22.50, status: 'delivered', created_at: '1.5 hr ago' },
  ]
};

export const MOCK_STATS = {
  weekly: [
    { day: 'Mon', revenue: 4200, orders: 135 },
    { day: 'Tue', revenue: 3800, orders: 118 },
    { day: 'Wed', revenue: 5100, orders: 162 },
    { day: 'Thu', revenue: 4500, orders: 140 },
    { day: 'Fri', revenue: 6800, orders: 210 },
    { day: 'Sat', revenue: 7200, orders: 235 },
    { day: 'Sun', revenue: 5900, orders: 188 },
  ],
  top_items: [
    { name: 'Truffle Burger', orders: 142, revenue: 2556 },
    { name: 'Falafel Wrap', orders: 98, revenue: 1078 },
    { name: 'Wolf Fries', orders: 85, revenue: 467 },
    { name: 'Spicy Chicken', orders: 76, revenue: 1140 },
  ],
  retention: { wolfie_direct: 68, third_party: 12 },
};
