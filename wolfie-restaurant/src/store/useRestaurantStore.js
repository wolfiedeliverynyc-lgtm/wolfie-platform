import { create } from 'zustand';

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
    name: '', 
    zone: '', 
    status: 'closed', 
    rating: 0, 
    totalOrders: 0,
    logo: '',
    heroImage: '',
    description: '',
    address: '',
    latitude: 0,
    longitude: 0,
    operatingHours: {}
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
  menuCategories: [],
  menuItems: [],
  modifierGroups: [],
  conditionalModifiers: [],
  ingredients: [],

  // Version Control systems
  menuVersions: [],
  isDraftDirty: false,
  publishedAt: new Date().toISOString(),
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
    let newAvailable = false;
    set(s => {
      const item = s.menuItems.find(i => i.id === itemId);
      newAvailable = item ? !item.available : false;
      return {
        menuItems: s.menuItems.map(i => i.id === itemId ? { ...i, available: newAvailable } : i),
        isDraftDirty: true
      };
    });
    try {
      const { menuApi } = await import('../api');
      await menuApi.toggleItem(itemId, newAvailable);
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
  aiAlerts: [],
  dismissAiAlert: (id) => set(s => ({ aiAlerts: s.aiAlerts.filter(a => a.id !== id) })),

  // KDS Mode
  kdsMode: false,
  toggleKds: () => set(s => ({ kdsMode: !s.kdsMode })),

  // Support Queue
  supportTickets: [],
  addSupportTicket: (ticket) => set(s => ({ supportTickets: [ticket, ...s.supportTickets] })),
  isSupportModalOpen: false,
  setSupportModalOpen: (open) => set({ isSupportModalOpen: open }),

  // Metrics (Static summaries)
  metrics: { ordersToday: 0, revenueToday: 0.0, avgPrepTime: 0, slaPerfPercent: 100, cancellationRate: 0.0, activeDriversInbound: 0, currentQueueLength: 0, peakHour: 'N/A', itemsSold: 0, avgOrderValue: 0.0 },
  hourlyData: [],
  topItems: [],

  activity: [],
  addActivity: (act) => set(s => ({ activity: [act, ...s.activity].slice(0, 30) })),
  
  // ─── Reviews & Ratings ──────────────────────────────
  reviews: [],
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
    kycStatus: 'not_submitted',
    isActive: false,
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

  updateProfile: async (profileUpdates) => {
    try {
      const { restaurantApi } = await import('../api');
      const backendUpdates = {};
      if (profileUpdates.name !== undefined) backendUpdates.restaurant_name = profileUpdates.name;
      if (profileUpdates.description !== undefined) backendUpdates.story = profileUpdates.description;
      if (profileUpdates.address !== undefined) backendUpdates.address = profileUpdates.address;
      if (profileUpdates.logo !== undefined) backendUpdates.logo_image = profileUpdates.logo;
      if (profileUpdates.heroImage !== undefined) backendUpdates.hero_image = profileUpdates.heroImage;
      if (profileUpdates.latitude !== undefined) backendUpdates.latitude = parseFloat(profileUpdates.latitude);
      if (profileUpdates.longitude !== undefined) backendUpdates.longitude = parseFloat(profileUpdates.longitude);
      
      if (Object.keys(backendUpdates).length > 0) {
        await restaurantApi.updateProfile(backendUpdates);
      }
      
      set(s => ({
        restaurant: {
          ...s.restaurant,
          ...profileUpdates,
          // Sync image key too
          ...(profileUpdates.logo !== undefined ? { image: profileUpdates.logo } : {})
        }
      }));
    } catch (err) {
      console.error('Failed to update restaurant profile on backend:', err);
      throw err;
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
          aiPlan: onboardingData.ai_plan,
          kycStatus: onboardingData.kyc_status,
          isActive: onboardingData.is_active,
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
          logo: profile.logo_image || '/assets/restaurant_logo_wendys.png',
          heroImage: profile.hero_image || '/assets/restaurant_cover_wendys.png',
          description: profile.story || profile.bio || 'Signature dishes, loaded fries, and refreshing craft drinks.',
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
