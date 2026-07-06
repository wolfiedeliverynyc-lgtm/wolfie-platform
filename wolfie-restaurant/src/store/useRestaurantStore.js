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

export function mapBackendOrderToClient(order) {
  if (!order) return null;
  const items = Array.isArray(order.items) ? order.items : [];
  const placedAt = order.created_at || new Date().toISOString();
  const slaDeadline = new Date(new Date(placedAt).getTime() + 20 * 60000).toISOString();

  return {
    id: order.id,
    orderNumber: '#' + order.id.slice(0, 4).toUpperCase(),
    status: order.status === 'pending' ? 'new_order' : order.status,
    items: items.map(item => ({
      menuItemId: item.id || item.menu_item_id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      modifiers: item.modifiers || [],
      allergens: item.allergens || []
    })),
    subtotal: order.subtotal || order.total || 0,
    customerName: order.customer ? order.customer.full_name : 'Guest',
    customerAddress: order.delivery_address || '',
    customerPhone: order.customer ? order.customer.phone : '',
    placedAt: placedAt,
    estimatedPrepMins: order.eta_minutes || 15,
    priority: order.priority || 'normal',
    slaDeadline: slaDeadline,
    driver: order.driver ? {
      name: order.driver.full_name || order.driver.name || 'Driver',
      eta: order.eta_minutes || 10,
      status: 'assigned'
    } : null
  };
}

