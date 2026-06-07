import { create } from 'zustand';

// ─── Master Ingredients List ────────────────────────────
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

// ─── Modifier Groups ────────────────────────────────────
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

// ─── Mock Menu Items (Normalized) ───────────────────────
const INITIAL_MENU_ITEMS = [
  { 
    id: 'm1', 
    name: 'Alpha Wolf Burger', 
    category: 'Burgers', 
    price: 14.99, 
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

const INITIAL_CATEGORIES = ['Burgers', 'Bowls', 'Pizza', 'Sides', 'Combos', 'Drinks'];

// ─── Conditional Modifiers ──────────────────────────────
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

// ─── Version History ────────────────────────────────────
const INITIAL_VERSION_HISTORY = [
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

// ─── Mock Orders Data ───────────────────────────────────
function createMockOrder(id, status, minutesAgo) {
  const items = [
    { menuItemId: 'm1', name: 'Alpha Wolf Burger', quantity: 1, price: 14.99, modifiers: [{ name: 'Brioche Bun', price: 0 }, { name: 'Cheddar Cheese', price: 1.0 }], allergens: ['gluten', 'dairy'] }
  ];
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
  };
}

// ─── Unified Zustand Store ──────────────────────────────
export const useRestaurantStore = create((set, get) => ({
  // Navigation
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  // Restaurant details
  restaurant: { name: 'Wolfie Burgers', zone: 'Williamsburg, Brooklyn', status: 'open', rating: 4.8, totalOrders: 2847 },

  // Orders
  orders: [
    createMockOrder('o1', 'new_order', 1),
    createMockOrder('o2', 'preparing', 5),
    createMockOrder('o3', 'ready_for_pickup', 10),
  ],
  updateOrderStatus: (orderId, newStatus) => set(s => ({
    orders: s.orders.map(o => o.id === orderId ? { ...o, status: newStatus, ...(newStatus === 'accepted' ? { acceptedAt: new Date().toISOString() } : {}) } : o),
  })),

  // ─── Menu Commerce Operations ─────────────────────────
  menuCategories: INITIAL_CATEGORIES,
  menuItems: INITIAL_MENU_ITEMS,
  modifierGroups: MOCK_MODIFIER_GROUPS,
  conditionalModifiers: MOCK_CONDITIONAL_MODIFIERS,
  ingredients: MOCK_INGREDIENTS,

  // Version Control systems
  menuVersions: INITIAL_VERSION_HISTORY,
  isDraftDirty: false,
  publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  activeVersion: 1,

  // Actions
  addCategory: (category) => set(s => {
    if (s.menuCategories.includes(category)) return {};
    return { 
      menuCategories: [...s.menuCategories, category],
      isDraftDirty: true
    };
  }),
  
  deleteCategory: (category) => set(s => ({
    menuCategories: s.menuCategories.filter(c => c !== category),
    menuItems: s.menuItems.filter(i => i.category !== category),
    isDraftDirty: true
  })),

  addMenuProduct: (product) => set(s => {
    const newId = product.id || ('m' + Date.now() + '-' + Math.floor(Math.random() * 1000000));
    
    // Resolve ingredient objects if passed as text strings
    let resolvedIngredients = product.ingredients || [];
    let updatedIngredientsList = [...s.ingredients];
    
    if (product.rawIngredientsTextList) {
      resolvedIngredients = product.rawIngredientsTextList.map(ingName => {
        const trimmed = ingName.trim();
        // Check case-insensitive match in current store ingredients
        let existing = updatedIngredientsList.find(i => i.name.toLowerCase() === trimmed.toLowerCase());
        if (!existing) {
          // Check substring match
          existing = updatedIngredientsList.find(i => i.name.toLowerCase().includes(trimmed.toLowerCase()));
        }
        
        if (existing) {
          return { ingredientId: existing.id, removable: true, extraPrice: 1.0, defaultQuantity: 1 };
        } else {
          // Dynamically create a new master ingredient
          const newIngId = 'i' + (updatedIngredientsList.length + 1) + '-' + Math.floor(Math.random() * 1000);
          const newIng = {
            id: newIngId,
            name: trimmed,
            allergens: [],
            calories: 100,
            dietaryTags: [],
            inStock: true
          };
          updatedIngredientsList.push(newIng);
          return { ingredientId: newIngId, removable: true, extraPrice: 1.0, defaultQuantity: 1 };
        }
      });
    }

    const finalProduct = { ...product, id: newId, ingredients: resolvedIngredients };
    delete finalProduct.rawIngredientsTextList;

    return {
      menuItems: [...s.menuItems, finalProduct],
      ingredients: updatedIngredientsList,
      isDraftDirty: true
    };
  }),

  updateMenuProduct: (productId, updates) => set(s => ({
    menuItems: s.menuItems.map(item => item.id === productId ? { ...item, ...updates } : item),
    isDraftDirty: true
  })),

  deleteMenuProduct: (productId) => set(s => ({
    menuItems: s.menuItems.filter(item => item.id !== productId),
    isDraftDirty: true
  })),

  toggleItemAvailability: (itemId) => set(s => ({
    menuItems: s.menuItems.map(i => i.id === itemId ? { ...i, available: !i.available } : i),
    isDraftDirty: true
  })),

  addModifierGroup: (group) => set(s => ({
    modifierGroups: [...s.modifierGroups, { id: 'g' + Date.now(), ...group }],
    isDraftDirty: true
  })),

  updateModifierGroup: (groupId, updates) => set(s => ({
    modifierGroups: s.modifierGroups.map(g => g.id === groupId ? { ...g, ...updates } : g),
    isDraftDirty: true
  })),

  // Version lock, publish & rollback actions
  publishMenu: (versionDescription) => set(s => {
    const nextVer = s.activeVersion + 1;
    const newVersion = {
      id: 'v' + Date.now(),
      versionNumber: nextVer,
      publishedAt: new Date().toISOString(),
      status: 'published',
      description: versionDescription || `Version ${nextVer} release`,
      categories: s.menuCategories,
      menuItems: s.menuItems,
      modifierGroups: s.modifierGroups,
      conditionalModifiers: s.conditionalModifiers
    };
    return {
      menuVersions: [newVersion, ...s.menuVersions],
      activeVersion: nextVer,
      publishedAt: newVersion.publishedAt,
      isDraftDirty: false
    };
  }),

  rollbackVersion: (versionId) => set(s => {
    const version = s.menuVersions.find(v => v.id === versionId);
    if (!version) return {};
    return {
      menuCategories: version.categories,
      menuItems: version.menuItems,
      modifierGroups: version.modifierGroups,
      conditionalModifiers: version.conditionalModifiers,
      activeVersion: version.versionNumber,
      publishedAt: version.publishedAt,
      isDraftDirty: false
    };
  }),

  // AI Alerts
  aiAlerts: [
    { id:'ai1', title:'Burger Station Overload', message:'Predicted in 12 minutes based on incoming order velocity.', severity:'warning', time: new Date().toISOString() }
  ],
  dismissAiAlert: (id) => set(s => ({ aiAlerts: s.aiAlerts.filter(a => a.id !== id) })),

  // KDS Mode
  kdsMode: false,
  toggleKds: () => set(s => ({ kdsMode: !s.kdsMode })),

  // Support Queue
  supportTickets: [
    { id:'t1', type:'driver_no_show', orderId:'o1', message:'Driver has not arrived after 15 minutes', status:'open', time: new Date(Date.now()-600000).toISOString() }
  ],
  addSupportTicket: (ticket) => set(s => ({ supportTickets: [ticket, ...s.supportTickets] })),
  isSupportModalOpen: false,
  setSupportModalOpen: (open) => set({ isSupportModalOpen: open }),

  // Metrics (Static summaries)
  metrics: { ordersToday: 47, revenueToday: 1284.50, avgPrepTime: 11.3, slaPerfPercent: 94, cancellationRate: 2.1, activeDriversInbound: 3, currentQueueLength: 6, peakHour: '12:00–13:00', itemsSold: 82, avgOrderValue: 27.33 },
  hourlyData: [{h:'8AM',orders:2,revenue:54},{h:'9AM',orders:5,revenue:137},{h:'10AM',orders:8,revenue:219},{h:'11AM',orders:12,revenue:328},{h:'12PM',orders:18,revenue:492},{h:'1PM',orders:15,revenue:410}],
  topItems: [{ name:'Alpha Wolf Burger', sold:18, revenue:269.82 }],

  activity: [
    { id:'a1', type:'new_order', message:'New order #40123 received', time: new Date(Date.now()-60000).toISOString(), icon:'📥' }
  ],
  addActivity: (act) => set(s => ({ activity: [act, ...s.activity].slice(0, 30) })),
  
  // ─── Onboarding & Finance ─────────────────────────────
  onboarding: {
    status: 'loading',
    completedSteps: 0,
    totalSteps: 6,
    nextStep: null,
    aiPlan: 'none',
  },
  setOnboarding: (data) => set(s => ({ onboarding: { ...s.onboarding, ...data } })),

  finance: {
    balance: { available_balance: 0, pending_balance: 0, lifetime_earned: 0 },
    transactions: [],
    payouts: [],
    aiSubscription: null,
  },
  setFinance: (data) => set(s => ({ finance: { ...s.finance, ...data } })),

  settings: { autoAccept: false, prepTimeDefault: 15, pauseOrders: false, soundAlerts: true, deliveryRadius: 5 },
  updateSettings: (updates) => set(s => ({ settings: { ...s.settings, ...updates } })),
}));
