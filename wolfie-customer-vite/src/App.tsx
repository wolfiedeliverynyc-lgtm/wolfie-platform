/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Star,
  Clock,
  MapPin,
  ShoppingBag,
  CreditCard,
  User,
  Trash2,
  Plus,
  Minus,
  MessageSquare,
  Compass,
  BellRing,
  Award,
  Send,
  Sparkles,
  ChevronRight,
  Maximize2,
  CheckCircle2,
  ChevronLeft,
  X,
  Map,
  Bike,
  Heart,
  ArrowLeft,
  Menu,
  Settings
} from 'lucide-react';

import { Restaurant, MenuItem, CartItem, Address, PaymentMethod, Order, OrderStatus, Message } from './types';
import { RESTAURANTS, INITIAL_ADDRESSES, INITIAL_PAYMENT_METHODS } from './data';
import RestaurantLanding from './components/RestaurantLanding';
import { api, removeAuthToken } from './services/api';
import { connectSocket, disconnectSocket, getSocket } from './services/socket';
import InteractiveMap from './components/InteractiveMap';
import ProfileDashboard from './components/ProfileDashboard';
import NotificationsPanel, { NotificationItem } from './components/NotificationsPanel';
import PaymentModal from './components/PaymentModal';
import FoodFilterSidebar from './components/FoodFilterSidebar';
import DriverCompanion from './components/DriverCompanion';