// ─── Unified Zustand Store ──────────────────────────────
export const useRestaurantStore = create((set, get) => ({
  // Navigation
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  // Restaurant details
  restaurant: { 
    name: 'Wolfie Burgers', 
    zone: 'Williamsburg, Brooklyn', 
    status: 'open', 
    rating: 4.8, 
    totalOrders: 2847,
    logo: '/assets/restaurant_logo_wendys.png',
    heroImage: '/assets/restaurant_cover_wendys.png',
    description: 'Signature double smash beef burgers, loaded fries, and refreshing craft drinks.',
    address: '234 Bedford Ave, Brooklyn, NY 11249',
    latitude: 36.8990,
    longitude: 8.4410,
    operatingHours: {
      mon: { open: '10:00', close: '23:00' },
      tue: { open: '10:00', close: '23:00' },
      wed: { open: '10:00', close: '23:00' },
      thu: { open: '10:00', close: '23:00' },
      fri: { open: '10:00', close: '23:00' },
      sat: { open: '10:00', close: '23:00' },
      sun: { open: '10:00', close: '23:00' }
    }
  },

  // Orders
  orders: [],
  updateOrderStatus: async (orderId, newStatus) => {
    set(s => ({
      orders: s.orders.map(o => o.id === orderId ? { ...o, status: newStatus, ...(newStatus === 'accepted' ? { acceptedAt: new Date().toISOString() } : {}) } : o),
    }));
    try {
      const { ordersApi } = await import('../api');
      if (newStatus === 'accepted') {
        await ordersApi.acceptOrder(orderId);
      } else {
        await ordersApi.updateStatus(orderId, newStatus);
      }
    } catch (err) {
      console.error('Failed to update order status on backend:', err);
    }
  },

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

  addMenuProduct: async (product) => {
    try {
      const { menuApi } = await import('../api');
      const res = await menuApi.addItem({
        name: product.name,
        price: parseFloat(product.price),
        category: product.category,
        description: product.description || '',
        image_url: product.image || '',
        is_available: product.available !== undefined ? product.available : true
      });
      
      set(s => ({
        menuItems: [...s.menuItems, { 
          id: res.id,
          name: product.name,
          price: parseFloat(product.price),
          category: product.category,
          description: product.description || '',
          image: product.image || '',
          available: product.available !== undefined ? product.available : true,
          sizes: []
        }],
        isDraftDirty: false
      }));
    } catch (err) {
      console.error('Failed to add menu item to backend:', err);
    }
  },

  updateMenuProduct: async (productId, updates) => {
    set(s => ({
      menuItems: s.menuItems.map(item => item.id === productId ? { ...item, ...updates } : item),
      isDraftDirty: true
    }));
    try {
      const { menuApi } = await import('../api');
      const backendUpdates = {};
      if (updates.name !== undefined) backendUpdates.name = updates.name;
      if (updates.price !== undefined) backendUpdates.price = parseFloat(updates.price);
      if (updates.category !== undefined) backendUpdates.category = updates.category;
      if (updates.description !== undefined) backendUpdates.description = updates.description;
      if (updates.image !== undefined) backendUpdates.image_url = updates.image;
      if (updates.available !== undefined) backendUpdates.is_available = updates.available;

      if (Object.keys(backendUpdates).length > 0) {
        await menuApi.updateItem(productId, backendUpdates);
      }
    } catch (err) {
      console.error('Failed to update menu item on backend:', err);
    }
  },

  // ─── Size Variant Operations ────────────────────────────────
  /**
   * Add a new size variant to a menu product.
   */
  addSize: async (productId, sizeObj) => {
    let updatedSizes = [];
    set(s => {
      const item = s.menuItems.find(i => i.id === productId);
      if (!item) return {};
      const newSize = {
        id: 'size_' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        name: sizeObj.name || 'New Size',
        price: sizeObj.price || 0,
        available: sizeObj.available !== undefined ? sizeObj.available : true,
        prepMins: sizeObj.prepMins || 0,
        isDefault: sizeObj.isDefault || false,
      };
      const sizes = [...(item.sizes || []), newSize];
      // Ensure only one default size
      updatedSizes = sizes.map(sz => ({
        ...sz,
        isDefault: sz.isDefault && sz.id === newSize.id
      }));
      return {
        menuItems: s.menuItems.map(i => i.id === productId ? { ...i, sizes: updatedSizes } : i),
        isDraftDirty: true
      };
    });
    try {
      const { menuApi } = await import('../api');
      await menuApi.updateItem(productId, { sizes: updatedSizes });
    } catch (err) {
      console.error('Failed to sync added size to backend:', err);
    }
  },

  /**
   * Update an existing size variant.
   */
  updateSize: async (productId, sizeId, updates) => {
    let updatedSizes = [];
    set(s => {
      const item = s.menuItems.find(i => i.id === productId);
      if (!item) return {};
      updatedSizes = (item.sizes || []).map(sz => {
        if (sz.id !== sizeId) return sz;
        return { ...sz, ...updates };
      });
      return {
        menuItems: s.menuItems.map(i => i.id === productId ? { ...i, sizes: updatedSizes } : i),
        isDraftDirty: true
      };
    });
    try {
      const { menuApi } = await import('../api');
      await menuApi.updateItem(productId, { sizes: updatedSizes });
    } catch (err) {
      console.error('Failed to sync updated size to backend:', err);
    }
  },

  /**
   * Delete a size variant.
   */
  deleteSize: async (productId, sizeId) => {
    let updatedSizes = [];
    set(s => {
      const item = s.menuItems.find(i => i.id === productId);
      if (!item) return {};
      updatedSizes = (item.sizes || []).filter(sz => sz.id !== sizeId);
      return {
        menuItems: s.menuItems.map(i => i.id === productId ? { ...i, sizes: updatedSizes } : i),
        isDraftDirty: true
      };
    });
    try {
      const { menuApi } = await import('../api');
      await menuApi.updateItem(productId, { sizes: updatedSizes });
    } catch (err) {
      console.error('Failed to sync deleted size to backend:', err);
    }
  },

  /**
   * Set a size as the default for a product (only one default allowed).
   */
  setDefaultSize: async (productId, sizeId) => {
    let updatedSizes = [];
    set(s => {
      const item = s.menuItems.find(i => i.id === productId);
      if (!item) return {};
      updatedSizes = (item.sizes || []).map(sz => ({
        ...sz,
        isDefault: sz.id === sizeId
      }));
      return {
        menuItems: s.menuItems.map(i => i.id === productId ? { ...i, sizes: updatedSizes } : i),
        isDraftDirty: true
      };
    });
    try {
      const { menuApi } = await import('../api');
      await menuApi.updateItem(productId, { sizes: updatedSizes });
    } catch (err) {
      console.error('Failed to sync default size to backend:', err);
    }
  },

  deleteMenuProduct: async (productId) => {
    set(s => ({
      menuItems: s.menuItems.filter(item => item.id !== productId),
      isDraftDirty: true
    }));
    try {
      const { menuApi } = await import('../api');
      await menuApi.deleteItem(productId);
    } catch (err) {
      console.error('Failed to delete menu item on backend:', err);
    }
  },

  toggleItemAvailability: async (itemId) => {
    set(s => ({
      menuItems: s.menuItems.map(i => i.id === itemId ? { ...i, available: !i.available } : i),
      isDraftDirty: true
    }));
    try {
      const { menuApi } = await import('../api');
      await menuApi.toggleItem(itemId);
    } catch (err) {
      console.error('Failed to toggle item availability on backend:', err);
    }
  },

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
  
  // ─── Reviews & Ratings ──────────────────────────────
  reviews: [
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
  ],
  replyToReview: (reviewId, replyText) => set(s => ({
    reviews: s.reviews.map(r => r.id === reviewId ? { ...r, reply: replyText } : r)
  })),

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
  updateSettings: async (updates) => {
    set(s => ({ settings: { ...s.settings, ...updates } }));
    try {
      const { restaurantApi, request } = await import('../api');
      if (updates.prepTimeDefault !== undefined) {
        await restaurantApi.updateProfile({ delivery_time_min: parseInt(updates.prepTimeDefault) });
      }
      if (updates.pauseOrders !== undefined) {
        await request('/restaurants/busy-mode', { method: 'POST', body: JSON.stringify({ busy_mode: !!updates.pauseOrders }) });
      }
    } catch (err) {
      console.error('Failed to update settings on backend:', err);
    }
  },

  // Hydration Actions
  fetchAndHydrateAll: async () => {
    try {
      const { restaurantApi, menuApi, ordersApi, onboardingApi, financeApi } = await import('../api');
      
      // 1. Get Onboarding Status
      const onboardingData = await onboardingApi.getStatus();
      set({
        onboarding: {
          status: onboardingData.onboarding_complete ? 'complete' : 'incomplete',
          completedSteps: onboardingData.completed_steps,
          totalSteps: onboardingData.total_steps,
          nextStep: onboardingData.next_step,
          aiPlan: onboardingData.ai_plan
        }
      });

      // 2. Fetch profile, menu, orders, and finance info in parallel
      const [profile, menuRes, ordersRes, balance, txsRes, payoutsRes, aiRes] = await Promise.all([
        restaurantApi.getProfile(),
        menuApi.getItems(),
        ordersApi.getActive(),
        financeApi.getBalance().catch(() => ({ available_balance: 0, pending_balance: 0, lifetime_earned: 0 })),
        financeApi.getTransactions({ limit: 5 }).catch(() => ({ transactions: [] })),
        financeApi.getPayouts({ limit: 5 }).catch(() => ({ payouts: [] })),
        financeApi.getAiSub().catch(() => ({})),
      ]);

      // 3. Set profile/restaurant details
      set({
        restaurant: {
          id: profile.id,
          name: profile.restaurant_name || 'Abu Ali\'s Kitchen',
          status: profile.is_open ? 'open' : 'closed',
          image: profile.logo_image || '/assets/restaurant_logo_wendys.png',
          cuisine: profile.category || 'Mediterranean',
          rating: profile.rating || 4.8,
          address: profile.address || '',
          latitude: profile.latitude,
          longitude: profile.longitude,
          operatingHours: profile.operating_hours || {}
        },
        settings: {
          autoAccept: false,
          prepTimeDefault: profile.delivery_time_min || 15,
          pauseOrders: profile.busy_mode || false,
          soundAlerts: true,
          deliveryRadius: 5
        }
      });

      // 4. Set Menu items
      const clientMenuItems = (menuRes.menu || []).map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        description: item.description,
        image: item.image_url || '/assets/hamburger_1.png',
        available: item.is_available,
        sizes: item.sizes || [],
        calories: item.calories || 350,
      }));
      set({
        menuItems: clientMenuItems,
        menuCategories: [...new Set(clientMenuItems.map(i => i.category))]
      });

      // 5. Set Orders
      const clientOrders = (ordersRes.orders || []).map(mapBackendOrderToClient).filter(Boolean);
      set({ orders: clientOrders });

      // 6. Set Finance
      set({
        finance: {
          balance: balance,
          transactions: txsRes.transactions,
          payouts: payoutsRes.payouts,
          aiSubscription: aiRes
        }
      });

    } catch (err) {
      console.error('Telemetry synchronization failed:', err);
    }
  }
}));