export default function App() {
  // Navigation tabs: 'explore' | 'restaurant' | 'tracking' | 'profile' | 'driver'
  const [activeTab, setActiveTab] = useState<'explore' | 'restaurant' | 'tracking' | 'profile' | 'driver'>('explore');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // Core database state nodes
  const [restaurants, setRestaurants] = useState<Restaurant[]>(RESTAURANTS);
  const [addresses, setAddresses] = useState<Address[]>(INITIAL_ADDRESSES);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(INITIAL_PAYMENT_METHODS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartNote, setCartNote] = useState('');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('wolfie_customer_token'));
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('wolfie_customer_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  // Chat conversation
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'rider', text: "Hey! I'm prepping my e-bike gear now. I'll message you when I reach the kitchen.", timestamp: 'Just now' }
  ]);
  const [userMsgInput, setUserMsgInput] = useState('');

  // Notifications Queue
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'init_welcome',
      title: 'Welcome to BiteDash Premium 🍕',
      body: 'Get absolute gourmet meals delivered within 30 minutes. Swipe to view active restaurants!',
      type: 'success',
      time: '1m ago'
    }
  ]);

  // Sidebar / Drawers visual states
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [exploreSearch, setExploreSearch] = useState('');
  const [exploreFilter, setExploreFilter] = useState('All');
  const [sidebarFilter, setSidebarFilter] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history] = useState<string[]>(['rest_2', 'rest_5']);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  // Computed Values
  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];
  const defaultPayment = paymentMethods.find((p) => p.isDefault) || paymentMethods[0];

  // Helper to compute unit price of cart items with their customizations
  const getCartItemPrice = (ci: CartItem) => {
    let price = ci.menuItem.price;
    if (ci.customization) {
      if (ci.customization.size) price += ci.customization.size.price;
      if (ci.customization.side) price += ci.customization.side.price;
      if (ci.customization.addons) {
        price += ci.customization.addons.reduce((sum, add) => sum + add.price, 0);
      }
    }
    return price;
  };

  const cartSubtotal = cart.reduce((acc, curr) => acc + getCartItemPrice(curr) * curr.quantity, 0);
  const totalCartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  // Notification helper
  const addNotification = (title: string, body: string, type: 'success' | 'info' | 'alert' | 'rider') => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setNotifications((prev) => [
      { id: `notif_${Date.now()}`, title, body, type, time: timeStr },
      ...prev.slice(0, 4) // cap at 5 notifications
    ]);
  };

  // State machine helper for order simulation
  useEffect(() => {
    if (!activeOrder || !activeOrder.id.startsWith('ord_demo_')) return;

    let timer: NodeJS.Timeout;
    
    // Auto status flow state transitions
    if (activeOrder.status === 'placed') {
      timer = setTimeout(() => {
        setActiveOrder((prev) => (prev ? { ...prev, status: 'preparing' } : null));
        addNotification(
          'Chef Handed Ticket! 👨‍🍳',
          `The culinary crew at ${activeOrder.restaurant.name} has accepted your order and is selecting fresh ingredients.`,
          'info'
        );
      }, 7000);
    } else if (activeOrder.status === 'preparing') {
      timer = setTimeout(() => {
        setActiveOrder((prev) => (prev ? { ...prev, status: 'cooking' } : null));
        addNotification(
          'Order Cooking 🍳',
          `Your selection is now sizzling over the flame! Headed to perfection.`,
          'alert'
        );
        setMessages((m) => [
          ...m,
          { id: `msg_${Date.now()}`, sender: 'rider', text: "Hi! Marcus here, your courier. I just arrived at the restaurant. Chef is finishing up your box now!", timestamp: '12:04 PM' }
        ]);
      }, 10000);
    } else if (activeOrder.status === 'cooking') {
      timer = setTimeout(() => {
        setActiveOrder((prev) => (prev ? { ...prev, status: 'riding' } : null));
        addNotification(
          'Out for Delivery! 🚲',
          `Rider Marcus has sealed your thermal cargo and is navigating traffic. Follow him on the active radar!`,
          'rider'
        );
      }, 12000);
    } else if (activeOrder.status === 'riding') {
      timer = setTimeout(() => {
        setActiveOrder((prev) => (prev ? { ...prev, status: 'arriving' } : null));
        addNotification(
          'Courier Arriving Soon! 🔔',
          `Your rider is coasting onto your block. Get ready for warm goodness!`,
          'rider'
        );
        setMessages((m) => [
          ...m,
          { id: `msg_${Date.now()}`, sender: 'rider', text: "Hey! Pulling up past the intersection now. Be outside in about 1 minute!", timestamp: '12:14 PM' }
        ]);
      }, 15005);
    } else if (activeOrder.status === 'arriving') {
      timer = setTimeout(() => {
        setActiveOrder((prev) => (prev ? { ...prev, status: 'delivered' } : null));
        addNotification(
          'Order Delivered! 🎉',
          `Enjoy your meal from ${activeOrder.restaurant.name}! Rate your chef and rider experience in our feedback panel.`,
          'success'
        );
      }, 12000);
    }

    return () => clearTimeout(timer);
  }, [activeOrder?.status]);

  // Fetch data, validate session and check recovery on token changes
  useEffect(() => {
    if (token) {
      // Validate session profile first
      api.getProfile().then(userProfile => {
        setUser(userProfile);
        
        // Load other data
        api.getRestaurants().then(res => {
          if (res && res.length > 0) {
            setRestaurants(res);
          }
        }).catch(err => console.error("Failed to load restaurants:", err));
        
        api.getAddresses().then(res => {
          setAddresses(res);
        }).catch(err => console.error("Failed to load addresses:", err));
        
        api.getFavorites().then(res => {
          setFavorites(res);
        }).catch(err => console.error("Failed to load favorites:", err));

        // Check if there is an active order to recover
        const savedOrderId = localStorage.getItem('wolfie_active_order_id');
        if (savedOrderId && !activeOrder) {
          api.getOrder(savedOrderId).then(fullOrder => {
            if (fullOrder && fullOrder.status !== 'delivered' && fullOrder.status !== 'cancelled') {
              api.getRestaurants().then(rests => {
                const target = rests.find(r => r.id === fullOrder.restaurant_id);
                if (target) {
                  const restoredOrder: Order = {
                    id: fullOrder.id,
                    restaurant: target,
                    items: fullOrder.items,
                    subtotal: fullOrder.subtotal,
                    deliveryFee: fullOrder.delivery_fee,
                    serviceFee: fullOrder.service_fee,
                    tax: fullOrder.tax,
                    grandTotal: fullOrder.total,
                    address: {
                      id: 'recovered_addr',
                      label: 'Delivery Site',
                      street: fullOrder.delivery_address,
                      city: '',
                      state: '',
                      zip: '',
                      isDefault: true
                    },
                    paymentMethod: {
                      id: 'recovered_pm',
                      type: fullOrder.payment_method === 'cash' ? 'cash' : 'card',
                      label: fullOrder.payment_method === 'cash' ? 'Cash on Delivery' : 'Stripe Card',
                      isDefault: true
                    },
                    status: fullOrder.status as OrderStatus,
                    createdAt: new Date(fullOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    notes: fullOrder.notes || ''
                  };
                  setActiveOrder(restoredOrder);
                  setActiveTab('tracking');
                  addNotification('Order Restored! 🗺️', `Re-connected to active dispatch track #${fullOrder.id.substring(0, 8)}.`, 'success');
                }
              });
            } else {
              localStorage.removeItem('wolfie_active_order_id');
            }
          }).catch(err => {
            console.warn("Failed to restore active order:", err);
            localStorage.removeItem('wolfie_active_order_id');
          });
        }
      }).catch(err => {
        console.warn("Session invalid or expired, logging out:", err);
        handleLogout();
      });
    } else {
      setRestaurants(RESTAURANTS);
      setAddresses(INITIAL_ADDRESSES);
      setFavorites(['rest_1', 'rest_4']);
    }
  }, [token]);

  // Keep wolfie_active_order_id in localStorage synchronized with activeOrder state
  useEffect(() => {
    if (activeOrder) {
      if (activeOrder.status === 'delivered' || activeOrder.status === 'cancelled') {
        localStorage.removeItem('wolfie_active_order_id');
      } else {
        localStorage.setItem('wolfie_active_order_id', activeOrder.id);
      }
    } else {
      localStorage.removeItem('wolfie_active_order_id');
    }
  }, [activeOrder?.id, activeOrder?.status]);

  // Connect Socket.IO
  useEffect(() => {
    if (token) {
      const socket = connectSocket(token);
      
      socket.on('notification', (data: any) => {
        addNotification(data.title, data.body, data.type || 'info');
      });

      return () => {
        disconnectSocket();
      };
    }
  }, [token]);

  // Listen to socket order status, chat, and handle automatic reconnection re-join room
  useEffect(() => {
    const socket = getSocket();
    if (socket && activeOrder && !activeOrder.id.startsWith('ord_demo_')) {
      
      const joinRoom = () => {
        socket.emit('join_order', { order_id: activeOrder.id });
        console.log("Joined/Rejoined order room:", activeOrder.id);
      };

      // Initial join
      joinRoom();

      // Rejoin room automatically on socket reconnect event
      socket.on('connect', joinRoom);

      const handleStatusUpdate = (data: any) => {
        if (data.order_id === activeOrder.id) {
          handleUpdateOrderStatus(data.status);
        }
      };

      const handleChatMessage = (data: any) => {
        setMessages(prev => {
          const exists = prev.some(m => m.text === data.message && 
            ((data.sender === 'customer' && m.sender === 'user') || 
             (data.sender !== 'customer' && m.sender === 'rider'))
          );
          if (exists) return prev;
          
          return [
            ...prev,
            {
              id: `msg_${Date.now()}`,
              sender: data.sender === 'customer' ? 'user' : 'rider',
              text: data.message,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ];
        });
      };

      const handleDriverLocation = (data: any) => {
        addNotification('Rider GPS Update 🚲', `Rider coordinates received: ${data.lat}, ${data.lng}`, 'rider');
      };

      socket.on('order_status_update', handleStatusUpdate);
      socket.on('chat_message', handleChatMessage);
      socket.on('driver_location', handleDriverLocation);

      return () => {
        socket.off('connect', joinRoom);
        socket.off('order_status_update', handleStatusUpdate);
        socket.off('chat_message', handleChatMessage);
        socket.off('driver_location', handleDriverLocation);
      };
    }
  }, [activeOrder?.id, token]);

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const res = await api.login(authEmail, authPassword);
        setToken(res.token);
        setUser(res.user);
        addNotification('Session Recovered! 🔑', `Authenticated as ${res.user.fullName}.`, 'success');
      } else {
        const res = await api.register(authEmail, authPassword, authFullName, authPhone);
        setToken(res.token);
        setUser(res.user);
        addNotification('Account Created! 🎉', `Customer ledger mapped for ${res.user.fullName}.`, 'success');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    setToken(null);
    setUser(null);
    setCart([]);
    setActiveOrder(null);
    disconnectSocket();
    addNotification('Logged Out 🔒', 'Secure session terminated successfully.', 'info');
  };

  const handleToggleFavorite = async (restaurantId: string, restaurantName: string) => {
    const isFav = favorites.includes(restaurantId);
    try {
      if (token) {
        if (isFav) {
          await api.removeFavorite(restaurantId);
          setFavorites((prev) => prev.filter((id) => id !== restaurantId));
          addNotification('Removed from Favorites 💔', `${restaurantName} has been taken off your saved list.`, 'alert');
        } else {
          await api.addFavorite(restaurantId);
          setFavorites((prev) => [...prev, restaurantId]);
          addNotification('Added to Favorites ❤️', `${restaurantName} is now in your saved kitchens!`, 'success');
        }
      } else {
        if (isFav) {
          setFavorites((prev) => prev.filter((id) => id !== restaurantId));
        } else {
          setFavorites((prev) => [...prev, restaurantId]);
        }
      }
    } catch (e: any) {
      addNotification('Favorites Sync Failed ❌', e.message, 'alert');
    }
  };

  // Cart operations helpers
  const handleAddToCart = (item: MenuItem, restaurantId: string, customization?: any, customQuantity: number = 1) => {
    // If adding a dish from a DIFFERENT restaurant, prompt clear cart
    if (cart.length > 0 && cart[0]?.restaurantId !== restaurantId) {
      if (window.confirm("Switch restaurants? Adding this will clear your current selections from another gourmet kitchen.")) {
        setCart([{ 
          cartItemId: customization ? `${item.id}_${Date.now()}` : item.id,
          menuItem: item, 
          quantity: customQuantity, 
          restaurantId,
          customization
        }]);
        addNotification('Cart Reset 🔄', 'Switching kitchens: selections replaced.', 'info');
      }
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((ci) => {
        if (ci.menuItem.id !== item.id) return false;
        if (!ci.customization && !customization) return true;
        if (JSON.stringify(ci.customization) === JSON.stringify(customization)) return true;
        return false;
      });

      if (existingIndex > -1) {
        return prev.map((ci, idx) => 
          idx === existingIndex 
            ? { ...ci, quantity: ci.quantity + (customization ? customQuantity : 1) } 
            : ci
        );
      }
      return [...prev, { 
        cartItemId: customization ? `${item.id}_${Date.now()}` : item.id,
        menuItem: item, 
        quantity: customization ? customQuantity : 1, 
        restaurantId,
        customization
      }];
    });
  };

  const handleRemoveFromCart = (item: MenuItem, restaurantId: string, customization?: any) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((ci) => {
        if (ci.menuItem.id !== item.id) return false;
        if (!ci.customization && !customization) return true;
        if (JSON.stringify(ci.customization) === JSON.stringify(customization)) return true;
        return false;
      });

      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        if (existing.quantity > 1) {
          return prev.map((ci, idx) => 
            idx === existingIndex ? { ...ci, quantity: ci.quantity - 1 } : ci
          );
        }
        return prev.filter((_, idx) => idx !== existingIndex);
      }
      return prev;
    });
  };

  const handleClearCart = () => {
    setCart([]);
    setIsCartDrawerOpen(false);
  };

  // Submit and finalize Order Placement placement
  const handlePlaceOrder = async (address: Address, payment: PaymentMethod, notes: string) => {
    if (!selectedRestaurant || cart.length === 0) return;

    if (!token || !user) {
      const checkoutOrder: Order = {
        id: `ord_demo_${Math.floor(Math.random() * 90000) + 10000}`,
        restaurant: selectedRestaurant,
        items: cart,
        subtotal: cartSubtotal,
        deliveryFee: selectedRestaurant.deliveryFee,
        serviceFee: parseFloat((cartSubtotal * 0.05).toFixed(2)),
        tax: parseFloat((cartSubtotal * 0.088).toFixed(2)),
        grandTotal: parseFloat((cartSubtotal + selectedRestaurant.deliveryFee + (cartSubtotal * 0.05) + (cartSubtotal * 0.088)).toFixed(2)),
        address,
        paymentMethod: payment,
        status: 'placed',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        notes,
      };

      setActiveOrder(checkoutOrder);
      setCart([]);
      setIsCheckoutOpen(false);
      setIsCartDrawerOpen(false);
      setActiveTab('tracking');
      addNotification(
        'Demo Payment Approved! 💳',
        `Simulation order dispatched to ${selectedRestaurant.name}.`,
        'success'
      );
      return;
    }

    try {
      addNotification('Authorizing Transaction... 💳', 'Creating Stripe payment intent and verifying card details.', 'info');
      
      const pickupAddress = selectedRestaurant.address || "120 Lafayette St, New York, NY";
      const deliveryAddress = `${address.street}, ${address.city}`;
      const quoteRes = await api.getQuote(pickupAddress, deliveryAddress, cart);
      const quote = quoteRes.quote;

      const orderRes = await api.createOrder({
        customerId: user.id,
        restaurantId: selectedRestaurant.id,
        items: cart,
        pickupAddress,
        deliveryAddress,
        paymentMethod: payment.id || 'pm_card_visa'
      });

      const amountCents = Math.round(quote.total * 100);
      const paymentIntent = await api.createPaymentIntent(orderRes.order_id, amountCents);
      console.log("Stripe PaymentIntent created:", paymentIntent);

      const fullOrder = await api.getOrder(orderRes.order_id);

      const realOrder: Order = {
        id: fullOrder.id,
        restaurant: selectedRestaurant,
        items: cart,
        subtotal: fullOrder.subtotal,
        deliveryFee: fullOrder.delivery_fee,
        serviceFee: fullOrder.service_fee,
        tax: fullOrder.tax,
        grandTotal: fullOrder.total,
        address,
        paymentMethod: payment,
        status: fullOrder.status as OrderStatus,
        createdAt: new Date(fullOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        notes: notes,
      };

      setActiveOrder(realOrder);
      setCart([]);
      setIsCheckoutOpen(false);
      setIsCartDrawerOpen(false);
      setActiveTab('tracking');

      addNotification(
        'Transaction Succeeded! 🎉',
        `Stripe verified. Order #${realOrder.id} has been created and sent to ${selectedRestaurant.name}.`,
        'success'
      );
    } catch (error: any) {
      console.error("Order creation failed:", error);
      addNotification('Order Placement Failed ❌', error.message || 'Check connection or card details.', 'alert');
    }
  };

  // Address Node Management
  const handleAddAddress = async (newAddr: Omit<Address, 'id' | 'isDefault'>) => {
    try {
      if (token) {
        const a = await api.createAddress(newAddr.street, newAddr.city, newAddr.label);
        setAddresses((prev) => [...prev, a]);
      } else {
        const item: Address = {
          ...newAddr,
          id: `addr_${Date.now()}`,
          isDefault: addresses.length === 0,
        };
        setAddresses((prev) => [...prev, item]);
      }
      addNotification('Coordinates Saved! 📍', `Saved "${newAddr.label}" successfully in system vault.`, 'success');
    } catch (e: any) {
      addNotification('Address Save Failed ❌', e.message || 'Check database connection.', 'alert');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      if (token && !id.startsWith('addr_')) {
        await api.deleteAddress(id);
      }
      setAddresses((prev) => {
        const target = prev.find((a) => a.id === id);
        if (target?.isDefault && prev.length > 1) {
          const next = prev.find((a) => a.id !== id);
          if (next) next.isDefault = true;
        }
        return prev.filter((a) => a.id !== id);
      });
      addNotification('Location Removed 🗑️', 'Deleted dropoff point from saved profile list.', 'info');
    } catch (e: any) {
      addNotification('Address Delete Failed ❌', e.message, 'alert');
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      if (token && !id.startsWith('addr_')) {
        await api.setDefaultAddress(id);
      }
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a.id === id,
        }))
      );
      addNotification('Primary Site Changed Map 🧭', 'Set default delivery coordinates.', 'info');
    } catch (e: any) {
      addNotification('Address Update Failed ❌', e.message, 'alert');
    }
  };

  // Payment Node Management
  const handleAddPaymentMethod = (newPay: Omit<PaymentMethod, 'id' | 'isDefault'>) => {
    const isFirst = paymentMethods.length === 0;
    const item: PaymentMethod = {
      ...newPay,
      id: `pay_${Date.now()}`,
      isDefault: isFirst,
    };
    setPaymentMethods((prev) => [...prev, item]);
    addNotification('Payment Ledger Authorized 💳', `Mapped "${newPay.label}" secure token into profile system.`, 'success');
  };

  const handleDeletePaymentMethod = (id: string) => {
    setPaymentMethods((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.isDefault && prev.length > 1) {
        const next = prev.find((p) => p.id !== id);
        if (next) next.isDefault = true;
      }
      return prev.filter((p) => p.id !== id);
    });
    addNotification('Source Deleted 💳', 'Removed credit card token authorization.', 'info');
  };

  const handleSetDefaultPaymentMethod = (id: string) => {
    setPaymentMethods((prev) =>
      prev.map((p) => ({
        ...p,
        isDefault: p.id === id,
      }))
    );
    addNotification('Billing Stream Switched 💳', 'Your primary payment preference was updated.', 'info');
  };

  // Floating Chat text submitting
  const handleSendChat = (e: FormEvent) => {
    e.preventDefault();
    if (!userMsgInput.trim()) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: userMsgInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setUserMsgInput('');

    const socket = getSocket();
    if (socket && activeOrder && !activeOrder.id.startsWith('ord_demo_')) {
      socket.emit('order_chat', {
        order_id: activeOrder.id,
        message: userMessage.text,
        sender_type: 'customer',
        sender_id: user?.id
      });
    } else {
      // Trigger funny, context-appropriate simulated replies from Rider Marcus!
      setTimeout(() => {
        let responseText = "Got you! I'm focused on delivering this warm and pristine. Appreciate details!";
        const lower = userMessage.text.toLowerCase();

        if (lower.includes('napkin') || lower.includes('sauce') || lower.includes('plate')) {
          responseText = "Sure thing! Just checked in with the kitchen staff, they shoved a stack of extras in the side pocket.";
        } else if (lower.includes('gate') || lower.includes('door') || lower.includes('buzz') || lower.includes('code')) {
          responseText = "Awesome, saved that secure access note. I will ping you when at the door lobby.";
        } else if (lower.includes('where') || lower.includes('status') || lower.includes('fast') || lower.includes('hurry')) {
          responseText = "Cruising along Broadway right now! Traffic is clean, so I should beat the estimated timer by 2 minutes.";
        } else if (lower.includes('thanks') || lower.includes('thank') || lower.includes('awesome')) {
          responseText = "A absolute pleasure! Always happy to deliver gourmet dishes in pristine shape. Ready to roll!";
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now() + 1}`,
            sender: 'rider',
            text: responseText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        addNotification('Rider Message Recieved 💬', 'Marcus: ' + responseText, 'rider');
      }, 1500);
    }
  };

  // Driver/Courier App message and status syncing callbacks
  const handleDriverSendMessage = (text: string, sender: 'user' | 'rider') => {
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      sender,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, newMsg]);

    if (sender === 'rider') {
      addNotification('Message sent to client 💬', 'Marcus: ' + text, 'rider');
    } else {
      addNotification('Message sent to courier 💬', 'You: ' + text, 'info');
    }
  };

  const handleUpdateOrderStatus = (status: OrderStatus) => {
    if (!activeOrder) return;
    setActiveOrder((prev) => prev ? { ...prev, status } : null);
    
    if (status === 'preparing') {
      addNotification('Chef Received Ticket! 👨‍🍳', 'Meal prep started at the kitchen.', 'info');
    } else if (status === 'cooking') {
      addNotification('Dish Is Cooking! 🍳', 'Simmering over premium elements.', 'alert');
    } else if (status === 'riding') {
      addNotification('Out for Delivery! 🚲', 'Courier is moving along active Broadway radar lines.', 'rider');
    } else if (status === 'arriving') {
      addNotification('Rider Arriving! 📍', 'Marcus is centering on your street coordinate. Get ready!', 'rider');
    } else if (status === 'delivered') {
      addNotification('Order Completed! 🎉', 'Sealed BiteDash thermal parcel delivered securely.', 'success');
    }
  };

  const handleAutoPlaceDemoOrder = () => {
    const demoRestaurant = RESTAURANTS[0];
    const demoItem = demoRestaurant.menu[0];
    const demoCartItem: CartItem = {
      cartItemId: `ci_${Date.now()}`,
      menuItem: demoItem,
      quantity: 1,
      restaurantId: demoRestaurant.id,
    };
    
    const demoOrder: Order = {
      id: `ord_${Math.floor(Math.random() * 90000) + 10000}`,
      restaurant: demoRestaurant,
      items: [demoCartItem],
      subtotal: demoItem.price,
      deliveryFee: demoRestaurant.deliveryFee,
      serviceFee: 1.00,
      tax: 1.20,
      grandTotal: demoItem.price + demoRestaurant.deliveryFee + 2.20,
      address: defaultAddress || INITIAL_ADDRESSES[0],
      paymentMethod: defaultPayment || INITIAL_PAYMENT_METHODS[0],
      status: 'placed',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: "Please deliver warm. Leave at reception."
    };
    
    setActiveOrder(demoOrder);
    setMessages([
      { id: '1', sender: 'rider', text: "Hey! I'm prepping my e-bike gear now. I'll message you when I reach the kitchen.", timestamp: 'Just now' }
    ]);
    addNotification(
      'Demo Order Dispatched! 🍔',
      `Simulated demo order from ${demoRestaurant.name} has been dispatched. Ready for courier tracking!`,
      'success'
    );
  };

  // Accelerate simulation manual helper
  const accelerateSimulation = () => {
    if (!activeOrder) return;
    const states: OrderStatus[] = ['placed', 'preparing', 'cooking', 'riding', 'arriving', 'delivered'];
    const currentIdx = states.indexOf(activeOrder.status);
    if (currentIdx !== -1 && currentIdx < states.length - 1) {
      const nextState = states[currentIdx + 1];
      setActiveOrder((prev) => (prev ? { ...prev, status: nextState } : null));

      // Notification details
      if (nextState === 'preparing') {
        addNotification('Simulation State: Cooking 👨‍🍳', 'Chef accepted order sheet.', 'info');
      } else if (nextState === 'cooking') {
        addNotification('Simulation State: Sizzling 🍳', 'Broth simmering, steak flamed.', 'alert');
      } else if (nextState === 'riding') {
        addNotification('Simulation State: Dispatched 🚲', 'GPS telemetry online, e-bike moving.', 'rider');
      } else if (nextState === 'arriving') {
        addNotification('Simulation State: Near Dropoff 🗺️', 'Rider pulling up on curb side.', 'rider');
      } else if (nextState === 'delivered') {
        addNotification('Simulation State: Food Arrived 🎉', 'Sealed delivery successfully completed.', 'success');
      }
    }
  };

  // Explore grid filtering system
  const filteredRestaurants = restaurants.filter((rest) => {
    const matchSearch = rest.name.toLowerCase().includes(exploreSearch.toLowerCase()) ||
      rest.description.toLowerCase().includes(exploreSearch.toLowerCase());
    const matchFilter = exploreFilter === 'All' || rest.category.includes(exploreFilter);
    
    // Process top-tier spotlight sidebar filter
    if (sidebarFilter === 'favorite') {
      if (!favorites.includes(rest.id)) return false;
    } else if (sidebarFilter === 'history') {
      if (!history.includes(rest.id)) return false;
    } else if (sidebarFilter === 'closest') {
      // Fast delivery (<= 22 mins is considered close in our data)
      if (rest.deliveryTimeMin > 22) return false;
    } else if (sidebarFilter === 'best_seller') {
      // Top culinary ratings: >= 4.85
      if (rest.rating < 4.85) return false;
    } else if (sidebarFilter === 'promos') {
      // Promos: low delivery fee or free (<= $1.50)
      if (rest.deliveryFee > 1.50) return false;
    }

    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans" id="application-container">
      {/* Dynamic Toast Notifications Panel */}
      <NotificationsPanel
        notifications={notifications}
        onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
      />

      {/* 1. Global Navigation Top BAR */}
      {activeTab === 'restaurant' && selectedRestaurant ? (
        <header className="sticky top-0 z-45 bg-white border-b border-slate-100 px-4 sm:px-10 py-5 flex items-center justify-between shadow-sm" id="master-header">
          <div className="flex items-center space-x-4">
            {/* Back button next to Logo */}
            <button 
              onClick={() => { setActiveTab('explore'); setSelectedRestaurant(null); }}
              className="p-1 px-1.5 hover:bg-slate-55 rounded text-slate-805 transition-colors cursor-pointer flex items-center justify-center font-bold"
              title="Back to kitchens"
              id="btn-header-back-restaurant"
            >
              <ArrowLeft className="w-5.5 h-5.5 text-slate-800 font-bold" />
            </button>

            {/* WOLFIE Branding and Logo */}
            <div 
              className="flex items-center space-x-2 cursor-pointer select-none" 
              onClick={() => { setActiveTab('explore'); setSelectedRestaurant(null); }} 
            >
              <svg className="w-6.5 h-6.5 text-[#F15A24] fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M4.5 10.5C5.88 10.5 7 9.38 7 8C7 6.62 5.88 5.5 4.5 5.5C3.12 5.5 2 6.62 2 8C2 9.38 3.12 10.5 4.5 10.5ZM9 7C10.38 7 11.5 5.88 11.5 4.5C11.5 3.12 10.38 2 9 2C7.62 2 6.5 3.12 6.5 4.5C6.5 5.88 7.62 7 9 7ZM15 7C16.38 7 17.5 5.88 17.5 4.5C17.5 3.12 16.38 2 15 2C13.62 2 12.5 3.12 12.5 4.5C12.5 5.88 13.62 7 15 7ZM19.5 10.5C20.88 10.5 22 9.38 22 8C22 6.62 20.88 5.5 19.5 5.5C18.12 5.5 17 6.62 17 8C17 9.38 18.12 10.5 19.5 10.5ZM17.2 11.5C16.3 11.1 14.55 10.8 12 10.8C9.45 10.8 7.7 11.1 6.8 11.5C5.25 12.2 4 14.2 4 16.5C4 20.1 7.6 23 12 23C16.4 23 20 20.1 20 16.5C20 14.2 18.75 12.2 17.2 11.5Z" />
              </svg>
              <span className="text-xl font-black tracking-widest text-[#1E293B] block leading-none">
                WOLFIE
              </span>
            </div>
          </div>

          {/* Right Header Controls matching image */}
          <div className="flex items-center space-x-6">
            {/* Search Icon */}
            <button
              onClick={() => {
                const searchEl = document.getElementById('search-menu-items');
                if (searchEl) {
                  searchEl.focus();
                  searchEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  addNotification('Search Focused 🔍', 'The food menu search is ready!', 'info');
                } else {
                  addNotification('Search active 🔍', 'Type keywords to filter the culinary listings below.', 'info');
                }
              }}
              className="p-1 hover:text-[#F15A24] text-slate-700 transition-colors cursor-pointer rounded"
              title="Search Gourmet Dishes"
            >
              <Search className="w-5.5 h-5.5 text-slate-755" />
            </button>

            {/* Heart Favorite Trigger */}
            <button
              onClick={() => {
                handleToggleFavorite(selectedRestaurant.id, selectedRestaurant.name);
              }}
              className="p-1 hover:text-[#F15A24] text-slate-700 transition-colors cursor-pointer rounded"
              title="Save restaurant to favorites"
            >
              <Heart className={`w-5.5 h-5.5 text-slate-755 hover:text-[#F15A24] transition-colors ${favorites.includes(selectedRestaurant.id) ? 'fill-[#F15A24] text-[#F15A24]' : ''}`} />
            </button>

            {/* Shopping Cart Trigger with elegant Badge */}
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative p-1 hover:text-[#F15A24] text-slate-700 transition-colors cursor-pointer rounded"
              title="View your shopping selection"
            >
              <ShoppingBag className="w-5.5 h-5.5 text-slate-755" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#F15A24] text-white font-mono font-extrabold text-[9px] h-4.5 w-4.5 rounded-full flex items-center justify-center border border-white shadow-sm animate-pulse">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Elegant Drawer/Menu triggers */}
            <div className="relative" id="header-settings-menu-container">
              <button
                id="btn-header-account-settings"
                onClick={() => {
                  setIsHeaderMenuOpen(!isHeaderMenuOpen);
                  addNotification('Settings Menu ⚙️', 'Explore account configurations, active delivery telemetry, and workspace modes.', 'info');
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                  isHeaderMenuOpen 
                    ? 'bg-[#F15A24]/10 border-[#F15A24]/30 text-[#F15A24] shadow-[0_4px_12px_rgba(241,90,36,0.12)]' 
                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100 hover:shadow-sm'
                }`}
                title="Account & Workspace Settings"
              >
                <motion.div
                  animate={{ rotate: isHeaderMenuOpen ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  {isHeaderMenuOpen ? (
                    <X className="w-5 h-5 text-[#F15A24] stroke-[2.5]" id="btn-header-account-settings-x" />
                  ) : (
                    <Settings className="w-5 h-5 stroke-[2.2] text-slate-700" id="btn-header-account-settings-gear" />
                  )}
                </motion.div>
              </button>

              {/* Suspended Dropdown Settings Panel */}
              <AnimatePresence>
                {isHeaderMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4.5 shadow-[0_15px_40px_rgba(0,0,0,0.08)] z-50 font-sans"
                    id="suspended-settings-dropdown"
                  >
                    <div className="flex items-center space-x-3 pb-3 mb-3 border-b border-slate-100/70 select-none">
                      <span className="text-lg leading-none">⚙️</span>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Quick Settings</h4>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Control center options</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <button
                        onClick={() => {
                          setActiveTab('profile');
                          setIsHeaderMenuOpen(false);
                          addNotification('Profile Opened 👤', 'Review your secure client settings, coordinates, and saved payment cards.', 'info');
                        }}
                        className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left text-xs font-bold text-slate-600 hover:text-[#F15A24] cursor-pointer"
                        id="dropdown-option-profile"
                      >
                        <User className="w-4 h-4" />
                        <span>Client Account</span>
                      </button>

                      <button
                        onClick={() => {
                          if (activeOrder) {
                            setActiveTab('tracking');
                          } else {
                            addNotification('Status update 🔔', 'Zero orders active on dispatch lines. Checkout a plate first!', 'info');
                          }
                          setIsHeaderMenuOpen(false);
                        }}
                        className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left text-xs font-bold text-slate-605 hover:text-[#F15A24] cursor-pointer"
                        id="dropdown-option-tracking"
                      >
                        <Map className="w-4 h-4 text-emerald-500" />
                        <span>Track Orders</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('driver');
                          setIsHeaderMenuOpen(false);
                        }}
                        className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left text-xs font-bold text-slate-605 hover:text-[#F15A24] cursor-pointer"
                        id="dropdown-option-driver"
                      >
                        <Bike className="w-4 h-4 text-amber-500" />
                        <span className="flex items-center gap-1.5">
                          <span>Driver Companion App</span>
                          <span className="bg-emerald-500 w-1.5 h-1.5 rounded-full animate-ping" />
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('explore');
                          setSelectedRestaurant(null);
                          setIsHeaderMenuOpen(false);
                        }}
                        className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left text-xs font-bold text-slate-605 hover:text-[#F15A24] cursor-pointer border-t border-slate-50"
                        id="dropdown-option-explore"
                      >
                        <Compass className="w-4 h-4 text-indigo-500" />
                        <span>Back to Kitchens</span>
                      </button>

                      <button
                        onClick={() => {
                          handleLogout();
                          setIsHeaderMenuOpen(false);
                        }}
                        className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-rose-50 transition-colors text-left text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer border-t border-slate-105"
                        id="dropdown-option-logout"
                      >
                        <X className="w-4 h-4 text-rose-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>
      ) : (
        <header className="sticky top-0 z-45 bg-white border-b border-slate-100 px-4 sm:px-10 py-5 flex items-center justify-between shadow-sm" id="master-header">
          <div className="flex items-center space-x-12">
            {/* WOLFIE Branding and Logo */}
            <div 
              className="flex items-center space-x-2.5 cursor-pointer select-none" 
              onClick={() => { setActiveTab('explore'); setSelectedRestaurant(null); setExploreFilter('All'); }} 
              id="btn-header-logo"
            >
              {/* Elegant Orange Geometric Wolf Paw SVG */}
              <svg className="w-6.5 h-6.5 text-[#F15A24] fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M4.5 10.5C5.88 10.5 7 9.38 7 8C7 6.62 5.88 5.5 4.5 5.5C3.12 5.5 2 6.62 2 8C2 9.38 3.12 10.5 4.5 10.5ZM9 7C10.38 7 11.5 5.88 11.5 4.5C11.5 3.12 10.38 2 9 2C7.62 2 6.5 3.12 6.5 4.5C6.5 5.88 7.62 7 9 7ZM15 7C16.38 7 17.5 5.88 17.5 4.5C17.5 3.12 16.38 2 15 2C13.62 2 12.5 3.12 12.5 4.5C12.5 5.88 13.62 7 15 7ZM19.5 10.5C20.88 10.5 22 9.38 22 8C22 6.62 20.88 5.5 19.5 5.5C18.12 5.5 17 6.62 17 8C17 9.38 18.12 10.5 19.5 10.5ZM17.2 11.5C16.3 11.1 14.55 10.8 12 10.8C9.45 10.8 7.7 11.1 6.8 11.5C5.25 12.2 4 14.2 4 16.5C4 20.1 7.6 23 12 23C16.4 23 20 20.1 20 16.5C20 14.2 18.75 12.2 17.2 11.5Z" />
              </svg>
              <span className="text-xl font-black tracking-widest text-[#1E293B] block leading-none">
                WOLFIE
              </span>
            </div>

            {/* Navigation links matching the mockup photo */}
            <nav className="hidden lg:flex items-center space-x-10 text-xs font-black tracking-wide text-slate-800">
              <button 
                onClick={() => { setActiveTab('explore'); setSelectedRestaurant(null); setExploreFilter('All'); }} 
                className={`hover:text-[#F15A24] transition-colors cursor-pointer ${activeTab === 'explore' && !selectedRestaurant ? 'text-[#F15A24] font-black' : 'text-slate-700 font-bold'}`}
              >
                Home
              </button>
              <button 
                onClick={() => { setActiveTab('explore'); setSelectedRestaurant(null); setExploreFilter('All'); setTimeout(() => { document.getElementById('explore-filtering-hub')?.scrollIntoView({ behavior: 'smooth' }); }, 150); }} 
                className="text-slate-600 hover:text-[#F15A24] font-medium transition-colors cursor-pointer"
              >
                Restaurants
              </button>
              <button 
                onClick={() => { addNotification('🔥 Special Promotion Applied', 'Apply code WOLF20 key at secure checkout for 20% savings!', 'success'); }} 
                className="text-slate-605 hover:text-[#F15A24] font-medium transition-colors cursor-pointer"
              >
                Offers
              </button>
              <button 
                onClick={() => { if (activeOrder) { setActiveTab('tracking'); } else { addNotification('Status update 🔔', 'Zero orders active on dispatch lines. Checkout a plate first!', 'info'); } }} 
                className={`text-slate-600 hover:text-[#F15A24] font-medium transition-colors cursor-pointer ${activeTab === 'tracking' ? 'text-[#F15A24] font-black' : ''}`}
              >
                Track Order
              </button>
              <button 
                onClick={() => { setActiveTab('driver'); }} 
                className={`hover:text-[#F15A24] transition-colors cursor-pointer flex items-center space-x-1.5 uppercase px-3 py-1.5 bg-[#111827] text-white rounded-xl hover:bg-[#F15A24] text-[10px] font-black tracking-widest ${activeTab === 'driver' ? 'bg-[#F15A24]' : ''}`}
                title="Sleek Driver Companion App"
              >
                <span className="relative flex h-1.5 w-1.5 bg-emerald-400 rounded-full">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>Driver App</span>
              </button>
            </nav>
          </div>

          {/* Deliver Location picker card, Cart trigger and profile */}
          <div className="flex items-center space-x-4">
            
            {/* Deliver coordinates indicator matching layout */}
            <div 
              onClick={() => setActiveTab('profile')}
              className="hidden md:flex items-center space-x-1.5 bg-[#FFF2ED] hover:bg-[#FFE6DC] text-[#F15A24] text-[11px] font-black tracking-wider uppercase p-2 px-4 rounded-full shadow-sm cursor-pointer transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{defaultAddress ? defaultAddress.city : 'New York, NY'}</span>
              <span className="text-[9px] font-light leading-none ml-1">▼</span>
            </div>

            {/* Cart Icon trigger with orange styling */}
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-full flex items-center justify-center text-slate-700 relative transition-all active:scale-95 shadow-sm cursor-pointer"
              id="floating-cart-btn"
            >
              <ShoppingBag className="w-4.5 h-4.5 text-slate-805" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#F15A24] text-white font-mono font-extrabold text-[9px] h-4.5 w-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* High-quality profile photo avatar */}
            <div
              onClick={() => setActiveTab('profile')}
              className="w-10 h-10 rounded-full overflow-hidden border border-slate-100 shadow-sm cursor-pointer active:scale-95 select-none shrink-0"
              title="Premium Profile Options"
              id="profile-avatar-shortcut"
            >
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80" 
                alt="Wolfie profile avatar" 
                className="w-full h-full object-cover" 
              />
            </div>

          </div>
        </header>
      )}

      {/* 2. Main content area switcher */}
      <main className="flex-1 pb-20" id="main-content-flow">
        <AnimatePresence mode="wait">
          {/* TAB A: EXPLORE DISHES MAP */}
          {activeTab === 'explore' && (
            <motion.div
              key="explore-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-7xl mx-auto px-4 py-8"
              id="view-explore"
            >
              <div className="flex flex-col lg:flex-row gap-8 items-start w-full" id="explore-side-layout">
                {/* Left Side Filter Navigation Sidebar */}
                <FoodFilterSidebar
                  activeFilter={sidebarFilter}
                  onFilterChange={(filterId) => {
                    setSidebarFilter(filterId);
                  }}
                  favoritesCount={favorites.length}
                />

                {/* Right Side Main Content Feed Container */}
                <div className="flex-1 w-full space-y-12" id="explore-cards-feed">
                  {/* Marketing banner / Hero */}
                  <div className="relative rounded-[2.5rem] p-8 md:p-14 bg-gradient-to-br from-[#FFF8F5] via-white to-[#FBF8F5] border border-orange-100/35 overflow-hidden flex flex-col md:grid md:grid-cols-12 items-center gap-10 min-h-[500px]" id="wolfie-premium-hero">
                
                <div className="space-y-6 max-w-xl text-center md:text-left z-10 md:col-span-7">
                  <span className="inline-flex items-center px-3.5 py-1.5 bg-[#FFF0E9] text-[#F15A24] rounded-full text-[10px] font-black tracking-widest uppercase">
                    FAST. FRESH. PREMIUM.
                  </span>
                  
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] mt-3">
                    Your Favorite Food, Delivered Beautifully
                  </h1>
                  
                  <p className="text-sm text-slate-500 leading-relaxed max-w-sm font-sans mt-3">
                    Discover the best restaurants in your area and get your food delivered hot and fresh.
                  </p>

                  {/* Interactive Search box matching design */}
                  <div className="relative bg-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center p-1.5 px-4 max-w-md w-full mt-6">
                    <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Search for restaurants or dishes..."
                      value={exploreSearch}
                      onChange={(e) => {
                        setExploreSearch(e.target.value);
                      }}
                      className="w-full bg-transparent text-slate-900 text-xs py-2 focus:outline-none placeholder-slate-400 font-sans"
                    />
                    
                    {/* Orange slider accent icon */}
                    <button
                      onClick={() => {
                        addNotification('Filter Activated 🧭', 'Explore gourmet chefs on the listing below!', 'info');
                      }}
                      className="p-2.5 bg-[#F15A24] text-white rounded-full shadow-md hover:bg-[#D94F1E] active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0 ml-1"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                        <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                        <line x1="1" y1="14" x2="7" y2="14" />
                        <line x1="9" y1="8" x2="15" y2="8" />
                        <line x1="17" y1="16" x2="23" y2="16" />
                      </svg>
                    </button>
                  </div>

                  {/* Hero key stats cards */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-12 mt-8 md:mt-10 pt-5 border-t border-slate-100/80">
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-slate-950 leading-none">50+</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1.5 font-bold font-mono">Top Restaurants</div>
                    </div>
                    <div className="hidden sm:block border-l border-slate-200/50 h-8"></div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-slate-950 leading-none">20-30</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1.5 font-bold font-mono">Min Delivery</div>
                    </div>
                    <div className="hidden sm:block border-l border-slate-200/50 h-8"></div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-slate-950 leading-none flex items-center">
                        4.8 <Star className="w-4 h-4 fill-amber-500 text-amber-500 ml-1" />
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1.5 font-bold font-mono">Customer Rating</div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Gourmet food picture plate with play button trigger */}
                <div className="relative md:col-span-5 flex items-center justify-center select-none mt-6 md:mt-0 w-full">
                  <div className="absolute w-72 h-72 md:w-96 md:h-96 bg-[#FFEBE3] rounded-full blur-3xl opacity-60 -z-10" />
                  
                  {/* Circular visual plate matching photograph bounds */}
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 md:w-85 md:h-85 rounded-full shadow-[0_22px_60px_rgba(241,90,36,0.11)] border border-orange-50/70 overflow-hidden group/plate transition-all duration-300">
                    <img
                      src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=700&q=80"
                      alt="Wolfie signature pasta plate detail"
                      className="w-full h-full object-cover select-none transform scale-102 group-hover/plate:scale-108 transition-all duration-1000"
                      referrerPolicy="no-referrer"
                    />

                    {/* Floating Circular Play Overlay */}
                    <div className="absolute inset-0 bg-transparent flex items-center justify-center z-10">
                      <button
                        onClick={() => {
                          addNotification('Gourmet Trailer 🎬', 'Simulating pristine high-definition pasta preparation video!', 'success');
                        }}
                        className="w-14 h-14 rounded-full bg-white hover:bg-orange-55 text-[#F15A24] hover:text-[#D94F1E] flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer border border-orange-50"
                        title="Watch preparation video"
                      >
                        <svg className="w-5 h-5 fill-current ml-1" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" style={{ fill: '#F15A24' }} />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Absolute floating micro card container: Hot & Fresh */}
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="absolute bottom-[-16px] right-2 md:right-[-20px] bg-white rounded-2xl p-3 shadow-[0_15px_35px_rgba(0,0,0,0.08)] border border-slate-100 flex items-center space-x-3 w-[260px] z-20"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                      <img 
                        src="https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=150&h=150&q=80" 
                        alt="Hot specialty pizza item recipe thumbnail" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="text-xs font-black text-slate-805 leading-tight">Hot & Fresh</h4>
                      <p className="text-[10px] font-bold text-slate-900 leading-tight block mt-0.5">Every Order</p>
                      <p className="text-[9px] text-slate-400 font-sans block mt-0.5">Prepared with love</p>
                    </div>
                    
                    {/* Love reaction icon btn */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addNotification('Added to Favourites! ❤️', 'Added signature gourmet plate to your saved list.', 'success');
                      }}
                      className="p-1.5 hover:bg-rose-50 rounded-full text-slate-300 hover:text-[#F15A24] transition-colors cursor-pointer"
                    >
                      <Heart className="w-4 h-4 fill-current text-[#F15A24]" />
                    </button>
                  </motion.div>
                </div>

              </div>

              {/* 2. Top Restaurants Header bar with Chevron sliders */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center justify-between" id="explore-filtering-hub">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-905 tracking-tight">Top Restaurants</h2>
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => { setExploreFilter('All'); addNotification('Showed All Kitchens 🧭', 'Category filter reset to All.', 'info'); }} 
                      className="text-xs font-semibold text-slate-400 hover:text-[#F15A24] hover:underline transition-all cursor-pointer whitespace-nowrap"
                    >
                      View all
                    </button>
                    <div className="flex items-center space-x-1.5">
                      <button 
                        onClick={() => addNotification('Swipe Navigation ↕️', 'Touch and drag horizontal list to browse!', 'info')}
                        className="w-8 h-8 rounded-full border border-slate-200 bg-white shadow-sm text-slate-500 flex items-center justify-center hover:bg-slate-50 transition-colors active:scale-95 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                      </button>
                      <button 
                        onClick={() => addNotification('Swipe Navigation ↕️', 'Touch and drag horizontal list to browse!', 'info')}
                        className="w-8 h-8 rounded-full border border-slate-200 bg-white shadow-sm text-slate-500 flex items-center justify-center hover:bg-slate-50 transition-colors active:scale-95 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tab layout button rows */}
                <div className="flex items-center space-x-2.5 overflow-x-auto scrollbar-none py-1">
                  {['All', 'Japanese', 'Italian', 'Healthy', 'Burgers & Pizza', 'Dessert'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setExploreFilter(filter)}
                      className={`p-2.5 px-5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                        exploreFilter === filter
                          ? 'bg-[#F15A24] text-white border-[#F15A24] shadow-md'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
                      }`}
                      id={`explore-filter-${filter}`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {/* Interactive Restaurant Grid listing styled to match photo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="restaurants-active-grid">
                  {filteredRestaurants.map((rest) => (
                    <div
                      key={rest.id}
                      onClick={() => {
                        setSelectedRestaurant(rest);
                        setActiveTab('restaurant');
                      }}
                      className="group bg-white/70 backdrop-blur-md rounded-3xl overflow-hidden cursor-pointer border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                      id={`rest-card-${rest.id}`}
                    >
                      <div>
                        {/* Upper image frame containing absolute time limits */}
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50 border-b border-slate-50">
                          <img
                            src={rest.heroImage}
                            alt={rest.name}
                            className="w-full h-full object-cover select-none group-hover:scale-104 transition-transform duration-700"
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Floating White duration slider pill top-left to match mockup picture */}
                          <div className="absolute top-3.5 left-3.5 bg-white/95 backdrop-blur-sm shadow-md rounded-full px-3 py-1 text-[10px] font-black text-slate-800 flex items-center gap-1.5 border border-slate-100">
                            <Clock className="w-3.5 h-3.5 text-[#F15A24]" />
                            <span>{rest.deliveryTimeMin} min</span>
                          </div>

                          {/* Floating heart on top-right */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(rest.id, rest.name);
                            }}
                            className="absolute top-3.5 right-3.5 p-2 bg-white/95 backdrop-blur-sm shadow-md rounded-full text-slate-400 hover:text-rose-500 active:scale-95 transition-all cursor-pointer border border-slate-100 flex items-center justify-center z-10 animate-fade-in"
                            title={favorites.includes(rest.id) ? "Remove from Favorites" : "Add to Favorites"}
                          >
                            <Heart className={`w-3.5 h-3.5 transition-all ${favorites.includes(rest.id) ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                          </button>
                        </div>

                        {/* Detail layout structure block */}
                        <div className="p-5.5 space-y-1.5 text-left">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-[#F15A24] font-mono">
                            {rest.category}
                          </span>
                          
                          <h3 className="text-base font-black text-slate-900 tracking-tight group-hover:text-[#F15A24] transition-colors truncate">
                            {rest.name}
                          </h3>
                          
                          <p className="text-xs text-slate-400 font-sans leading-relaxed line-clamp-1">
                            {rest.description}
                          </p>
                        </div>
                      </div>

                      {/* Metadata Details footer alignment matches screenshot */}
                      <div className="mx-5.5 mb-5.5 border-t border-slate-50 pt-3.5 flex items-center justify-between text-xs font-semibold text-slate-500">
                        <div className="flex items-center space-x-1.5 font-sans">
                          <span className="font-mono text-emerald-600 font-extrabold text-[11px] uppercase tracking-wider">{rest.deliveryFee === 0 ? 'FREE DELIVERY' : `$${rest.deliveryFee} Fee`}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-amber-500 font-black">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{rest.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Promo offer card - Bento style matching screenshot */}
              <div 
                className="relative rounded-[2.5rem] p-8 md:p-14 bg-gradient-to-r from-[#FFF5F1] via-[#FAF1ED] to-[#FFF7F4] border border-orange-100/35 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8" 
                id="promo-banner-wolf"
              >
                <div className="space-y-4 max-w-xl text-center md:text-left z-10">
                  <h3 className="text-2xl md:text-3.56xl font-black text-slate-900 tracking-tight leading-none">
                    Get 20% Off Your First Order!
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-sans max-w-sm mt-2">
                    Join Wolfie and enjoy exclusive deals from top restaurants. Use premium delivery with live courier radar.
                  </p>
                  
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        addNotification('20% Voucher Applied! 🏷️', 'WOLF20 promo code applied at checkout for 20% off!', 'success');
                      }}
                      className="p-3.5 px-8 bg-[#F15A24] hover:bg-[#D94F1E] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 shadow-orange-500/10 cursor-pointer"
                    >
                      Order Now
                    </button>
                  </div>
                </div>

                {/* Pure geometric background leave decor */}
                <div className="absolute top-1/2 left-[44%] -translate-y-1/2 opacity-25 select-none pointer-events-none">
                  <svg className="w-16 h-16 text-orange-400 rotate-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 8C14.24 8 12 10.24 12 13V21H17V13C17 11.9 17.9 11 19 11C20.1 11 21 11.9 21 13V21H24V13C24 10.24 21.76 8 19 8H17M12 21V13C12 10.24 9.76 8 7 8H5c-1.1 0-2 .9-2 2v11H8v-8c0-1.1.9-2 2-2s2 .9 2 2v8h3V21z" />
                  </svg>
                </div>

                {/* Smashed Burger side mockup picture */}
                <div className="relative w-72 h-44 sm:w-80 md:w-96 md:h-52 flex-shrink-0 z-10 select-none overflow-hidden rounded-3xl border border-white/60 shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&h=400&q=80"
                    alt="Juicy Smashed Burger combo platter"
                    className="w-full h-full object-cover transform hover:rotate-1 hover:scale-104 transition-all duration-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* 4. Popular Categories Section layout at bottom panel */}
              <div className="space-y-6 pt-2" id="home-categories-bento">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Popular Categories</h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5">
                  {[
                    { name: 'Burgers', emoji: '🍔', filter: 'Burgers & Pizza' },
                    { name: 'Pizza', emoji: '🍕', filter: 'Burgers & Pizza' },
                    { name: 'Sushi', emoji: '🍣', filter: 'Japanese' },
                    { name: 'Healthy', emoji: '🥗', filter: 'Healthy' },
                    { name: 'Dessert', emoji: '🍰', filter: 'Dessert' },
                    { name: 'Drinks', emoji: '🍹', filter: 'All' },
                  ].map((cat) => {
                    const isActive = exploreFilter === cat.filter;
                    return (
                      <div
                        key={cat.name}
                        onClick={() => {
                          setExploreFilter(cat.filter);
                          document.getElementById('explore-filtering-hub')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`cursor-pointer hover:-translate-y-1.5 hover:shadow-md transition-all rounded-[1.8rem] p-7 text-center select-none border border-slate-100 flex flex-col items-center justify-center space-y-3.5 min-h-[140px] ${
                          isActive 
                            ? 'bg-[#FFF5F1] border-orange-300' 
                            : 'bg-[#FCFCFC] hover:bg-slate-50'
                        }`}
                        id={`cat-card-${cat.name}`}
                      >
                        <span className="text-4.5xl filter drop-shadow-md transform hover:scale-110 duration-200 block select-none">
                          {cat.emoji}
                        </span>
                        
                        <span className="text-[11px] font-extrabold text-[#1E293B] tracking-wider uppercase font-sans shrink-0 block">
                          {cat.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

                </div>
              </div>
            </motion.div>
          )}

          {/* TAB B: RESTAURANT DETAIL LANDING PAGE */}
          {activeTab === 'restaurant' && selectedRestaurant && (
            <motion.div
              key="restaurant-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <RestaurantLanding
                restaurant={selectedRestaurant}
                cartItems={cart}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                onBackToExplore={() => { setActiveTab('explore'); setSelectedRestaurant(null); }}
                onCheckoutTrigger={() => setIsCheckoutOpen(true)}
              />
            </motion.div>
          )}

          {/* TAB C: LIVE DISPATCH COURIER RADAR */}
          {activeTab === 'tracking' && activeOrder && (
            <motion.div
              key="tracking-tab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8"
              id="view-tracking"
            >
              {/* Left Column: Interactive GPS Telemetry Radar */}
              <div className="lg:col-span-8 h-[500px] sm:h-[600px] flex flex-col justify-between">
                <InteractiveMap
                  restaurant={activeOrder.restaurant}
                  address={activeOrder.address}
                  status={activeOrder.status}
                />
              </div>

              {/* Right Column: Dispatch steps, Simulator dials and Chat messaging */}
              <div className="lg:col-span-4 space-y-6 flex flex-col">
                <div className="bg-white border border-[#ECEFF2] rounded-3xl p-6 shadow-[0_4px_25px_rgba(0,0,0,0.02)] space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between select-none">
                    <div>
                      <span className="text-[10px] font-black tracking-wider text-[#F15A24] uppercase">Live Tracker</span>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight font-sans">
                        Order Status
                      </h3>
                    </div>
                    <span className="text-[#F15A24] bg-orange-50/70 border border-orange-100/50 font-mono text-xs px-2.5 py-1.5 rounded-xl uppercase font-extrabold tracking-wider">
                      {activeOrder.status}
                    </span>
                  </div>

                  {/* Order Progress Status Steps bar */}
                  <div className="space-y-4">
                    {[
                      { state: 'placed', title: 'Payment Confirmed', desc: 'Secure transaction authorized successfully.' },
                      { state: 'preparing', title: 'Ticket Received', desc: 'Chef received ticket details.' },
                      { state: 'cooking', title: 'Culinary Preparation', desc: 'Your food is sizzling on the fire right now.' },
                      { state: 'riding', title: 'Courier Dispatched', desc: 'E-bike routing active along Broadway St.' },
                      { state: 'arriving', title: 'Arriving dropoff site', desc: 'Marcus is entering your street.' },
                      { state: 'delivered', title: 'Sealed Box Handed off 🎉', desc: 'Securely completed. Enjoy your meal!' }
                    ].map((step, idx) => {
                      const statesList: OrderStatus[] = ['placed', 'preparing', 'cooking', 'riding', 'arriving', 'delivered'];
                      const activeIdx = statesList.indexOf(activeOrder.status);
                      const currentIdx = statesList.indexOf(step.state as OrderStatus);
                      
                      const isCompleted = currentIdx < activeIdx || activeOrder.status === 'delivered';
                      const isActive = activeOrder.status === step.state;
                      
                      return (
                        <div key={step.state} className="flex space-x-3.5 items-start relative pb-1">
                          {/* Dot line connection */}
                          {idx < 5 && (
                            <div className={`w-0.5 absolute left-2.5 top-6 bottom-[-16px] -ml-px ${
                              isCompleted ? 'bg-[#F15A24]' : 'bg-slate-200/80'
                            }`} />
                          )}

                          {/* Node visual icon */}
                          <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-black border-2 z-10 flex-shrink-0 transition-all ${
                            isCompleted
                              ? 'bg-[#F15A24] border-[#F15A24] text-white shadow-xs'
                              : isActive
                              ? 'bg-orange-50 border-[#F15A24] text-[#F15A24] scale-110 shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}>
                            {isCompleted ? '✓' : idx + 1}
                          </div>

                          <div className="text-xs select-none">
                            <h4 className={`font-black tracking-tight ${isActive ? 'text-[#F15A24] text-sm' : isCompleted ? 'text-slate-800' : 'text-slate-400 font-semibold'}`}>
                              {step.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5 leading-normal sm:leading-relaxed font-sans">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* FAST SIMULATION TRIGGER CONTROL */}
                  <div className="bg-[#FCFCFD] p-4 rounded-2xl border border-slate-100 space-y-3 text-center">
                    <div className="text-[10px] font-black tracking-wider text-slate-400 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-[#F15A24] mr-1.5" />
                      <span>SIMULATOR CONTROL</span>
                    </div>
                    {activeOrder.status !== 'delivered' ? (
                      <button
                        onClick={accelerateSimulation}
                        className="w-full py-3 bg-[#F15A24] hover:bg-[#E04D1B] text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-xs transition-all active:scale-98 flex items-center justify-center space-x-1.5 cursor-pointer font-sans"
                        id="simulation-accelerate-btn"
                      >
                        <span>Fast-Forward Delivery</span>
                        <ChevronRight className="w-4 h-4 text-white/95" />
                      </button>
                    ) : (
                      <div className="text-xs text-emerald-600 font-mono font-bold uppercase flex items-center justify-center select-none bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                        ✓ Delivery completed
                      </div>
                    )}
                  </div>
                </div>

                {/* Secure Chat with Courier Marcus */}
                <div className="bg-white border border-[#ECEFF2] rounded-3xl p-5 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[300px]" id="rider-messenger-box">
                  <div className="flex items-center justify-between border-b border-slate-100/90 pb-3 mb-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100/80 flex items-center justify-center text-[#F15A24] text-xs font-black select-none">
                        M
                      </div>
                      <div className="select-none">
                        <h4 className="text-xs font-black text-slate-900 leading-none">Rider Marcus</h4>
                        <span className="text-[9px] font-semibold text-slate-400 flex items-center mt-1">
                          <Bike className="w-2.5 h-2.5 text-emerald-500 mr-1" />
                          On E-Bike Express
                        </span>
                      </div>
                    </div>
                    <span className="text-[8.5px] font-black tracking-wider bg-orange-50 border border-orange-100 text-[#F15A24] px-2 py-1 rounded-lg uppercase select-none">
                      GPS ACTIVE
                    </span>
                  </div>

                  {/* Messages dynamic listing */}
                  <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1 border-b border-slate-100 mb-2 scrollbar-none font-sans text-xs flex flex-col">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 leading-relaxed shadow-xs ${
                          m.sender === 'user'
                            ? 'bg-[#F15A24] text-white ml-auto rounded-tr-none'
                            : 'bg-[#F5F5F7] text-slate-850 mr-auto rounded-tl-none font-semibold'
                        }`}
                      >
                        <p className="font-sans leading-relaxed text-xs break-words" style={{ color: m.sender === 'user' ? 'white' : '#111827' }}>{m.text}</p>
                        <span className="text-[8px] font-bold block mt-1 text-right" style={{ color: m.sender === 'user' ? 'rgba(255,255,255,0.7)' : '#94A3B8' }}>
                          {m.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Chat input block */}
                  <form onSubmit={handleSendChat} className="flex items-center space-x-1.5 select-none">
                    <input
                      type="text"
                      placeholder="Message Rider Marcus..."
                      value={userMsgInput}
                      onChange={(e) => setUserMsgInput(e.target.value)}
                      className="flex-1 bg-[#F5F5F7] text-slate-850 font-semibold text-xs px-4 py-3.5 rounded-2xl outline-none focus:ring-1 focus:ring-slate-200/50 transition-all placeholder-slate-400"
                      id="chat-user-input"
                    />
                    <button
                      type="submit"
                      className="w-11 h-11 bg-[#F15A24] hover:bg-[#E04D1B] text-white rounded-2xl shadow-sm rotate-45 hover:rotate-0 transition-all duration-300 flex items-center justify-center cursor-pointer shrink-0"
                      title="Send Message"
                      id="btn-send-message"
                    >
                      <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB D: PROFILE & SAVED OPTIONS */}
          {activeTab === 'profile' && (
            <motion.div
              key="profile-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full"
            >
              <ProfileDashboard
                addresses={addresses}
                paymentMethods={paymentMethods}
                onAddAddress={handleAddAddress}
                onDeleteAddress={handleDeleteAddress}
                onSetDefaultAddress={handleSetDefaultAddress}
                onAddPaymentMethod={handleAddPaymentMethod}
                onDeletePaymentMethod={handleDeletePaymentMethod}
                onSetDefaultPaymentMethod={handleSetDefaultPaymentMethod}
                userEmail={user?.email || "iheboucief@gmail.com"}
              />
            </motion.div>
          )}

          {/* TAB E: DRIVER COMPANION APP */}
          {activeTab === 'driver' && (
            <motion.div
              key="driver-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full"
            >
              <DriverCompanion
                activeOrder={activeOrder}
                messages={messages}
                onSendMessage={handleDriverSendMessage}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onAutoPlaceDemoOrder={handleAutoPlaceDemoOrder}
                userEmail={user?.email || "iheboucief@gmail.com"}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. Sliding Shopping Cart Side Drawer overlay */}
      <AnimatePresence>
        {isCartDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end" id="cart-drawer-overlay">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
            />

            {/* Side Drawer panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%', transition: { type: 'tween', duration: 0.25 } }}
              className="relative w-full max-w-md bg-white border-l border-slate-205 shadow-2xl h-full flex flex-col justify-between text-slate-800"
              id="shopping-cart-drawer"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100/80 flex items-center justify-between col-span-1">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setIsCartDrawerOpen(false)}
                    className="p-1.5 -ml-1 text-slate-400 hover:text-slate-800 rounded-lg transition-all cursor-pointer"
                    title="Close Cart"
                    id="close-cart-btn"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none font-sans">Your Cart</h3>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="w-10 h-10 rounded-full bg-[#FCFCFD] border border-slate-100/85 flex items-center justify-center shadow-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    id="btn-clear-cart"
                    title="Clear Cart"
                  >
                    <Trash2 className="w-4.5 h-4.5 stroke-[2]" />
                  </button>
                )}
              </div>

              {/* Items listing core */}
              <div className="flex-1 overflow-y-auto space-y-1.5 p-6 scrollbar-none" id="cart-drawer-items-list">
                {cart.length === 0 ? (
                  <div className="text-center py-24 flex flex-col items-center justify-center space-y-3">
                    <ShoppingBag className="w-12 h-12 text-slate-400 animate-bounce" />
                    <p className="text-sm font-semibold text-slate-450">Your Basket is Empty</p>
                    <p className="text-xs text-slate-500 font-sans max-w-xs leading-normal">
                      Explore our gourmet restaurant lists, select desired dishes, and they will populate this checkout box!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <AnimatePresence initial={false} mode="popLayout">
                      {cart.map((item) => {
                        const itemUnitPrice = getCartItemPrice(item);
                        const lineTotal = itemUnitPrice * item.quantity;
                        const uniqueKey = item.cartItemId || item.menuItem.id;
                        return (
                          <motion.div
                            key={uniqueKey}
                            layout
                            initial={{ opacity: 0, scale: 0.96, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: -15 }}
                            transition={{ type: "spring", stiffness: 450, damping: 30 }}
                            className="py-4 border-b border-slate-100/60 flex items-center justify-between gap-3 last:border-0"
                          >
                            <div className="flex items-center space-x-4 min-w-0 flex-1">
                              {/* Soft circular wrapper for the image */}
                              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-105 overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                                <img
                                  src={item.menuItem.image}
                                  alt={item.menuItem.name}
                                  className="w-13 h-13 object-cover rounded-xl"
                                  referrerPolicy="no-referrer"
                                />
                              </div>

                              <div className="min-w-0 space-y-1">
                                <h4 className="text-sm font-black text-slate-900 leading-snug font-sans truncate">{item.menuItem.name}</h4>
                                
                                {/* Option descriptor label e.g., Large or 330ml */}
                                <p className="text-xs font-semibold text-slate-400/95 capitalize leading-none">
                                  {item.customization?.size?.name.split(' ')[0] || 'Standard'}
                                </p>

                                {/* Customization Details */}
                                {item.customization && (
                                  <div className="flex flex-col space-y-0.5">
                                    {item.customization.side && item.customization.side.key !== 'none' && (
                                      <p className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                                        <span>↳ +${item.customization.side.price.toFixed(2)}</span>
                                        <span className="text-slate-350 font-normal">({item.customization.side.name})</span>
                                      </p>
                                    )}
                                    {item.customization.addons.length > 0 && (
                                      <p className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5 truncate max-w-[160px]">
                                        <span>↳ +${item.customization.addons.reduce((sum, a) => sum + a.price, 0).toFixed(2)} Addons</span>
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Price & Quantity Controls column on the right side */}
                            <div className="flex flex-col items-end space-y-2.5 flex-shrink-0">
                              <span className="text-sm font-black text-slate-800 font-mono">
                                ${lineTotal.toFixed(2)}
                              </span>

                              {/* Beautiful exact replica of the - 1 + quantity pill */}
                              <div className="flex items-center space-x-1 p-1 bg-[#FCFCFD] rounded-full border border-[#ECEFF2] shadow-xs select-none">
                                <button
                                  onClick={() => handleRemoveFromCart(item.menuItem, item.restaurantId, item.customization)}
                                  className="w-5.5 h-5.5 flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-850 rounded-full cursor-pointer transition-all disabled:opacity-30"
                                >
                                  <Minus className="w-3 h-3 stroke-[2.5]" />
                                </button>
                                <span className="text-xs font-black text-slate-805 px-1 font-sans min-w-[12px] text-center">{item.quantity}</span>
                                <button
                                  onClick={() => handleAddToCart(item.menuItem, item.restaurantId, item.customization, 1)}
                                  className="w-5.5 h-5.5 flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-[#F15A24] rounded-full cursor-pointer transition-all"
                                >
                                  <Plus className="w-3 h-3 stroke-[2.5]" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Checkout and cost total box */}
              {cart.length > 0 && (
                <div className="p-6 bg-white border-t border-slate-100 flex flex-col space-y-5 select-none shrink-0" id="cart-drawer-summary-block">
                  {/* Note block */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Add a note..."
                      value={cartNote}
                      onChange={(e) => setCartNote(e.target.value)}
                      className="w-full bg-[#F5F5F7] border-0 text-slate-850 placeholder-slate-400 font-sans text-xs px-4 py-3.5 rounded-2xl outline-none focus:ring-1 focus:ring-slate-200/50 transition-all font-semibold"
                    />
                  </div>

                  {/* Summary math */}
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between items-center text-xs font-extrabold text-[#7F8A9C]">
                      <span>Subtotal</span>
                      <span className="font-sans font-black text-slate-900">${cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-extrabold text-[#7F8A9C]">
                      <span>Delivery Fee</span>
                      <span className="font-sans font-black text-slate-900">${(cart[0] ? (restaurants.find(r => r.id === cart[0].restaurantId)?.deliveryFee || 2.99) : 2.99).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-100/90 pt-4 flex items-center justify-between">
                      <span className="text-sm font-sans font-black text-slate-900">Total</span>
                      <span className="font-sans text-base font-black text-slate-900">
                        ${(cartSubtotal + (cart[0] ? (restaurants.find(r => r.id === cart[0].restaurantId)?.deliveryFee || 2.99) : 2.99)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Single Checkout Button stretching across width, beautiful orange color */}
                  <button
                    onClick={() => {
                      const targetRest = restaurants.find((r) => r.id === cart[0]?.restaurantId);
                      if (targetRest) {
                        setSelectedRestaurant(targetRest || null);
                      }
                      setIsCartDrawerOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full py-4 bg-[#F15A24] hover:bg-[#E04D1B] text-white font-extrabold text-sm tracking-wide rounded-2xl shadow-md active:scale-98 transition-all cursor-pointer flex items-center justify-center font-sans uppercase"
                    id="btn-cart-procced-checkout"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Secure Payment Portal Overlay Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && cart.length > 0 && (
          <PaymentModal
            restaurant={restaurants.find((r) => r.id === cart[0].restaurantId) || restaurants[0]}
            cartItems={cart}
            addresses={addresses}
            paymentMethods={paymentMethods}
            onClose={() => setIsCheckoutOpen(false)}
            onPlaceOrder={handlePlaceOrder}
          />
        )}
      </AnimatePresence>

      {/* 5. Compact Responsive Bottom Tabbar for smaller screens */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/10 border-t border-white/10 py-2 pb-4 flex md:hidden items-center justify-around z-40 backdrop-blur-md" id="mobile-navigation-footer">
        <button
          onClick={() => { setActiveTab('explore'); setSelectedRestaurant(null); }}
          className={`flex flex-col items-center space-y-1 ${
            activeTab === 'explore' || activeTab === 'restaurant' ? 'text-rose-500' : 'text-slate-500'
          }`}
          id="mobile-nav-explore"
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Explore</span>
        </button>

        <button
          onClick={() => {
            if (activeOrder) {
              setActiveTab('tracking');
            } else {
              addNotification('No orders active 🛒', 'Add items to cart and check out to trace live updates!', 'info');
            }
          }}
          className={`flex flex-col items-center space-y-1 relative ${
            activeTab === 'tracking' ? 'text-rose-500' : 'text-slate-500'
          }`}
          id="mobile-nav-radar"
        >
          <Map className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Radar Radar</span>
          {activeOrder && activeOrder.status !== 'delivered' && (
            <span className="absolute top-0 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center space-y-1 ${
            activeTab === 'profile' ? 'text-rose-500' : 'text-slate-500'
          }`}
          id="mobile-nav-profile"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('driver')}
          className={`flex flex-col items-center space-y-1 relative ${
            activeTab === 'driver' ? 'text-amber-500' : 'text-slate-500'
          }`}
          id="mobile-nav-driver"
        >
          <Bike className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Driver App</span>
          <span className="absolute top-0 right-1.5 flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
        </button>
      </footer>

      {/* Sleek, Premium Glassmorphism Authentication Modal */}
      <AnimatePresence>
        {!token && !isGuest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in" id="auth-modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-2xl relative flex flex-col justify-between"
              id="auth-card"
            >
              <div>
                {/* Logo and title */}
                <div className="flex flex-col items-center text-center space-y-3 mb-6 select-none">
                  <svg className="w-10 h-10 text-[#F15A24] fill-current" viewBox="0 0 24 24">
                    <path d="M4.5 10.5C5.88 10.5 7 9.38 7 8C7 6.62 5.88 5.5 4.5 5.5C3.12 5.5 2 6.62 2 8C2 9.38 3.12 10.5 4.5 10.5ZM9 7C10.38 7 11.5 5.88 11.5 4.5C11.5 3.12 10.38 2 9 2C7.62 2 6.5 3.12 6.5 4.5C6.5 5.88 7.62 7 9 7ZM15 7C16.38 7 17.5 5.88 17.5 4.5C17.5 3.12 16.38 2 15 2C13.62 2 12.5 3.12 12.5 4.5C12.5 5.88 13.62 7 15 7ZM19.5 10.5C20.88 10.5 22 9.38 22 8C22 6.62 20.88 5.5 19.5 5.5C18.12 5.5 17 6.62 17 8C17 9.38 18.12 10.5 19.5 10.5ZM17.2 11.5C16.3 11.1 14.55 10.8 12 10.8C9.45 10.8 7.7 11.1 6.8 11.5C5.25 12.2 4 14.2 4 16.5C4 20.1 7.6 23 12 23C16.4 23 20 20.1 20 16.5C20 14.2 18.75 12.2 17.2 11.5Z" />
                  </svg>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight font-sans">
                    {authMode === 'login' ? 'Welcome Back to Wolfie' : 'Create Customer Account'}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold font-sans">
                    {authMode === 'login' ? 'Login with credentials to access active radar' : 'Register to unlock gourmet kitchen delivery'}
                  </p>
                </div>

                {/* Form fields */}
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {authError && (
                    <div className="text-xs text-rose-500 font-bold bg-rose-50 border border-rose-100 p-3 rounded-2xl text-center">
                      {authError}
                    </div>
                  )}

                  {authMode === 'register' && (
                    <>
                      <div>
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={authFullName}
                          onChange={(e) => setAuthFullName(e.target.value)}
                          className="w-full bg-[#F5F5F7] text-slate-850 font-semibold text-xs px-4 py-3.5 rounded-2xl outline-none border-0 focus:ring-1 focus:ring-slate-200/50 transition-all placeholder-slate-450 font-sans"
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="tel"
                          placeholder="Phone Number"
                          value={authPhone}
                          onChange={(e) => setAuthPhone(e.target.value)}
                          className="w-full bg-[#F5F5F7] text-slate-850 font-semibold text-xs px-4 py-3.5 rounded-2xl outline-none border-0 focus:ring-1 focus:ring-slate-200/50 transition-all placeholder-slate-455 font-sans"
                          required
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-[#F5F5F7] text-slate-850 font-semibold text-xs px-4 py-3.5 rounded-2xl outline-none border-0 focus:ring-1 focus:ring-slate-200/50 transition-all placeholder-slate-455 font-sans"
                      required
                    />
                  </div>

                  <div>
                    <input
                      type="password"
                      placeholder="Password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-[#F5F5F7] text-slate-850 font-semibold text-xs px-4 py-3.5 rounded-2xl outline-none border-0 focus:ring-1 focus:ring-slate-200/50 transition-all placeholder-slate-455 font-sans"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-4 bg-[#F15A24] hover:bg-[#E04D1B] disabled:bg-slate-200 text-white font-extrabold text-xs tracking-wider uppercase rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <span>{authLoading ? 'Verifying Credentials...' : authMode === 'login' ? 'Access App' : 'Create Ledger'}</span>
                  </button>
                </form>
              </div>

              {/* Mode switch */}
              <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                <button
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setAuthError('');
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-[#F15A24] transition-colors cursor-pointer"
                >
                  {authMode === 'login' ? "Don't have an account? Sign Up" : "Already registered? Sign In"}
                </button>
              </div>

              {/* Guest mode switch */}
              <div className="mt-2 text-center pb-2">
                <button
                  onClick={() => setIsGuest(true)}
                  className="text-xs font-bold text-[#F15A24] hover:text-[#E04D1B] transition-colors cursor-pointer"
                >
                  Bypass Login (Free Access to Test)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
