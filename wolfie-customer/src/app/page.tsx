'use client';
// Force Vercel rebuild to apply new ignore rules.

import { useState, useEffect, useRef } from 'react';
import { apiRequest, setAuthToken, getAuthToken, setAuthUserId, getAuthUserId } from '@/utils/api';
import { connectSocket, disconnectSocket, getSocket } from '@/utils/socket';
import dynamic from 'next/dynamic';
import HomeView from '@/components/home/HomeView';
import FoodItemDetailView from '@/components/restaurant/FoodItemDetailView';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useRestaurantMenu } from '@/hooks/useRestaurantMenu';

const RestaurantDetailView = dynamic(() => import('@/components/restaurant/RestaurantDetailView'), { ssr: false });
const CartView = dynamic(() => import('@/components/cart/CartView'), { ssr: false });
const CheckoutView = dynamic(() => import('@/components/checkout/CheckoutView'), { ssr: false });
const TrackingView = dynamic(() => import('@/components/tracking/TrackingView'), { ssr: false });
const ChatView = dynamic(() => import('@/components/chat/ChatView'), { ssr: false });
const ProfileView = dynamic(() => import('@/components/profile/ProfileView'), { ssr: false });






const MAPBOX_TOKEN = 'pk.eyJ1Ijoid29sZmllZGVsaXZlcnkiLCJhIjoiY21vcjV2YW41MXlrYTJxcGhocWtqOGRhayJ9.bDuoURrNHs2QoZQcMBQhCQ';

const fetchGPSAddress = (
  onSuccess: (address: string, name: string) => void,
  onError: (errorMsg: string) => void
) => {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    onError('Geolocation is not supported by your browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&types=address`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            const firstFeature = data.features[0];
            const fullAddress = firstFeature.place_name.replace(', United States', '');
            const placeName = firstFeature.text || 'Detected Location';
            onSuccess(fullAddress, placeName);
          } else {
            onError('No address found for these coordinates.');
          }
        } else {
          onError('Mapbox geocoding service failed.');
        }
      } catch (err) {
        console.error(err);
        onError('Failed to connect to geocoding service.');
      }
    },
    (error) => {
      console.error(error);
      let msg = 'Failed to retrieve GPS location.';
      if (error.code === error.PERMISSION_DENIED) {
        msg = 'Location permission denied by browser.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        msg = 'Location position is unavailable.';
      } else if (error.code === error.TIMEOUT) {
        msg = 'Location request timed out.';
      }
      onError(msg);
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
};


// Heart icon wrapper that handles active favorite state with exact figma paths
const HeartIcon = ({ favorite }: { favorite: boolean }) => (
  <svg width="22" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full transition-colors duration-200">
    <g clipPath="url(#clip0_0_58)">
      {/* Red solid fill inside if favorite */}
      {favorite && (
        <path 
          d="M17.25 1.85071C16.2243 1.86063 15.2152 2.11065 14.3035 2.58073C13.3918 3.05081 12.6029 3.72788 12 4.55771C11.397 3.72788 10.6081 3.05081 9.69644 2.58073C8.78476 2.11065 7.77565 1.86063 6.74996 1.85071C4.89173 1.92491 3.13848 2.73189 1.87358 4.09517C0.608672 5.45846 -0.0649657 7.26713 -4.03235e-05 9.12571C-4.03235e-05 13.6777 4.67396 18.5507 8.59996 21.8377C9.55329 22.6393 10.7589 23.0788 12.0045 23.0788C13.25 23.0788 14.4556 22.6393 15.409 21.8377C19.331 18.5507 24.009 13.6777 24.009 9.12571C24.0738 7.26563 23.399 5.45564 22.1322 4.0921C20.8653 2.72856 19.1098 1.9226 17.25 1.85071Z" 
          fill="#EF2A39"
        />
      )}
      {/* Always draw outline */}
      <path 
        d="M17.25 1.85071C16.2243 1.86063 15.2152 2.11065 14.3035 2.58073C13.3918 3.05081 12.6029 3.72788 12 4.55771C11.397 3.72788 10.6081 3.05081 9.69644 2.58073C8.78476 2.11065 7.77565 1.86063 6.74996 1.85071C4.89173 1.92491 3.13848 2.73189 1.87358 4.09517C0.608672 5.45846 -0.0649657 7.26713 -4.03235e-05 9.12571C-4.03235e-05 13.6777 4.67396 18.5507 8.59996 21.8377C9.55329 22.6393 10.7589 23.0788 12.0045 23.0788C13.25 23.0788 14.4556 22.6393 15.409 21.8377C19.331 18.5507 24.009 13.6777 24.009 9.12571C24.0738 7.26563 23.399 5.45564 22.1322 4.0921C20.8653 2.72856 19.1098 1.9226 17.25 1.85071ZM13.477 19.5387C13.0634 19.8869 12.5401 20.0779 11.9995 20.0779C11.4588 20.0779 10.9355 19.8869 10.522 19.5387C5.74196 15.5307 2.99996 11.7357 2.99996 9.12571C2.9362 8.06292 3.29424 7.01789 3.99634 6.21749C4.69844 5.4171 5.68793 4.92596 6.74996 4.85071C7.81199 4.92596 8.80148 5.4171 9.50358 6.21749C10.2057 7.01789 10.5637 8.06292 10.5 9.12571C10.5 9.52353 10.658 9.90506 10.9393 10.1864C11.2206 10.4677 11.6021 10.6257 12 10.6257C12.3978 10.6257 12.7793 10.4677 13.0606 10.1864C13.3419 9.90506 13.5 9.52353 13.5 9.12571C13.4362 8.06292 13.7942 7.01789 14.4963 6.21749C15.1984 5.4171 16.1879 4.92596 17.25 4.85071C18.312 4.92596 19.3015 5.4171 20.0036 6.21749C20.7057 7.01789 21.0637 8.06292 21 9.12571C21 11.7357 18.258 15.5307 13.477 19.5387Z" 
        fill={favorite ? "#EF2A39" : "#3C2F2F"} 
      />
    </g>
    <defs>
      <clipPath id="clip0_0_58">
        <rect width="24" height="24" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

interface FoodItem {
  id: string;
  name: string;
  brand: string;
  rating: number;
  image: string;
  description: string;
  price: number;
  deliveryTime: string;
  category?: string;
}

interface Order {
  driverName?: string;
  driverRating?: number;
  driverAvatar?: string;
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantLogo: string;
  date: string;
  items: CartItem[];
  totalPrice: number;
  status: 'Placed' | 'Preparing' | 'On the way' | 'Arrived' | 'Completed';
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'recipient';
  text: string;
  timestamp: string;
}

interface CustomizerOption {
  id: string;
  name: string;
  price: number;
}

interface CartItem {
  cartId: string;
  foodItem: FoodItem;
  size: 'S' | 'M' | 'L';
  toppings: string[];
  addons: string[];
  drinks: string[];
  spicy: number;
  quantity: number;
  pricePerUnit: number;
}

const CartIcon = ({ color = "#FFFFFF", size = 24 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-colors duration-200">
    <path d="M9 22C9.55228 22 10 21.5523 10 21C10 20.4477 9.55228 20 9 20C8.44772 20 8 20.4477 8 21C8 21.5523 8.44772 22 9 22Z" fill={color} />
    <path d="M20 22C20.5523 22 21 21.5523 21 21C21 20.4477 20.5523 20 20 20C19.4477 20 19 20.4477 19 21C19 21.5523 19.4477 22 20 22Z" fill={color} />
    <path d="M1 1H5L7.68 14.39C7.7714 14.8504 8.02191 15.264 8.38753 15.5583C8.75315 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const toppingOptions: CustomizerOption[] = [
  { id: 'top_cheddar', name: 'Cheddar Cheese', price: 0.50 },
  { id: 'top_bacon', name: 'Crispy Bacon', price: 0.80 },
  { id: 'top_onion', name: 'Grilled Onions', price: 0.30 },
  { id: 'top_egg', name: 'Fried Egg', price: 0.75 },
];

const addonOptions: CustomizerOption[] = [
  { id: 'add_fries', name: 'French Fries', price: 1.50 },
  { id: 'add_rings', name: 'Onion Rings', price: 1.80 },
  { id: 'add_mozzarella', name: 'Mozzarella Sticks', price: 2.20 },
  { id: 'add_nuggets', name: 'Chicken Nuggets', price: 2.50 },
];

const drinkOptions: CustomizerOption[] = [
  { id: 'drink_coke', name: 'Coca Cola', price: 1.00 },
  { id: 'drink_sprite', name: 'Sprite', price: 1.00 },
  { id: 'drink_orange', name: 'Orange Juice', price: 1.50 },
  { id: 'drink_water', name: 'Mineral Water', price: 0.80 },
];

interface Restaurant {
  id: string;
  name: string;
  logo: string;
  cover: string;
  rating: number;
  reviewsCount: string;
  deliveryTime: string;
  deliveryFee: number;
  minOrder: number;
  tags: string[];
  distance: number;
  isBestSeller: boolean;
  description: string;
  address?: string;
}

const restaurantsList: Restaurant[] = [
  {
    id: 'rest_wendys',
    name: "Wendy's Burger",
    logo: '/assets/restaurant_logo_wendys.png',
    cover: '/assets/restaurant_cover_wendys.png',
    rating: 4.8,
    reviewsCount: '1.2K',
    deliveryTime: '26 mins',
    deliveryFee: 0.99,
    minOrder: 15.00,
    tags: ['Burgers', 'American', 'Fast Food'],
    distance: 0.4,
    isBestSeller: true,
    description: "Wendy's is known for its square hamburger patties, which are made from fresh, never-frozen beef. Try our signature Cheeseburger, Spicy Chicken Nuggets, or double stack burger, delivered hot and fresh directly to your door in NYC."
  },
  {
    id: 'rest_mcdonalds',
    name: "McDonald's",
    logo: '/assets/restaurant_logo_mcdonalds.png',
    cover: '/assets/restaurant_cover_mcdonalds.png',
    rating: 4.5,
    reviewsCount: '850',
    deliveryTime: '18 mins',
    deliveryFee: 1.99,
    minOrder: 10.00,
    tags: ['Burgers', 'Fries', 'Fast Food'],
    distance: 0.8,
    isBestSeller: false,
    description: "McDonald's is the classic American fast-food chain. Enjoy the legendary Big Mac, Cheeseburger, golden-crisp Fries, and the world-famous Chicken McNuggets delivered fast to your location."
  },
  {
    id: 'rest_shakeshack',
    name: "Shake Shack",
    logo: '/assets/restaurant_logo_shakeshack.png',
    cover: '/assets/restaurant_cover_shakeshack.png',
    rating: 4.9,
    reviewsCount: '2.4K',
    deliveryTime: '15 mins',
    deliveryFee: 2.99,
    minOrder: 12.00,
    tags: ['Burgers', 'Shakes', 'Premium'],
    distance: 0.2,
    isBestSeller: true,
    description: "Shake Shack started as a hot dog cart in Madison Square Park and is now a global brand. Known for its 100% all-natural Angus beef ShackBurgers, flat-top dogs, crinkle-cut fries, and rich frozen custard shakes."
  }
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('home');
  const [currentView, setCurrentView] = useState<'onboarding' | 'login' | 'register' | 'otp' | 'forgot' | 'reset' | 'address_entry' | 'home' | 'detail' | 'cart' | 'checkout' | 'tracking' | 'restaurant' | 'chat'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('wolfie_auth_token')) {
      return 'home';
    }
    return 'onboarding';
  });

  // Onboarding & Auth flow states
  const [onboardingSlide, setOnboardingSlide] = useState(0);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpFlowContext, setOtpFlowContext] = useState<'register' | 'forgot'>('register');
  const [forgotOtpCode, setForgotOtpCode] = useState(['', '', '', '', '', '']);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [addressSearchInput, setAddressSearchInput] = useState('');
  const [addressSaveLabel, setAddressSaveLabel] = useState('Home');
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [welcomeAnimation, setWelcomeAnimation] = useState<'aboard' | 'back' | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant>(restaurantsList[0]);
  const [restaurantFilter, setRestaurantFilter] = useState<'near' | 'rating' | 'best_seller' | 'all'>('all');
  const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);
  const [spicyLevel, setSpicyLevel] = useState(57);
  const [portionCount, setPortionCount] = useState(2);
  const [selectedSize, setSelectedSize] = useState<'S' | 'M' | 'L'>('M');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<string[]>([]);
  const [activeCustomizerTab, setActiveCustomizerTab] = useState<'toppings' | 'addons' | 'drinks' | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showSuccessOrder, setShowSuccessOrder] = useState(false);
  const [addedToCartFeedback, setAddedToCartFeedback] = useState(false);
  const [previousView, setPreviousView] = useState<'onboarding' | 'login' | 'register' | 'otp' | 'forgot' | 'reset' | 'address_entry' | 'home' | 'detail' | 'cart' | 'checkout' | 'tracking' | 'restaurant' | 'chat'>('home');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [paymentCards, setPaymentCards] = useState([
    { id: 'card_mastercard', type: 'credit', name: 'Credit card', number: '5105 **** **** 0505', logo: '/assets/logo_mastercard.png' },
    { id: 'card_visa', type: 'debit', name: 'Debit card', number: '3566 **** **** 0505', logo: '/assets/logo_visa.png' }
  ]);
  const [selectedCardId, setSelectedCardId] = useState('card_mastercard');
  const [saveCardDetails, setSaveCardDetails] = useState(true);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentNotification, setPaymentNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [newCardCvc, setNewCardCvc] = useState('');
  const [showAddCardModal, setShowAddCardModal] = useState(false);

  // Order tracking page states
  const [showTrackingDetails, setShowTrackingDetails] = useState(false);
  const [orderedItems, setOrderedItems] = useState<CartItem[]>([]);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);
  const [driverProgress, setDriverProgress] = useState(0); // 0 to 100
  const [trackingStatus, setTrackingStatus] = useState<'received' | 'preparing' | 'ontheway' | 'arrived'>('received');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [driverRating, setDriverRating] = useState(5);
  const [restaurantRating, setRestaurantRating] = useState(5);
  const [driverComment, setDriverComment] = useState('');
  const [restaurantComment, setRestaurantComment] = useState('');

  // User Profile and Account States
  const [profilePicture, setProfilePicture] = useState('/assets/avatar.png');
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePreferFood, setProfilePreferFood] = useState<string[]>([]);
  const [profileAllergies, setProfileAllergies] = useState<string[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deliveryLocations, setDeliveryLocations] = useState<{id: string; name: string; address: string}[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneTemp, setPhoneTemp] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  interface WolfieNotification {
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
  }
  
  const [notifications, setNotifications] = useState<WolfieNotification[]>([
    { id: 'notif_1', title: 'Welcome to Wolfie! 🎉', message: 'Enjoy free delivery on your first order. Order from Manhattan\'s top-rated kitchens now!', time: '10m ago', read: false },
    { id: 'notif_2', title: 'New Store Added! 🍕', message: 'Joe\'s Pizza is now live on Wolfie. Try the legendary classic NYC slices today!', time: '1h ago', read: false },
    { id: 'notif_3', title: 'Radar Tracking Active 🚴', message: 'Your driver is tracked via Mapbox real-time telemetry on every gourmet order.', time: '1d ago', read: true }
  ]);
  
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileActiveSubSection, setProfileActiveSubSection] = useState<'main' | 'account' | 'diet' | 'payment' | 'locations' | 'password' | 'notifications' | 'orders'>('main');
  const [desktopPriceFilter, setDesktopPriceFilter] = useState<'all' | 'under3' | 'under5' | 'over5'>('all');
  const [desktopRatingFilter, setDesktopRatingFilter] = useState<'all' | 'high' | 'veryhigh'>('all');
  const [desktopTimeFilter, setDesktopTimeFilter] = useState<'all' | 'fast' | 'veryfast'>('all');
  const [restaurantTab, setRestaurantTab] = useState<'overview' | 'menu' | 'reviews'>('overview');
  
  const goBack = () => {
    const authViews = ['onboarding', 'login', 'register', 'otp', 'forgot', 'reset', 'address_entry'];
    if (previousView && !authViews.includes(previousView) && previousView !== 'chat') {
      setCurrentView(previousView);
    } else {
      setCurrentView('home');
      setActiveTab('home');
    }
  };
  const [menuActiveCategory, setMenuActiveCategory] = useState('All');
  const [restaurantReviews, setRestaurantReviews] = useState([
    { id: 'rev_1', author: 'John D.', avatar: '/assets/avatar.png', rating: 5, date: 'Today', comment: "Always fresh, hot and exactly as ordered! The Wendy's burger is a NYC classic." },
    { id: 'rev_2', author: 'Sarah M.', avatar: '/assets/user.png', rating: 4, date: 'Yesterday', comment: "Spicy chicken nuggets were super crispy. Delivery was incredibly fast." },
    { id: 'rev_3', author: 'David K.', avatar: '/assets/user.png', rating: 5, date: '3 days ago', comment: "Best fast food burgers in Manhattan. The double stack is amazing!" }
  ]);

  const staticRestaurantMenuItems = [
    { id: `${selectedRestaurant.id}_1`, name: 'Classic Burger', brand: selectedRestaurant.name, price: 8.24, image: '/assets/hamburger_1.png', category: 'Burgers' as const, description: 'Our signature beef patty with lettuce, tomato, cheese and special sauce.' },
    { id: `${selectedRestaurant.id}_2`, name: 'Veggie Deluxe Burger', brand: selectedRestaurant.name, price: 7.49, image: '/assets/hamburger_2.png', category: 'Burgers' as const, description: 'Delicious plant-based patty with fresh vegetables, cheese, and pickles.' },
    { id: `${selectedRestaurant.id}_3`, name: 'Spicy Crispy Chicken', brand: selectedRestaurant.name, price: 8.49, image: '/assets/hamburger_3.png', category: 'Burgers' as const, description: 'Crispy fried chicken breast, spicy seasoning, lettuce and mayo.' },
    { id: `${selectedRestaurant.id}_4`, name: 'Double Stack Burger', brand: selectedRestaurant.name, price: 9.99, image: '/assets/hamburger_4.png', category: 'Burgers' as const, description: 'Double beef patties, double cheese, and fresh pickles on a toasted bun.' },
    { id: `${selectedRestaurant.id}_5`, name: 'Chicken Nuggets (6 pcs)', brand: selectedRestaurant.name, price: 5.49, image: '/assets/hamburger_details.png', category: 'Chicken' as const, description: 'Tender all-white meat chicken nuggets fried to a perfect golden crisp.' }
  ];

  // Dynamic backend states
  const [restaurants, setRestaurants] = useState<Restaurant[]>(restaurantsList);
  const [dishes, setDishes] = useState<FoodItem[]>([]);
  const [restaurantMenuItems, setRestaurantMenuItems] = useState<any[]>(staticRestaurantMenuItems);

  // React Query Hooks
  const { user, isAuthenticated, updateProfile, logout: executeLogout, token } = useAuth();
  const { restaurants: fetchedRestaurants } = useRestaurants();
  const { menuItems: fetchedMenuItems } = useRestaurantMenu(selectedRestaurant?.id, selectedRestaurant?.name);

  // Sync profile data to local state variables
  useEffect(() => {
    if (user) {
      setProfileName(user.full_name || '');
      setProfileEmail(user.email || '');
      setProfilePhone(user.phone || '');
      setProfilePreferFood(user.dietary_preferences || []);
      setProfileAllergies(user.allergy_preferences || []);
    } else {
      setProfileName('');
      setProfileEmail('');
      setProfilePhone('');
      setProfilePreferFood([]);
      setProfileAllergies([]);
    }
  }, [user]);

  const handleToggleDietary = async (dietId: string) => {
    const updated = profilePreferFood.includes(dietId)
      ? profilePreferFood.filter((x) => x !== dietId)
      : [...profilePreferFood, dietId];

    setProfilePreferFood(updated);
    if (isAuthenticated) {
      try {
        await updateProfile({ dietary_preferences: updated });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleAllergy = async (allergyId: string) => {
    const updated = profileAllergies.includes(allergyId)
      ? profileAllergies.filter((x) => x !== allergyId)
      : [...profileAllergies, allergyId];

    setProfileAllergies(updated);
    if (isAuthenticated) {
      try {
        await updateProfile({ allergy_preferences: updated });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Sync fetched restaurants with state
  useEffect(() => {
    if (fetchedRestaurants && fetchedRestaurants.length > 0) {
      setRestaurants(fetchedRestaurants as any);

      // Auto-update selectedRestaurant to use the database UUID if it has a static ID
      setSelectedRestaurant(current => {
        const match = fetchedRestaurants.find(r => 
          r.name.toLowerCase() === current.name.toLowerCase() || 
          current.name.toLowerCase().includes(r.name.toLowerCase()) ||
          r.name.toLowerCase().includes(current.name.toLowerCase())
        );
        return (match || fetchedRestaurants[0] || current) as any;
      });
    }
  }, [fetchedRestaurants]);

  // Sync fetched menu items with state
  useEffect(() => {
    if (fetchedMenuItems && fetchedMenuItems.length > 0) {
      setRestaurantMenuItems(fetchedMenuItems);
    }
  }, [fetchedMenuItems]);

  // Load all dishes dynamically
  useEffect(() => {
    const fetchAllDishes = async () => {
      if (!getAuthToken()) return;
      const pooledDishes: FoodItem[] = [];
      for (const rest of restaurants) {
        const res = await apiRequest(`/restaurants/menu?restaurant_id=${rest.id}`);
        if (res.success && res.data && res.data.menu) {
          const mapped = res.data.menu.map((item: any) => ({
            id: item.id,
            name: item.name,
            brand: rest.name,
            rating: rest.rating,
            image: item.image_url || '/assets/hamburger_1.png',
            description: item.description,
            price: item.price,
            deliveryTime: rest.deliveryTime,
            category: item.category
          }));
          pooledDishes.push(...mapped);
        }
      }
      if (pooledDishes.length > 0) {
        setDishes(pooledDishes);
      }
    };
    if (restaurants.length > 0 && getAuthToken()) {
      fetchAllDishes();
    }
  }, [restaurants]);

  // WebSocket Live GPS Radar tracking listener
  useEffect(() => {
    if (currentView !== 'tracking') return;

    const socket = connectSocket();
    const activeOrder = orders.find(o => o.status !== 'Completed');
    const orderId = activeOrder ? activeOrder.id : null;

    if (orderId && socket) {
      console.log(`[Socket.IO] Joining order room: order_${orderId}`);
      socket.emit('join_order', { order_id: orderId });

      socket.on('driver_location', (data: any) => {
        console.log('[Socket.IO] Received driver location:', data);
        if (data.lat && data.lng) {
          setDriverCoords([data.lng, data.lat]);
          
          const markerObj = (window as any).desktopDriverMarker;
          if (markerObj) {
            markerObj.setLngLat([data.lng, data.lat]);
          }
          if (driverMarkerRef.current) {
            driverMarkerRef.current.setLngLat([data.lng, data.lat]);
          }
        }
      });

      socket.on('order_status_update', (data: any) => {
        console.log('[Socket.IO] Received order status update:', data);
        if (data.status) {
          let mappedStatus: 'received' | 'preparing' | 'ontheway' | 'arrived' = 'received';
          if (['assigned', 'accepted', 'preparing'].includes(data.status)) {
            mappedStatus = 'preparing';
          } else if (['ready', 'picked_up', 'on_the_way'].includes(data.status)) {
            mappedStatus = 'ontheway';
          } else if (data.status === 'delivered') {
            mappedStatus = 'arrived';
            setShowFeedbackModal(true);
          }
          setTrackingStatus(mappedStatus);
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: data.status } : o));
        }
      });

      socket.on('chat_message', (data: any) => {
        console.log('[Socket.IO] Received chat message:', data);
        if (data.message && data.sender !== 'customer') {
          const newMsg: ChatMessage = {
            id: `msg_${Date.now()}`,
            sender: 'recipient',
            text: data.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          if (chatRecipient === 'support') {
            setSupportMessages(prev => [...prev, newMsg]);
          } else {
            setDriverMessages(prev => [...prev, newMsg]);
          }
        }
      });
    }

    return () => {
      if (orderId && socket) {
        socket.emit('leave_order', { order_id: orderId });
        socket.off('driver_location');
        socket.off('order_status_update');
        socket.off('chat_message');
      }
    };
  }, [currentView, mapboxLoaded]);

  const sendMessageOverSocket = (text: string) => {
    const socket = getSocket();
    const activeOrder = orders.find(o => o.status !== 'Completed');
    const orderId = activeOrder ? activeOrder.id : null;

    if (socket && orderId) {
      socket.emit('order_chat', {
        order_id: orderId,
        message: text,
        sender_type: 'customer',
        sender_id: getAuthUserId()
      });
    }
  };

  // Auth Submit Handlers
  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    const email = customEmail || authEmail;
    const password = customPassword || authPassword;
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true
    });

    if (res.fallback) {
      alert("Failed to connect to the server. Please check your internet connection.");
      return;
    }

    if (res.success && res.data) {
      setAuthToken(res.data.access_token);
      setAuthUserId(res.data.user_id);
      
      const profileRes = await apiRequest('/auth/me');
      if (profileRes.success && profileRes.data) {
        setProfileName(profileRes.data.full_name || '');
        setProfileEmail(profileRes.data.email || email);
        setProfilePhone(profileRes.data.phone || '');
        setProfilePreferFood(profileRes.data.dietary_preferences || []);
        setProfileAllergies(profileRes.data.allergy_preferences || []);
      } else {
        setProfileName(res.data.full_name || res.data.email || email);
        setProfileEmail(email);
      }
      
      connectSocket();

      setWelcomeAnimation('back');
      setTimeout(() => {
        setWelcomeAnimation(null);
        setCurrentView('home');
      }, 2000);
    } else {
      alert(res.error || "Login failed. Please check your credentials.");
    }
  };

  const handleRequestOtp = async () => {
    if (!authFullName || !authEmail || !authPhone || !authPassword) {
      alert("Please fill in all registration fields.");
      return;
    }
    
    const regRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        email: authEmail,
        password: authPassword,
        full_name: authFullName,
        phone: authPhone,
        role: 'customer'
      },
      skipAuth: true
    });

    if (regRes.fallback) {
      alert("Failed to connect to the server. Please check your internet connection.");
      return;
    }

    if (regRes.success && regRes.data) {
      setAuthToken(regRes.data.access_token);
      setAuthUserId(regRes.data.user_id);
      setProfileName(authFullName);
      setProfileEmail(authEmail);
      setProfilePhone(authPhone);
      
      connectSocket();

      setWelcomeAnimation('back');
      setTimeout(() => {
        setWelcomeAnimation(null);
        setCurrentView('address_entry');
      }, 2000);
    } else {
      alert(regRes.error || "Registration failed. Please check your credentials.");
    }
  };

  const handleVerifyOtpAndRegister = async () => {
    const codeStr = otpCode.join('');
    if (codeStr.length < 4) {
      alert("Please enter the complete verification code.");
      return;
    }

    const verifyRes = await apiRequest('/auth/otp/verify', {
      method: 'POST',
      body: { phone: authPhone, code: codeStr },
      skipAuth: true
    });

    if (!verifyRes.success) {
      alert(verifyRes.error || "Invalid verification code.");
      return;
    }

    const regRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        email: authEmail,
        password: authPassword,
        full_name: authFullName,
        phone: authPhone,
        role: 'customer'
      },
      skipAuth: true
    });

    if (regRes.fallback) {
      alert("Failed to connect to the server. Please check your internet connection.");
      return;
    }

    if (regRes.success && regRes.data) {
      setAuthToken(regRes.data.access_token);
      setAuthUserId(regRes.data.user_id);
      setProfileName(authFullName);
      setProfileEmail(authEmail);
      setProfilePhone(authPhone);
      
      // Seed default preferences in backend database
      await apiRequest('/auth/me', {
        method: 'PATCH',
        body: {
          dietary_preferences: profilePreferFood,
          allergy_preferences: profileAllergies
        }
      });
      
      connectSocket();
      
      setCurrentView('address_entry');
    } else {
      alert(regRes.error || "Registration failed.");
    }
  };

  const processOrderPayment = async (total: number) => {
    setIsProcessingPayment(true);
    const activeCard = paymentCards.find(c => c.id === selectedCardId);
    const customerId = getAuthUserId() || 'guest_id';
    
    const itemsPayload = cartItems.map(item => ({
      id: item.foodItem.id,
      name: item.foodItem.name,
      price: item.pricePerUnit,
      quantity: item.quantity
    }));

    const orderPayload = {
      customer_id: customerId,
      restaurant_id: selectedRestaurant.id,
      items: itemsPayload,
      pickup_address: selectedRestaurant.address || '123 Main St, New York, NY',
      delivery_address: deliveryAddress || '123 Main St, NY',
      payment_method: 'cash'
    };

    const res = await apiRequest('/orders/', {
      method: 'POST',
      body: orderPayload
    });

    setIsProcessingPayment(false);

    if (res.fallback) {
      alert("Failed to place order. Connection to the server lost.");
      return;
    }

    if (res.success && res.data) {
      setPaymentNotification({
        type: 'success',
        message: `Order Confirmed! ${selectedRestaurant.name} is being prepared.`
      });

      const newOrder: Order = {
        id: res.data.order_id,
        restaurantId: selectedRestaurant.id,
        restaurantName: selectedRestaurant.name,
        restaurantLogo: selectedRestaurant.logo,
        date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        items: [...cartItems],
        totalPrice: total,
        status: 'Placed'
      };

      setOrders(prev => [newOrder, ...prev]);
      setOrderedItems([...cartItems]);
      setCartItems([]);
      setShowSuccessOrder(true);
    } else {
      setPaymentNotification({
        type: 'error',
        message: res.error || 'Payment failed. Please try again.'
      });
    }

    setTimeout(() => {
      setPaymentNotification(null);
    }, 4000);
  };

  const getCartQuantity = (itemId: string) => {
    const cartItem = cartItems.find(c => c.foodItem.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  const getNavigationList = () => {
    if (previousView === 'restaurant') {
      return restaurantMenuItems;
    }
    return activeDishes;
  };

  const navigateItem = (dir: 'prev' | 'next') => {
    const navList = getNavigationList();
    if (navList.length <= 1 || !selectedFoodItem) return;
    const currentIndex = navList.findIndex(x => x.id === selectedFoodItem.id);
    if (currentIndex === -1) return;
    
    let targetIndex = dir === 'prev' 
      ? (currentIndex - 1 + navList.length) % navList.length 
      : (currentIndex + 1) % navList.length;
      
    const targetItem = navList[targetIndex] as any;
    
    const mappedItem: FoodItem = {
      id: targetItem.id,
      name: targetItem.name,
      brand: targetItem.brand,
      rating: targetItem.rating || selectedRestaurant.rating,
      image: targetItem.image,
      description: targetItem.description || "Fresh and delicious food prepared with high-quality ingredients.",
      price: targetItem.price,
      deliveryTime: targetItem.deliveryTime || selectedRestaurant.deliveryTime
    };
    
    setSelectedFoodItem(mappedItem);
    setPortionCount(2);
    setSpicyLevel(57);
    setSelectedSize('M');
    setSelectedToppings([]);
    setSelectedAddons([]);
    setSelectedDrinks([]);
    setActiveCustomizerTab(null);
  };

  const addRestaurantItemToCart = (item: any) => {
    const existingIndex = cartItems.findIndex(c => c.foodItem.id === item.id);
    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      setCartItems(updated);
    } else {
      const mockFood: FoodItem = {
        id: item.id,
        name: item.name,
        brand: item.brand,
        rating: 4.8,
        image: item.image,
        description: `Delicious ${item.name} from Wendy's.`,
        price: item.price,
        deliveryTime: '25 mins'
      };
      const newCart: CartItem = {
        cartId: `cart_${Date.now()}`,
        foodItem: mockFood,
        size: 'M',
        toppings: [],
        addons: [],
        drinks: [],
        spicy: 57,
        quantity: 1,
        pricePerUnit: item.price
      };
      setCartItems(prev => [...prev, newCart]);
    }
  };

  const removeRestaurantItemFromCart = (item: any) => {
    const existingIndex = cartItems.findIndex(c => c.foodItem.id === item.id);
    if (existingIndex > -1) {
      const updated = [...cartItems];
      if (updated[existingIndex].quantity > 1) {
        updated[existingIndex].quantity -= 1;
        setCartItems(updated);
      } else {
        setCartItems(prev => prev.filter(c => c.foodItem.id !== item.id));
      }
    }
  };

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      const activeToken = token || localStorage.getItem('access_token');
      const res = await fetch('https://wolfie-backend-pt9u.onrender.com/api/v1/uploads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeToken}`,
        },
        body: formData,
      });
      if (!res.ok) {
        throw new Error('Upload failed');
      }
      const data = await res.json();
      const imageUrl = data.url;
      if (imageUrl) {
        setProfilePicture(imageUrl);
        if (isAuthenticated) {
          await updateProfile({ profile_picture: imageUrl });
        }
        setProfileMessage({ type: 'success', text: 'Profile picture uploaded and saved!' });
        setTimeout(() => setProfileMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload profile picture. Please make sure you are logged in.');
    }
  };

  const mapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  
  const desktopMapContainerRef = useRef<HTMLDivElement>(null);
  const desktopMapRef = useRef<any>(null);
  
  const [driverCoords, setDriverCoords] = useState<number[]>([8.4410, 36.8990]);

  const restaurantCoords = [8.4410, 36.8990]; // El Port de El Kala
  const clientCoords = [8.4433, 36.8956]; // Client (El Kala Center)

  // Real street coordinates path in El Kala from Port to Center
  const routeCoordinates = [
    [8.4410, 36.8990], // El Port de El Kala
    [8.4415, 36.8980], // Port exit road
    [8.4420, 36.8970], // Rue de Port
    [8.4428, 36.8962], // Near Center Roundabout
    [8.4433, 36.8956]  // El Kala Town Center
  ];

  // Helper to interpolate position along multi-segment street coordinates path
  const getInterpolatedCoordinates = (points: number[][], progress: number): number[] => {
    if (points.length === 0) return [0, 0];
    if (points.length === 1 || progress <= 0) return points[0];
    if (progress >= 1) return points[points.length - 1];
    
    const numSegments = points.length - 1;
    const segmentProgress = progress * numSegments;
    const segmentIndex = Math.floor(segmentProgress);
    const segmentRemainder = segmentProgress - segmentIndex;
    
    const start = points[segmentIndex];
    const end = points[segmentIndex + 1];
    
    const lng = start[0] + (end[0] - start[0]) * segmentRemainder;
    const lat = start[1] + (end[1] - start[1]) * segmentRemainder;
    
    return [lng, lat];
  };

  // OTP Countdown timer effect
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Load Mapbox GL JS and CSS dynamically
  useEffect(() => {
    if (currentView !== 'tracking') return;
    
    if ((window as any).mapboxgl) {
      setMapboxLoaded(true);
      return;
    }
    
    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
    script.async = true;
    script.onload = () => {
      setMapboxLoaded(true);
    };
    document.head.appendChild(script);
  }, [currentView]);

  // Initialize Mapbox map & markers
  useEffect(() => {
    if (currentView !== 'tracking' || !mapboxLoaded || !mapContainerRef.current) return;
    
    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl) return;
    
    mapboxgl.accessToken = 'pk.eyJ1Ijoid29sZmllZGVsaXZlcnkiLCJhIjoiY21vcjV2YW41MXlrYTJxcGhocWtqOGRhayJ9.bDuoURrNHs2QoZQcMBQhCQ';
    
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/navigation-day-v1',
      center: [
        (restaurantCoords[0] + clientCoords[0]) / 2,
        (restaurantCoords[1] + clientCoords[1]) / 2
      ],
      zoom: 15,
      pitch: 45,
      bearing: -17.6
    });
    
    mapRef.current = map;
    
    map.on('load', () => {
      // 1. Restaurant Marker
      const elRes = document.createElement('div');
      elRes.style.width = '38px';
      elRes.style.height = '38px';
      elRes.style.backgroundColor = '#EF2A39';
      elRes.style.borderRadius = '50%';
      elRes.style.border = '3px solid white';
      elRes.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
      elRes.style.display = 'flex';
      elRes.style.alignItems = 'center';
      elRes.style.justifyContent = 'center';
      elRes.innerHTML = '<span style="font-size: 18px;">🍔</span>';
      
      new mapboxgl.Marker(elRes)
        .setLngLat(restaurantCoords)
        .addTo(map);
        
      // 2. Client Marker
      const elCli = document.createElement('div');
      elCli.style.width = '38px';
      elCli.style.height = '38px';
      elCli.style.backgroundColor = '#3C2F2F';
      elCli.style.borderRadius = '50%';
      elCli.style.border = '3px solid white';
      elCli.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
      elCli.style.display = 'flex';
      elCli.style.alignItems = 'center';
      elCli.style.justifyContent = 'center';
      elCli.innerHTML = '<span style="font-size: 18px;">🏠</span>';
      
      new mapboxgl.Marker(elCli)
        .setLngLat(clientCoords)
        .addTo(map);
        
      // 3. Route Line
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates
          }
        }
      });
      
      map.addLayer({
        id: 'route-layer',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#EF2A39',
          'line-width': 5,
          'line-dasharray': [1.5, 1.5]
        }
      });
      
      // 4. Driver Marker (yellow pulsating with car icon)
      const elDriver = document.createElement('div');
      elDriver.style.width = '44px';
      elDriver.style.height = '44px';
      elDriver.style.backgroundColor = '#FFE100';
      elDriver.style.borderRadius = '50%';
      elDriver.style.border = '3px solid white';
      elDriver.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      elDriver.style.display = 'flex';
      elDriver.style.alignItems = 'center';
      elDriver.style.justifyContent = 'center';
      elDriver.style.position = 'relative';
      
      const pulseRing = document.createElement('div');
      pulseRing.className = 'pulse-ring';
      pulseRing.style.position = 'absolute';
      pulseRing.style.inset = '-10px';
      pulseRing.style.borderRadius = '50%';
      pulseRing.style.border = '3px solid #FFE100';
      pulseRing.style.opacity = '0.7';
      elDriver.appendChild(pulseRing);
      
      const carIcon = document.createElement('span');
      carIcon.style.fontSize = '22px';
      carIcon.style.zIndex = '2';
      carIcon.innerText = '🚗';
      elDriver.appendChild(carIcon);
      
      const driverMarker = new mapboxgl.Marker(elDriver)
        .setLngLat(restaurantCoords)
        .addTo(map);
        
      driverMarkerRef.current = driverMarker;
    });
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      driverMarkerRef.current = null;
    };
  }, [currentView, mapboxLoaded]);

  // Onboarding auto-scroll timer
  useEffect(() => {
    if (currentView !== 'onboarding' && currentView !== 'login' && currentView !== 'register') return;
    const interval = setInterval(() => {
      setOnboardingSlide((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, [currentView]);

  // Driver route interpolation loop
  useEffect(() => {
    if (currentView !== 'tracking') return;
    
    let startTime = Date.now();
    const duration = 24000; // 24 seconds loop
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % duration) / duration; // 0 to 1
      
      let status: 'received' | 'preparing' | 'ontheway' | 'arrived' = 'received';
      let currentDriverCoords = [...restaurantCoords];
      
      if (progress < 0.15) {
        status = 'received';
      } else if (progress < 0.4) {
        status = 'preparing';
      } else if (progress < 0.9) {
        status = 'ontheway';
        const driveProgress = (progress - 0.4) / 0.5; // scale from 0 to 1
        currentDriverCoords = getInterpolatedCoordinates(routeCoordinates, driveProgress);
      } else {
        status = 'arrived';
        currentDriverCoords = [...clientCoords];
        setTrackingStatus('arrived');
        setDriverProgress(100);
        setDriverCoords(currentDriverCoords);
        setShowFeedbackModal(true);
        if (driverMarkerRef.current) {
          driverMarkerRef.current.setLngLat(currentDriverCoords);
        }
        clearInterval(interval);
        return;
      }
      
      setTrackingStatus(status);
      setDriverProgress(progress * 100);
      setDriverCoords(currentDriverCoords);
      
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLngLat(currentDriverCoords);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [currentView, mapboxLoaded]);

  // Initialize Desktop Mapbox map
  useEffect(() => {
    if (!mapboxLoaded || !desktopMapContainerRef.current) return;
    
    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl) return;
    
    mapboxgl.accessToken = 'pk.eyJ1Ijoid29sZmllZGVsaXZlcnkiLCJhIjoiY21vcjV2YW41MXlrYTJxcGhocWtqOGRhayJ9.bDuoURrNHs2QoZQcMBQhCQ';
    
    const dMap = new mapboxgl.Map({
      container: desktopMapContainerRef.current,
      style: 'mapbox://styles/mapbox/navigation-day-v1',
      center: [8.4433, 36.8956], // El Kala
      zoom: 14.2,
      pitch: 35,
      bearing: -17.6
    });
    
    desktopMapRef.current = dMap;
    
    dMap.on('load', () => {
      const wendysCoords = [8.4410, 36.8990];
      const mcdonaldsCoords = [8.4450, 36.8970];
      const shakeshackCoords = [8.4380, 36.8960];

      const addRestaurantMarker = (coords: number[], name: string, rObj: any, emoji: string) => {
        const el = document.createElement('div');
        el.className = 'cursor-pointer hover:scale-110 transition-transform';
        el.style.width = '42px';
        el.style.height = '42px';
        el.style.backgroundColor = '#EF2A39';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 6px 15px rgba(239,42,57,0.3)';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.innerHTML = `<span style="font-size: 20px;">${emoji}</span>`;
        
        el.onclick = () => {
          setSelectedRestaurant(rObj);
          setPreviousView(currentView);
          setCurrentView('restaurant');
        };

        new mapboxgl.Marker(el)
          .setLngLat(coords)
          .addTo(dMap);
      };

      const wRest = restaurants.find(r => r.name.includes("Wendy")) || restaurants[0] || restaurantsList[0];
      const mRest = restaurants.find(r => r.name.includes("McDonald")) || restaurants[1] || restaurantsList[1];
      const sRest = restaurants.find(r => r.name.includes("Shake")) || restaurants[2] || restaurantsList[2];

      addRestaurantMarker(wendysCoords, "Wendy's Burger", wRest, "🍔");
      addRestaurantMarker(mcdonaldsCoords, "McDonald's", mRest, "🍟");
      addRestaurantMarker(shakeshackCoords, "Shake Shack", sRest, "🥤");
    });

    return () => {
      dMap.remove();
    };
  }, [mapboxLoaded, restaurants, currentView]);

  // Synchronize Active Tracking Route on Desktop Map
  useEffect(() => {
    const dMap = desktopMapRef.current;
    if (!dMap || !mapboxLoaded) return;

    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl) return;

    const routeSourceId = 'desktop-route';
    const driverMarkerId = 'desktop-driver-marker';

    if (currentView === 'tracking') {
      dMap.flyTo({
        center: [
          (restaurantCoords[0] + clientCoords[0]) / 2,
          (restaurantCoords[1] + clientCoords[1]) / 2
        ],
        zoom: 15.2,
        pitch: 45,
        essential: true
      });

      if (!dMap.getSource(routeSourceId)) {
        dMap.addSource(routeSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeCoordinates
            }
          }
        });

        dMap.addLayer({
          id: 'desktop-route-layer',
          type: 'line',
          source: routeSourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#EF2A39',
            'line-width': 6,
            'line-dasharray': [1.5, 1.5]
          }
        });
      }

      let markerEl = document.getElementById(driverMarkerId);
      if (!markerEl) {
        markerEl = document.createElement('div');
        markerEl.id = driverMarkerId;
        markerEl.style.width = '44px';
        markerEl.style.height = '44px';
        markerEl.style.backgroundColor = '#FFE100';
        markerEl.style.borderRadius = '50%';
        markerEl.style.border = '3px solid white';
        markerEl.style.boxShadow = '0 6px 18px rgba(255,225,0,0.5)';
        markerEl.style.display = 'flex';
        markerEl.style.alignItems = 'center';
        markerEl.style.justifyContent = 'center';
        markerEl.className = 'animate-pulse';
        markerEl.innerHTML = '<span style="font-size: 20px;">🛵</span>';

        (window as any).desktopDriverMarker = new mapboxgl.Marker(markerEl)
          .setLngLat(driverCoords)
          .addTo(dMap);
      } else {
        const markerObj = (window as any).desktopDriverMarker;
        if (markerObj) {
          markerObj.setLngLat(driverCoords);
        }
      }
    } else {
      if (dMap.getLayer('desktop-route-layer')) {
        dMap.removeLayer('desktop-route-layer');
      }
      if (dMap.getSource(routeSourceId)) {
        dMap.removeSource(routeSourceId);
      }
      const markerObj = (window as any).desktopDriverMarker;
      if (markerObj) {
        markerObj.remove();
        (window as any).desktopDriverMarker = null;
      }
      dMap.flyTo({
        center: [8.4433, 36.8956], // El Kala Center
        zoom: 14.2,
        pitch: 35,
        essential: true
      });
    }
  }, [currentView, mapboxLoaded, driverCoords]);


  const toggleOption = (id: string, type: 'toppings' | 'addons' | 'drinks') => {
    if (type === 'toppings') {
      setSelectedToppings(prev =>
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
    } else if (type === 'addons') {
      setSelectedAddons(prev =>
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
    } else if (type === 'drinks') {
      setSelectedDrinks(prev =>
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
    }
  };

  const addToCart = () => {
    if (!selectedFoodItem) return;
    
    const basePrice = selectedSize === 'S' 
      ? selectedFoodItem.price - 0.50 
      : selectedSize === 'L' 
        ? selectedFoodItem.price + 1.00 
        : selectedFoodItem.price;

    const toppingsPrice = selectedToppings.reduce((sum, id) => sum + (toppingOptions.find(o => o.id === id)?.price || 0), 0);
    const addonsPrice = selectedAddons.reduce((sum, id) => sum + (addonOptions.find(o => o.id === id)?.price || 0), 0);
    const drinksPrice = selectedDrinks.reduce((sum, id) => sum + (drinkOptions.find(o => o.id === id)?.price || 0), 0);
    const pricePerUnit = basePrice + toppingsPrice + addonsPrice + drinksPrice;

    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => 
        item.foodItem.id === selectedFoodItem.id &&
        item.size === selectedSize &&
        JSON.stringify(item.toppings.sort()) === JSON.stringify(selectedToppings.sort()) &&
        JSON.stringify(item.addons.sort()) === JSON.stringify(selectedAddons.sort()) &&
        JSON.stringify(item.drinks.sort()) === JSON.stringify(selectedDrinks.sort()) &&
        item.spicy === spicyLevel
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += portionCount;
        return updated;
      } else {
        const newItem: CartItem = {
          cartId: `${selectedFoodItem.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          foodItem: selectedFoodItem,
          size: selectedSize,
          toppings: [...selectedToppings],
          addons: [...selectedAddons],
          drinks: [...selectedDrinks],
          spicy: spicyLevel,
          quantity: portionCount,
          pricePerUnit
        };
        return [...prev, newItem];
      }
    });

    // Reset customization options for the next add
    setSelectedToppings([]);
    setSelectedAddons([]);
    setSelectedDrinks([]);
    setActiveCustomizerTab(null);

    setAddedToCartFeedback(true);
    setTimeout(() => setAddedToCartFeedback(false), 1500);
  };

  const addToCartDirect = (item: FoodItem) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(cItem => 
        cItem.foodItem.id === item.id &&
        cItem.size === 'M' &&
        cItem.toppings.length === 0 &&
        cItem.addons.length === 0 &&
        cItem.drinks.length === 0 &&
        cItem.spicy === 57
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      } else {
        const newItem: CartItem = {
          cartId: `${item.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          foodItem: item,
          size: 'M',
          toppings: [],
          addons: [],
          drinks: [],
          spicy: 57,
          quantity: 1,
          pricePerUnit: item.price
        };
        return [...prev, newItem];
      }
    });
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (cartId: string) => {
    setCartItems(prev => prev.filter(item => item.cartId !== cartId));
  };

  const reorderCart = () => {
    if (cartItems.length === 0) {
      const defaultItems: CartItem[] = [
        {
          cartId: `default_1_${Date.now()}`,
          foodItem: foodItems[0],
          size: 'M',
          toppings: ['top_cheddar', 'top_bacon'],
          addons: ['add_fries'],
          drinks: ['drink_coke'],
          spicy: 57,
          quantity: 2,
          pricePerUnit: foodItems[0].price + 0.50 + 0.80 + 1.50 + 1.00
        },
        {
          cartId: `default_2_${Date.now()}`,
          foodItem: foodItems[1],
          size: 'L',
          toppings: ['top_onion'],
          addons: [],
          drinks: ['drink_orange'],
          spicy: 20,
          quantity: 1,
          pricePerUnit: foodItems[1].price + 1.00 + 0.30 + 1.50
        }
      ];
      setCartItems(defaultItems);
      return;
    }

    setCartItems(prev => [
      ...prev,
      ...prev.map(item => ({
        ...item,
        cartId: `${item.foodItem.id}_reorder_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      }))
    ]);
  };

  const categories = [
    { name: 'All', width: 'w-[75px]' },
    { name: 'Near Me', width: 'w-[105px]' },
    { name: 'Delivery Price', width: 'w-[135px]' },
    { name: 'CLOSE', width: 'w-[100px]' },
    { name: 'TOP RATING', width: 'w-[125px]' },
    { name: 'Classic', width: 'w-[110px]' }
  ];

  const foodItems: FoodItem[] = [
    {
      id: 'food_1',
      name: 'Cheeseburger',
      brand: "Wendy's Burger",
      rating: 4.9,
      image: '/assets/hamburger_1.png',
      description: "The Cheeseburger Wendy's Burger is a classic fast food burger that packs a punch of flavor in every bite. Made with a juicy beef patty cooked to perfection, it's topped with melted American cheese, crispy lettuce, ripe tomato, and crunchy pickles.",
      price: 4.12,
      deliveryTime: '26 mins',
      category: 'Burgers'
    },
    {
      id: 'food_2',
      name: 'Veggie Hamburger',
      brand: 'Veggie Deluxe',
      rating: 4.8,
      image: '/assets/hamburger_2.png',
      description: "The Veggie Hamburger is a delicious plant-based burger made from premium fresh vegetables, grains, and seasoning. It is topped with melt-in-your-mouth vegan cheese, fresh onions, lettuce, and pickles.",
      price: 3.50,
      deliveryTime: '22 mins',
      category: 'Burgers'
    },
    {
      id: 'food_3',
      name: 'Chicken Hamburger',
      brand: 'Crispy Chicken',
      rating: 4.6,
      image: '/assets/hamburger_3.png',
      description: "The Chicken Hamburger features a tender, juicy grilled chicken breast seasoned to perfection. Topped with creamy mayonnaise, fresh lettuce, tomatoes, and crispy pickles on a warm toasted bun.",
      price: 3.80,
      deliveryTime: '25 mins',
      category: 'Burgers'
    },
    {
      id: 'food_4',
      name: 'Fried Chicken Burger',
      brand: 'Spicy Fried Chicken',
      rating: 4.5,
      image: '/assets/hamburger_4.png',
      description: "The Fried Chicken Hamburger features a crispy, golden-fried chicken breast with a savory crunch. Layered with tangy sauce, lettuce, tomatoes, and sliced pickles for the ultimate taste experience.",
      price: 4.00,
      deliveryTime: '30 mins',
      category: 'Burgers'
    },
    {
      id: 'food_5',
      name: 'Double Bacon Beef Burger',
      brand: 'Shack Deluxe',
      rating: 4.9,
      image: '/assets/hamburger_details.png',
      description: "Double 100% Angus beef patties topped with applewood smoked bacon, melted cheddar cheese, and signature ShackSauce on a toasted potato bun.",
      price: 6.50,
      deliveryTime: '18 mins',
      category: 'Burgers'
    },
    {
      id: 'food_6',
      name: 'Sweet Potato Fries',
      brand: 'Gourmet Sides',
      rating: 4.7,
      image: '/assets/hamburger_1.png',
      description: "Thin-cut premium sweet potatoes, lightly salted and fried to crispy perfection. Served with a side of spicy garlic aioli.",
      price: 2.99,
      deliveryTime: '15 mins',
      category: 'Sides'
    },
    {
      id: 'food_7',
      name: 'Crispy Onion Rings',
      brand: 'Gourmet Sides',
      rating: 4.6,
      image: '/assets/hamburger_2.png',
      description: "Thick-cut sweet white onions, double-dipped in craft beer batter and fried golden-brown for a satisfying crunch.",
      price: 2.80,
      deliveryTime: '15 mins',
      category: 'Sides'
    },
    {
      id: 'food_8',
      name: 'Mozzarella Sticks',
      brand: 'Gourmet Sides',
      rating: 4.8,
      image: '/assets/hamburger_3.png',
      description: "Real Wisconsin mozzarella cheese sticks coated in seasoned Italian breadcrumbs, fried warm and melty. Served with marinara sauce.",
      price: 3.50,
      deliveryTime: 'Calculating...',
      category: 'Sides'
    },
    {
      id: 'food_9',
      name: 'Iced Pink Lemonade',
      brand: 'Beverages',
      rating: 4.7,
      image: '/assets/hamburger_4.png',
      description: "Freshly squeezed lemons with a splash of cranberry juice, served ice cold with lemon slices and mint leaves.",
      price: 2.20,
      deliveryTime: '10 mins',
      category: 'Drinks'
    },
    {
      id: 'food_10',
      name: 'Classic Vanilla Shake',
      brand: 'Beverages',
      rating: 4.9,
      image: '/assets/hamburger_details.png',
      description: "Thick and creamy hand-spun vanilla milkshake made with premium frozen custard, topped with whipped cream and a cherry.",
      price: 3.80,
      deliveryTime: '15 mins',
      category: 'Drinks'
    },
    {
      id: 'food_11',
      name: 'Truffle Parmesan Fries',
      brand: 'Chef Specials',
      rating: 4.9,
      image: '/assets/hamburger_1.png',
      description: "Golden-crisp fries tossed in premium white truffle oil, grated Parmigiano-Reggiano, and fresh chopped parsley.",
      price: 4.80,
      deliveryTime: '18 mins',
      category: 'Specials'
    },
    {
      id: 'food_12',
      name: 'Avocado Club Burger',
      brand: 'Chef Specials',
      rating: 4.8,
      image: '/assets/hamburger_3.png',
      description: "Flame-grilled chicken breast topped with fresh sliced avocado, crispy bacon, Swiss cheese, leaf lettuce, tomato, and herb mayo.",
      price: 5.50,
      deliveryTime: '22 mins',
      category: 'Specials'
    }
  ];

  const activeDishes = dishes.length > 0 ? dishes : foodItems;

  const toggleFavorite = (id: string) => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  // Favorite restaurants and Order History states
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<string[]>(['rest_wendys']);
  const [favSubTab, setFavSubTab] = useState<'items' | 'restaurants'>('items');
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'WOLF_987123',
      restaurantId: 'rest_mcdonalds',
      restaurantName: "McDonald's",
      restaurantLogo: '/assets/restaurant_logo_mcdonalds.png',
      date: 'June 10, 2026 at 07:14 PM',
      items: [
        {
          cartId: 'past_1_1',
          foodItem: foodItems[0],
          size: 'M',
          toppings: ['Melted Cheddar'],
          addons: ['Golden French Fries'],
          drinks: ['Chilled Coca-Cola'],
          spicy: 30,
          quantity: 2,
          pricePerUnit: 4.12
        }
      ],
      totalPrice: 15.50,
      status: 'Completed'
    },
    {
      id: 'WOLF_543210',
      restaurantId: 'rest_shakeshack',
      restaurantName: "Shake Shack",
      restaurantLogo: '/assets/restaurant_logo_shakeshack.png',
      date: 'June 11, 2026 at 01:30 PM',
      items: [
        {
          cartId: 'past_2_1',
          foodItem: foodItems[1],
          size: 'L',
          toppings: [],
          addons: ['Crispy Onion Rings'],
          drinks: ['Vanilla Shake'],
          spicy: 0,
          quantity: 1,
          pricePerUnit: 3.50
        }
      ],
      totalPrice: 11.20,
      status: 'Completed'
    }
  ]);

  // Dynamic backend sync for user data
  useEffect(() => {
    const syncUserData = async () => {
      const userId = getAuthUserId();
      if (!userId || currentView !== 'home') return;

      // 1. Fetch Orders
      const ordersRes = await apiRequest(`/orders/customer/${userId}?limit=50`);
      if (ordersRes.success && ordersRes.data?.orders) {
        const mappedOrders = ordersRes.data.orders.map((o: any) => ({
          id: o.id,
          restaurantId: o.restaurant_id || 'rest_wendys',
          restaurantName: o.restaurant_name || 'Restaurant',
          restaurantLogo: o.restaurant_logo || '/assets/restaurant_logo_wendys.png',
          date: new Date(o.created_at).toLocaleDateString(),
          status: o.status === 'delivered' ? 'Completed' : o.status,
          totalPrice: o.total || 0,
          items: (o.items || []).map((i: any) => ({
            foodItem: { name: i.name },
            quantity: i.quantity,
            pricePerUnit: i.price,
            size: i.size || 'M',
            toppings: [],
            addons: [],
            drinks: [],
            spicy: 0,
            cartId: `itm_${Math.random()}`
          })),
        }));
        setOrders(mappedOrders);
      }

      // 2. Fetch Addresses
      const addrRes = await apiRequest('/addresses');
      if (addrRes.success && addrRes.data?.addresses?.length > 0) {
        const mappedLocations = addrRes.data.addresses.map((a: any) => ({
          id: a.id,
          name: a.label || 'Address',
          address: a.full_address,
        }));
        setDeliveryLocations(mappedLocations);

        const defaultAddr = addrRes.data.addresses.find((a: any) => a.is_default) || addrRes.data.addresses[0];
        if (defaultAddr) {
          setDeliveryAddress(`${defaultAddr.label}: ${defaultAddr.full_address}`);
        }
      }

      // 3. Fetch Favorites
      const favRes = await apiRequest('/favorites');
      if (favRes.success && favRes.data?.favorites) {
        setFavoriteRestaurants(favRes.data.favorites.map((f: any) => f.restaurant_id));
      }
    };
    syncUserData();
  }, [currentView]);

  // Notifications setting
  useEffect(() => {
    const saved = localStorage.getItem('wolfie_notifications_enabled');
    if (saved !== null) setNotificationsEnabled(saved === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('wolfie_notifications_enabled', String(notificationsEnabled));
  }, [notificationsEnabled]);

  // Handle route view parameter and socket connectivity on mount/auth state change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam === 'tracking') {
        // Check if there is actually an active order in the orders array
        const hasActiveOrder = orders.some(o => o.status !== 'Completed');
        if (hasActiveOrder) {
          setCurrentView('tracking');
        } else {
          // If no active orders, redirect back to home and clear query param
          setCurrentView('home');
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      } else if (isAuthenticated && !params.get('view')) {
        setCurrentView('home');
      }
    }

    if (isAuthenticated) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated, orders]);

  const toggleFavoriteRestaurant = async (id: string) => {
    const isFav = favoriteRestaurants.includes(id);
    if (isFav) {
      if (getAuthToken()) await apiRequest(`/favorites/${id}`, { method: 'DELETE' });
      setFavoriteRestaurants(prev => prev.filter(rId => rId !== id));
    } else {
      if (getAuthToken()) await apiRequest('/favorites', { method: 'POST', body: { restaurant_id: id } });
      setFavoriteRestaurants(prev => [...prev, id]);
    }
  };

  // Chat page states
  const [chatRecipient, setChatRecipient] = useState<'support' | 'driver'>('support');
  const [chatInputText, setChatInputText] = useState('');
  const [aiSessionId] = useState<string>(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [isSupportTyping, setIsSupportTyping] = useState(false);
  const [supportMessages, setSupportMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'recipient',
      text: "👋 Hi! I'm Wolfie's AI Support Agent. I can help you with your orders, payments, account issues, and more. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [driverMessages, setDriverMessages] = useState<ChatMessage[]>([
    { id: 'dmsg_1', sender: 'recipient', text: "Hi! I am heading over now with your hot Wolfie order. Be there soon!", timestamp: "12:05 PM" },
    { id: 'dmsg_2', sender: 'user', text: "Sounds great, thank you! Please leave it at the front door.", timestamp: "12:06 PM" }
  ]);

  const handleSendMessage = async () => {
    if (!chatInputText.trim() || isSupportTyping) return;
    
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: chatInputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    if (chatRecipient === 'support') {
      const userText = chatInputText.trim();
      setSupportMessages(prev => [...prev, newMsg]);
      setChatInputText('');
      setIsSupportTyping(true);

      try {
        const res = await apiRequest('/support/chat', {
          method: 'POST',
          body: { message: userText, session_id: aiSessionId }
        });
        const aiText = res.success && res.data?.response
          ? res.data.response
          : "I'm sorry, I couldn't process your request right now. Please try again or contact us directly.";
        const replyMsg: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          sender: 'recipient',
          text: aiText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setSupportMessages(prev => [...prev, replyMsg]);
      } catch {
        const errMsg: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          sender: 'recipient',
          text: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setSupportMessages(prev => [...prev, errMsg]);
      } finally {
        setIsSupportTyping(false);
      }
    } else {
      setDriverMessages(prev => [...prev, newMsg]);
      sendMessageOverSocket(chatInputText.trim());
      setChatInputText('');
    }
  };

  const handleReorder = (order: Order) => {
    const reorderedItems = order.items.map(item => ({
      ...item,
      cartId: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));
    setCartItems(prev => [...prev, ...reorderedItems]);
    setPreviousView('home');
    setCurrentView('cart');
    setPaymentNotification({
      type: 'success',
      message: `Added items from ${order.restaurantName} to your cart!`
    });
    setTimeout(() => setPaymentNotification(null), 3000);
  };

  const handleTrackOrder = (order: Order) => {
    setOrderedItems(order.items);
    if (order.status === 'Placed') {
      setTrackingStatus('received');
      setDriverProgress(0);
    } else if (order.status === 'Preparing') {
      setTrackingStatus('preparing');
      setDriverProgress(15);
    } else if (order.status === 'On the way') {
      setTrackingStatus('ontheway');
      setDriverProgress(50);
    } else if (order.status === 'Arrived') {
      setTrackingStatus('arrived');
      setDriverProgress(100);
    }
    setCurrentView('tracking');
  };

  const activeOrder = orders.find(o => o.status !== 'Completed');

  const navItems = [
    { id: 'home', icon: '/assets/icon_home.svg', left: 'left-[10%]', dotLeft: 'left-[10%]' },
    { id: 'user', icon: '/assets/icon_user.svg', left: 'left-[29.07%]', dotLeft: 'left-[29.07%]' },
    { id: 'comment', icon: '/assets/icon_comment.svg', left: 'left-[71.16%]', dotLeft: 'left-[71.16%]' },
    { id: 'heart', icon: '/assets/icon_heart.svg', left: 'left-[90.23%]', dotLeft: 'left-[90.23%]' }
  ];

  const filteredFoodItems = activeDishes.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.brand.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeCategory === 'All') return matchesSearch;
    if (activeCategory === 'Near Me') return matchesSearch && parseInt(item.deliveryTime) <= 25;
    if (activeCategory === 'Delivery Price') return matchesSearch && item.price <= 3.80;
    if (activeCategory === 'CLOSE') return matchesSearch && item.rating >= 4.8;
    if (activeCategory === 'TOP RATING') return matchesSearch && item.rating >= 4.8;
    if (activeCategory === 'Classic') return matchesSearch && item.brand.includes('Burger');
    return matchesSearch;
  });

  const renderDesktopNavbar = () => {
    const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    return (
      <header className="w-full h-[88px] bg-white/95 backdrop-blur-md px-10 flex items-center justify-between sticky top-0 z-50 select-none transition-all duration-300">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setCurrentView('home'); setActiveTab('home'); }}>
          <img src="/assets/wolf_logo.png" alt="Wolfie" className="w-11 h-11 object-contain group-hover:scale-105 transition-transform" />
          <div className="text-left">
            <span className="font-lustria font-bold text-[24px] text-[#3C2F2F] tracking-wide block leading-none">WOLFIE</span>
            <span className="font-poppins font-semibold text-[8.5px] text-[#EF2A39] tracking-[0.2em] uppercase mt-0.5 block">Gourmet Delivery</span>
          </div>
        </div>

        {currentView !== 'onboarding' && currentView !== 'login' && currentView !== 'register' && currentView !== 'otp' && currentView !== 'forgot' && currentView !== 'reset' && currentView !== 'address_entry' && (
          <div className="flex items-center gap-2.5 px-4.5 py-2 bg-gray-50 border border-gray-100 hover:bg-gray-100 rounded-full cursor-pointer max-w-[320px] transition-colors">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#EF2A39" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="font-roboto font-bold text-[14px] text-[#3C2F2F] truncate">
              {deliveryAddress}
            </span>
          </div>
        )}

        {currentView !== 'onboarding' && currentView !== 'login' && currentView !== 'register' && currentView !== 'otp' && currentView !== 'forgot' && currentView !== 'reset' && currentView !== 'address_entry' && (
          <nav className="flex items-center gap-8">
            <button 
              onClick={() => { setCurrentView('home'); setActiveTab('home'); }} 
              className={`font-poppins font-bold text-[16px] cursor-pointer hover:text-[#EF2A39] transition-all relative py-1.5 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#EF2A39] after:rounded-full after:transition-transform after:duration-300 focus:outline-none ${
                activeTab === 'home' && currentView === 'home' 
                  ? 'text-[#EF2A39] after:scale-x-100' 
                  : 'text-[#A6A6A6] after:scale-x-0 hover:after:scale-x-100'
              }`}
            >
              Menu
            </button>
            <button 
              onClick={() => { setCurrentView('home'); setActiveTab('heart'); }} 
              className={`font-poppins font-bold text-[16px] cursor-pointer hover:text-[#EF2A39] transition-all relative py-1.5 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#EF2A39] after:rounded-full after:transition-transform after:duration-300 focus:outline-none ${
                activeTab === 'heart' && currentView === 'home' 
                  ? 'text-[#EF2A39] after:scale-x-100' 
                  : 'text-[#A6A6A6] after:scale-x-0 hover:after:scale-x-100'
              }`}
            >
              Favorites
            </button>
            <button 
              onClick={() => { setCurrentView('home'); setActiveTab('orders'); }} 
              className={`font-poppins font-bold text-[16px] cursor-pointer hover:text-[#EF2A39] transition-all relative py-1.5 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#EF2A39] after:rounded-full after:transition-transform after:duration-300 focus:outline-none ${
                activeTab === 'orders' && currentView === 'home' 
                  ? 'text-[#EF2A39] after:scale-x-100' 
                  : 'text-[#A6A6A6] after:scale-x-0 hover:after:scale-x-100'
              }`}
            >
              My Orders
            </button>
            <button 
              onClick={() => { setCurrentView('home'); setActiveTab('user'); setProfileActiveSubSection('account'); }} 
              className={`font-poppins font-bold text-[16px] cursor-pointer hover:text-[#EF2A39] transition-all relative py-1.5 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#EF2A39] after:rounded-full after:transition-transform after:duration-300 focus:outline-none ${
                activeTab === 'user' && currentView === 'home' 
                  ? 'text-[#EF2A39] after:scale-x-100' 
                  : 'text-[#A6A6A6] after:scale-x-0 hover:after:scale-x-100'
              }`}
            >
              Settings
            </button>
            <button 
              onClick={() => { setPreviousView(currentView); setChatRecipient('support'); setCurrentView('chat'); }} 
              className={`font-poppins font-bold text-[16px] cursor-pointer hover:text-[#EF2A39] transition-all relative py-1.5 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#EF2A39] after:rounded-full after:transition-transform after:duration-300 focus:outline-none ${
                currentView === 'chat' && chatRecipient === 'support' 
                  ? 'text-[#EF2A39] after:scale-x-100' 
                  : 'text-[#A6A6A6] after:scale-x-0 hover:after:scale-x-100'
              }`}
            >
              Support Chat
            </button>
          </nav>
        )}

        {currentView !== 'onboarding' && currentView !== 'login' && currentView !== 'register' && currentView !== 'otp' && currentView !== 'forgot' && currentView !== 'reset' && currentView !== 'address_entry' ? (
          <div className="flex items-center gap-5">
            <button 
              onClick={() => setCurrentView(currentView === 'cart' ? 'home' : 'cart')}
              className="w-12 h-12 rounded-full bg-[#FFE100] hover:brightness-95 hover:scale-105 active:scale-95 transition-all flex items-center justify-center relative shadow-sm cursor-pointer focus:outline-none"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {totalCartItems > 0 && (
                <div className="absolute -top-1.5 -right-1.5 bg-[#EF2A39] border-2 border-white text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center animate-bounce">
                  {totalCartItems}
                </div>
              )}
            </button>

            <button 
              onClick={() => { setCurrentView('home'); setActiveTab('user'); setProfileActiveSubSection('account'); }}
              className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border border-gray-200/50 cursor-pointer hover:scale-105 active:scale-95 transition-all"
            >
              <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="font-poppins font-bold text-[13px] text-[#A6A6A6] uppercase tracking-wider">Authentication Mode</span>
          </div>
        )}
      </header>
    );
  };

  const renderDesktopOnboardingForm = () => {
    const slideTitles = [
      "Your Diet, Your Rules",
      "Discover Restaurant Profiles",
      "Precision Radar Tracking"
    ];
    const slideTexts = [
      "Save your specific preferences (Healthy, Halal, Vegan) and allergy safeguards. Wolfie screens items to ensure a safe, tailored dining experience.",
      "Browse menus, read verified comments, and check out visual storefront stories modeled like your favorite social feeds.",
      "Watch driver {activeOrder?.driverName || 'Driver'} navigate the Manhattan grid street-by-street on a live Mapbox radar screen, synced with real-time status updates."
    ];

    return (
      <div className="flex flex-col text-left select-none animate-fadeIn">
        <img src="/assets/wolf_logo.png" alt="Wolfie" className="w-14 h-14 object-contain mb-4" />
        <h1 className="font-lustria font-normal text-[42px] text-[#3C2F2F] leading-none mb-1">WOLFIE</h1>
        <p className="font-poppins font-medium text-[11px] text-[#EF2A39] tracking-[0.25em] uppercase mb-8">Gourmet Delivery</p>

        <h2 className="font-poppins font-bold text-[28px] text-[#3C2F2F] mb-4">
          {slideTitles[onboardingSlide]}
        </h2>
        <p className="font-roboto font-normal text-[16px] text-[#A6A6A6] leading-relaxed mb-10">
          {slideTexts[onboardingSlide]}
        </p>

        <div className="flex gap-4">
          <button 
            onClick={() => setCurrentView('login')}
            className="w-[120px] h-[58px] bg-gray-50 border border-gray-100 hover:bg-gray-100 text-[#6A6A6A] font-roboto font-bold text-[16px] rounded-[18px] transition-all cursor-pointer focus:outline-none"
          >
            Skip
          </button>
          
          <button 
            onClick={() => {
              if (onboardingSlide < 2) {
                setOnboardingSlide(prev => prev + 1);
              } else {
                setCurrentView('login');
              }
            }}
            className="flex-1 h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[16px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-sm"
          >
            {onboardingSlide === 2 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    );
  };

  const renderDesktopLoginForm = () => {
    return (
      <div className="flex flex-col text-left animate-fadeIn">
        <h2 className="font-poppins font-bold text-[32px] text-[#3C2F2F] mb-1">Welcome Back</h2>
        <p className="font-roboto text-[15px] text-[#A6A6A6] mb-8">Sign in to search Manhattan's best kitchens</p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Email or Phone</label>
            <input 
              type="text" 
              placeholder="e.g. takahashi@wolfie.nyc"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors"
            />
          </div>
          <div>
            <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-8 text-left">
          <button 
            onClick={() => setCurrentView('forgot')}
            className="font-roboto font-bold text-[13.5px] text-[#EF2A39] hover:underline focus:outline-none cursor-pointer"
          >
            Forgot Password?
          </button>
        </div>

        <div className="space-y-3.5">
          <button 
            onClick={() => handleLogin()}
            className="w-full h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[16px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-sm"
          >
            Sign In
          </button>

          <button 
            onClick={() => {
              handleLogin(undefined, 'customer_demo@wolfie.delivery', 'password123');
            }}
            className="w-full h-[58px] bg-[#3C2F2F] hover:bg-[#2A2020] text-white font-roboto font-bold text-[15px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-md flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Bypass & Test App
          </button>
        </div>

        <p className="mt-8 text-center font-roboto text-[14px] text-[#A6A6A6]">
          Don't have an account?{' '}
          <button 
            onClick={() => setCurrentView('register')}
            className="font-bold text-[#EF2A39] hover:underline focus:outline-none cursor-pointer"
          >
            Create Account
          </button>
        </p>
      </div>
    );
  };

  const renderDesktopRegisterForm = () => {
    return (
      <div className="flex flex-col text-left animate-fadeIn">
        <h2 className="font-poppins font-bold text-[32px] text-[#3C2F2F] mb-1">Create Account</h2>
        <p className="font-roboto text-[15px] text-[#A6A6A6] mb-8">Join Wolfie for premium New York delivery</p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Full Name</label>
            <input 
              type="text" 
              placeholder="e.g. Simona Takahashi"
              value={authFullName}
              onChange={(e) => setAuthFullName(e.target.value)}
              className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors"
            />
          </div>
          <div>
            <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Email Address</label>
            <input 
              type="email" 
              placeholder="takahashi@wolfie.nyc"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors"
            />
          </div>
          <div>
            <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Phone Number</label>
            <input 
              type="text" 
              placeholder="+1 (555) 019-2831"
              value={authPhone}
              onChange={(e) => setAuthPhone(e.target.value)}
              className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors"
            />
          </div>
          <div>
            <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors"
            />
          </div>
        </div>

        <button 
          onClick={handleRequestOtp}
          className="w-full h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[16px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-sm mb-6"
        >
          Sign Up
        </button>

        <p className="text-center font-roboto text-[14px] text-[#A6A6A6]">
          Already have an account?{' '}
          <button 
            onClick={() => setCurrentView('login')}
            className="font-bold text-[#EF2A39] hover:underline focus:outline-none cursor-pointer"
          >
            Sign In
          </button>
        </p>
      </div>
    );
  };

  const renderDesktopOtpForm = () => {
    const isForgot = otpFlowContext === 'forgot';
    const codeArray = isForgot ? forgotOtpCode : otpCode;
    const setCodeArray = isForgot ? setForgotOtpCode : setOtpCode;
    const numDigits = isForgot ? 6 : 4;

    const handleVerify = async () => {
      setForgotError('');
      if (isForgot) {
        const codeStr = forgotOtpCode.join('');
        if (codeStr.length < 6) {
          setForgotError("Please enter the complete 6-digit verification code.");
          return;
        }
        setForgotLoading(true);
        const res = await apiRequest('/auth/customer/verify-reset-otp', {
          method: 'POST',
          body: { email: authEmail, otp: codeStr },
          skipAuth: true
        });
        setForgotLoading(false);
        if (res.success) {
          setCurrentView('reset');
        } else {
          setForgotError(res.error || "Invalid or expired code.");
        }
      } else {
        handleVerifyOtpAndRegister();
      }
    };

    const handleResend = async () => {
      if (otpTimer > 0) return;
      setForgotError('');
      setForgotLoading(true);
      const res = await apiRequest(isForgot ? '/auth/customer/forgot-password' : '/auth/otp/send', {
        method: 'POST',
        body: isForgot ? { email: authEmail } : { phone: authPhone },
        skipAuth: true
      });
      setForgotLoading(false);
      if (res.success) {
        setOtpTimer(60);
        if (isForgot) setForgotOtpCode(['', '', '', '', '', '']);
        else setOtpCode(['', '', '', '']);
        alert("A new verification code has been sent.");
      } else {
        setForgotError(res.error || "Failed to resend code.");
      }
    };

    return (
      <div className="flex flex-col text-left animate-fadeIn">
        <h2 className="font-poppins font-bold text-[32px] text-[#3C2F2F] mb-1">
          {isForgot ? 'Verify Email' : 'Verify Phone'}
        </h2>
        <p className="font-roboto text-[15px] text-[#A6A6A6] mb-8">
          {isForgot 
            ? 'We sent a 6-digit code to your email address.' 
            : 'We sent a 4-digit code to your phone number.'}
        </p>

        {forgotError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[12px] text-red-600 font-roboto text-[14px]">
            ⚠️ {forgotError}
          </div>
        )}

        <div className="flex justify-between gap-4 mb-8">
          {Array.from({ length: numDigits }).map((_, idx) => (
            <input 
              key={idx}
              type="text"
              maxLength={1}
              value={codeArray[idx]}
              disabled={forgotLoading}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                const updated = [...codeArray];
                updated[idx] = val;
                setCodeArray(updated);
                
                if (val && idx < numDigits - 1) {
                  const nextInput = document.getElementById(`d-otp-${idx + 1}`);
                  if (nextInput) nextInput.focus();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !codeArray[idx] && idx > 0) {
                  const prevInput = document.getElementById(`d-otp-${idx - 1}`);
                  if (prevInput) {
                    prevInput.focus();
                    const updated = [...codeArray];
                    updated[idx - 1] = '';
                    setCodeArray(updated);
                  }
                }
              }}
              id={`d-otp-${idx}`}
              className="w-16 h-16 border-2 border-gray-200 focus:border-[#EF2A39] text-center font-roboto font-bold text-[28px] rounded-[16px] outline-none transition-colors disabled:opacity-50"
            />
          ))}
        </div>

        <button 
          onClick={handleVerify}
          disabled={forgotLoading}
          className="w-full h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[16px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-sm mb-6 flex items-center justify-center disabled:opacity-50"
        >
          {forgotLoading ? 'Verifying...' : 'Verify Code'}
        </button>

        <p className="text-center font-roboto text-[14px] text-[#A6A6A6]">
          {otpTimer > 0 ? (
            `Resend code in ${otpTimer}s`
          ) : (
            <button 
              onClick={handleResend}
              disabled={forgotLoading}
              className="font-bold text-[#EF2A39] hover:underline focus:outline-none cursor-pointer disabled:opacity-50"
            >
              Resend Code
            </button>
          )}
        </p>
      </div>
    );
  };

  const renderDesktopForgotForm = () => {
    const handleSendForgot = async () => {
      if (!authEmail) {
        alert("Please enter your email address.");
        return;
      }
      setForgotError('');
      setForgotLoading(true);
      const res = await apiRequest('/auth/customer/forgot-password', {
        method: 'POST',
        body: { email: authEmail },
        skipAuth: true
      });
      setForgotLoading(false);
      if (res.success) {
        setOtpFlowContext('forgot');
        setOtpTimer(60);
        setForgotOtpCode(['', '', '', '', '', '']);
        setCurrentView('otp');
      } else {
        alert(res.error || "Failed to initiate recovery. Please try again.");
      }
    };

    return (
      <div className="flex flex-col text-left animate-fadeIn">
        <h2 className="font-poppins font-bold text-[32px] text-[#3C2F2F] mb-1">Recover Password</h2>
        <p className="font-roboto text-[15px] text-[#A6A6A6] mb-8">Enter your email to request recovery code</p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Email Address</label>
            <input 
              type="email" 
              placeholder="e.g. takahashi@wolfie.nyc"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              disabled={forgotLoading}
              className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        <button 
          onClick={handleSendForgot}
          disabled={forgotLoading}
          className="w-full h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[16px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-sm mb-6 flex items-center justify-center disabled:opacity-50"
        >
          {forgotLoading ? 'Sending...' : 'Send Code'}
        </button>

        <button 
          onClick={() => setCurrentView('login')}
          disabled={forgotLoading}
          className="w-full h-[58px] bg-white border border-gray-200 hover:bg-gray-50 text-[#3C2F2F] font-roboto font-bold text-[15px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-sm disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    );
  };

  const renderDesktopResetForm = () => {
    const handleReset = async () => {
      setForgotError('');
      if (forgotNewPassword.length < 8) {
        setForgotError("Password must be at least 8 characters.");
        return;
      }
      if (forgotNewPassword !== forgotConfirmPassword) {
        setForgotError("Passwords do not match.");
        return;
      }
      setForgotLoading(true);
      const codeStr = forgotOtpCode.join('');
      const res = await apiRequest('/auth/customer/reset-password', {
        method: 'POST',
        body: { email: authEmail, otp: codeStr, new_password: forgotNewPassword },
        skipAuth: true
      });
      setForgotLoading(false);
      if (res.success) {
        alert("Password reset successfully. Please log in.");
        setCurrentView('login');
      } else {
        setForgotError(res.error || "Failed to reset password. Please try again.");
      }
    };

    return (
      <div className="flex flex-col text-left animate-fadeIn">
        <h2 className="font-poppins font-bold text-[32px] text-[#3C2F2F] mb-1">Reset Password</h2>
        <p className="font-roboto text-[15px] text-[#A6A6A6] mb-8">Set your new account credentials</p>

        {forgotError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[12px] text-red-600 font-roboto text-[14px]">
            ⚠️ {forgotError}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">New Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={forgotNewPassword}
              disabled={forgotLoading}
              onChange={(e) => setForgotNewPassword(e.target.value)}
              className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Confirm New Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={forgotConfirmPassword}
              disabled={forgotLoading}
              onChange={(e) => setForgotConfirmPassword(e.target.value)}
              className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        <button 
          onClick={handleReset}
          disabled={forgotLoading}
          className="w-full h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[16px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-sm flex items-center justify-center disabled:opacity-50"
        >
          {forgotLoading ? 'Saving...' : 'Save Password'}
        </button>
      </div>
    );
  };

  const renderDesktopAddressForm = () => {
    return (
      <div className="flex flex-col text-left animate-fadeIn select-none">
        <h2 className="font-poppins font-bold text-[32px] text-[#3C2F2F] mb-1">Set Location</h2>
        <p className="font-roboto text-[15px] text-[#A6A6A6] mb-8">Configure your Manhattan delivery coordinates</p>

        <div className="space-y-4 mb-6">
          <button 
            onClick={() => {
              setIsFetchingGPS(true);
              fetchGPSAddress(
                (address, name) => {
                  setIsFetchingGPS(false);
                  setAddressSearchInput(address);
                  setShowAddressSuggestions(false);
                },
                (errorMsg) => {
                  setIsFetchingGPS(false);
                  alert(`GPS failed: ${errorMsg}\nFalling back to simulated Times Square address.`);
                  setAddressSearchInput('123 Times Square, New York, NY 10036');
                  setShowAddressSuggestions(false);
                }
              );
            }}

            className="w-full h-[54px] bg-red-50 hover:bg-red-100/70 border border-red-100 rounded-[16px] px-4 flex items-center justify-center gap-2 font-roboto font-bold text-[14.5px] text-[#EF2A39] cursor-pointer focus:outline-none transition-all active:scale-[0.99]"
          >
            {isFetchingGPS ? (
              <svg className="animate-spin h-5 w-5 text-[#EF2A39]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
              </svg>
            )}
            {isFetchingGPS ? 'Capturing Coordinates...' : 'Use Current GPS Location'}
          </button>

          <div className="relative">
            <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Search Address</label>
            <input 
              type="text" 
              placeholder="e.g. 123 Main St, NY"
              value={addressSearchInput}
              onChange={(e) => {
                setAddressSearchInput(e.target.value);
                setShowAddressSuggestions(e.target.value.length > 2);
              }}
              className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors"
            />
            {showAddressSuggestions && (
              <div className="absolute left-0 right-0 top-[85px] bg-white border border-gray-155 rounded-[16px] shadow-lg overflow-hidden z-20">
                {['Times Square, Manhattan, NY', 'Madison Square Garden, NY', 'Central Park, New York, NY'].map((sug, idx) => (
                  <div 
                    key={idx}
                    onClick={() => {
                      setAddressSearchInput(sug);
                      setShowAddressSuggestions(false);
                    }}
                    className="px-4 py-3 hover:bg-gray-50 font-roboto text-[13.5px] text-[#3C2F2F] cursor-pointer border-b border-gray-50 last:border-0"
                  >
                    📍 {sug}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Save Address As</label>
            <div className="flex gap-2.5">
              {['Home', 'Work', 'Gym', 'Other'].map((label) => (
                <button 
                  key={label}
                  onClick={() => setAddressSaveLabel(label)}
                  className={`flex-1 h-[44px] font-roboto font-bold text-[13px] rounded-[12px] border transition-all cursor-pointer focus:outline-none ${
                    addressSaveLabel === label 
                      ? 'bg-[#EF2A39] border-[#EF2A39] text-white shadow-sm' 
                      : 'bg-white border-gray-200 text-[#3C2F2F] hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={async () => {
            if (!addressSearchInput.trim()) {
              alert('Please enter a delivery address.');
              return;
            }
            let locationId = `loc_${Date.now()}`;
            if (getAuthToken()) {
              const res = await apiRequest('/addresses', {
                method: 'POST',
                body: { label: addressSaveLabel, full_address: addressSearchInput },
              });
              if (res.success && res.data?.id) {
                locationId = res.data.id;
              }
            }
            const newLoc = { id: locationId, name: addressSaveLabel, address: addressSearchInput };
            setDeliveryLocations(prev => [...prev, newLoc]);
            setDeliveryAddress(`${addressSaveLabel}: ${addressSearchInput}`);
            
            setWelcomeAnimation('aboard');
            setTimeout(() => {
              setWelcomeAnimation(null);
              setCurrentView('home');
            }, 2500);
          }}
          className="w-full h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[16px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-sm"
        >
          Confirm Address & Continue
        </button>
      </div>
    );
  };

  const renderDesktopAuthFlow = () => {
    const slideImages = [
      '/assets/onboarding_burger.png',
      '/assets/onboarding_bklyn.jpg',
      '/assets/onboarding_radar_ny.png'
    ];
    const slideTitles = [
      "Your Diet, Your Rules",
      "Discover Restaurant Profiles",
      "Precision Radar Tracking"
    ];
    const slideTexts = [
      "Save your specific preferences (Healthy, Halal, Vegan) and allergy safeguards. Wolfie screens items to ensure a safe, tailored dining experience.",
      "Browse menus, read verified comments, and check out visual storefront stories modeled like your favorite social feeds.",
      "Watch driver {activeOrder?.driverName || 'Driver'} navigate the Manhattan grid street-by-street on a live Mapbox radar screen, synced with real-time status updates."
    ];

    return (
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-80px)]">
        {/* Left Side: Onboarding Carousel Cover Image with overlay */}
        <div className="hidden lg:flex flex-col justify-end relative overflow-hidden h-full min-h-[calc(100vh-80px)]">
          {/* Active background image */}
          <div className="absolute inset-0 z-0 bg-[#3C2F2F]">
            <img 
              src={slideImages[onboardingSlide]} 
              alt="Welcome to Wolfie" 
              className="w-full h-full object-cover transition-all duration-700 ease-in-out transform scale-105" 
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/30 z-10" />
          </div>
          
          {/* Slide Text Content overlay */}
          <div className="z-20 p-16 text-left text-white max-w-xl mb-8 animate-fadeIn select-none">
            <div className="flex items-center gap-3 mb-6">
              <img src="/assets/wolf_logo.png" alt="Wolfie" className="w-12 h-12 object-contain brightness-0 invert" />
              <div className="text-left">
                <span className="font-lustria font-bold text-[24px] text-white tracking-wide block leading-none">WOLFIE</span>
                <span className="font-poppins font-semibold text-[9px] text-[#EF2A39] tracking-[0.2em] uppercase mt-0.5 block">Gourmet Delivery</span>
              </div>
            </div>

            <h2 className="font-poppins font-bold text-[36px] text-white leading-tight mb-4 drop-shadow-md">
              {slideTitles[onboardingSlide]}
            </h2>
            <p className="font-roboto font-normal text-[16.5px] text-gray-200 leading-relaxed mb-8 drop-shadow-sm">
              {slideTexts[onboardingSlide]}
            </p>

            {/* Pagination dots directly over image */}
            <div className="flex gap-2.5">
              {[0, 1, 2].map((idx) => (
                <div 
                  key={idx} 
                  onClick={() => setOnboardingSlide(idx)}
                  className={`h-2.5 rounded-full transition-all cursor-pointer ${
                    onboardingSlide === idx ? 'w-8 bg-[#EF2A39]' : 'w-2.5 bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Authentication forms */}
        <div className="flex items-center justify-center bg-white p-8 lg:p-16">
          <div className="w-full max-w-[540px] flex flex-col justify-center">
            {currentView === 'onboarding' && renderDesktopRegisterForm()}
            {currentView === 'login' && renderDesktopLoginForm()}
            {currentView === 'register' && renderDesktopRegisterForm()}
            {currentView === 'otp' && renderDesktopOtpForm()}
            {currentView === 'forgot' && renderDesktopForgotForm()}
            {currentView === 'reset' && renderDesktopResetForm()}
            {currentView === 'address_entry' && renderDesktopAddressForm()}
          </div>
        </div>
      </div>
    );
  };

  const renderDesktopHome = () => {
    if (activeTab === 'heart') {
      return renderDesktopFavorites();
    }
    if (activeTab === 'user') {
      return renderDesktopSettings();
    }
    if (activeTab === 'orders') {
      return renderDesktopOrders();
    }

    const categoriesList = ['Burgers', 'Sides', 'Drinks', 'Specials'];

    const getFilteredItemsForCategory = (cat: string) => {
      return activeDishes.filter(item => {
        // Category check
        const itemCat = item.category || 'Burgers';
        if (itemCat !== cat) return false;

        // Search check
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              item.description.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        // Price filter check
        if (desktopPriceFilter === 'under3' && item.price >= 3.00) return false;
        if (desktopPriceFilter === 'under5' && item.price >= 5.00) return false;
        if (desktopPriceFilter === 'over5' && item.price < 5.00) return false;

        // Rating filter check
        if (desktopRatingFilter === 'high' && item.rating < 4.7) return false;
        if (desktopRatingFilter === 'veryhigh' && item.rating < 4.9) return false;

        // Speed filter check
        const mins = parseInt(item.deliveryTime);
        if (desktopTimeFilter === 'fast' && mins > 25) return false;
        if (desktopTimeFilter === 'veryfast' && mins > 20) return false;

        return true;
      });
    };

    const activeRestaurantList = restaurants.filter(item => {
      if (restaurantFilter === 'all') return true;
      if (restaurantFilter === 'near') return item.deliveryTime.includes('1') || item.deliveryTime.includes('20');
      if (restaurantFilter === 'rating') return item.rating >= 4.8;
      if (restaurantFilter === 'best_seller') return item.isBestSeller;
      return true;
    });

    return (
      <HomeView 
        onSelectRestaurant={(res) => { setSelectedRestaurant(res); setPreviousView('home'); setCurrentView('restaurant'); }}
        onSelectFoodItem={(item) => { setSelectedFoodItem(item); setPreviousView('home'); setCurrentView('detail'); }}
        onProceedToCheckout={() => setCurrentView('checkout')}
      />
    );
  };

  const renderDesktopFavorites = () => {
    return (
      <div className="max-w-[1400px] mx-auto select-none animate-fadeIn text-left bg-white border border-gray-100 rounded-[28px] p-8 shadow-sm">
        <h2 className="font-poppins font-bold text-[26px] text-[#3C2F2F] mb-6">Saved Items & Stores</h2>
        
        {/* Segmented Control */}
        <div className="bg-gray-50 border border-gray-100 p-1.5 rounded-[18px] flex items-center mb-8 max-w-[400px] select-none">
          <button
            onClick={() => setFavSubTab('items')}
            className={`flex-1 py-2.5 rounded-[14px] font-roboto font-bold text-[14px] text-center transition-all cursor-pointer focus:outline-none ${
              favSubTab === 'items'
                ? 'bg-white text-[#3C2F2F] shadow-[0_3px_10px_rgba(0,0,0,0.06)]'
                : 'text-[#A6A6A6] hover:text-[#3C2F2F]'
            }`}
          >
            Favorite Items
          </button>
          <button
            onClick={() => setFavSubTab('restaurants')}
            className={`flex-1 py-2.5 rounded-[14px] font-roboto font-bold text-[14px] text-center transition-all cursor-pointer focus:outline-none ${
              favSubTab === 'restaurants'
                ? 'bg-white text-[#3C2F2F] shadow-[0_3px_10px_rgba(0,0,0,0.06)]'
                : 'text-[#A6A6A6] hover:text-[#3C2F2F]'
            }`}
          >
            Restaurants
          </button>
        </div>

        {/* Favorites Content */}
        <div>
          {favSubTab === 'items' ? (
            <div>
              {favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center select-none">
                  <div className="w-[80px] h-[80px] bg-red-50 rounded-full flex items-center justify-center mb-4 text-[#EF2A39]">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                  <span className="font-poppins font-bold text-[18px] text-[#3C2F2F]">No Favorite Items Yet</span>
                  <p className="font-roboto text-[14px] text-[#A6A6A6] max-w-[320px] mt-2 leading-relaxed">
                    Tap the heart icon on any burger to save it here for quick access next time!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {activeDishes.filter(item => favorites.includes(item.id)).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedFoodItem(item);
                        setPortionCount(1);
                        setSpicyLevel(57);
                        setSelectedSize('M');
                        setSelectedToppings([]);
                        setSelectedAddons([]);
                        setSelectedDrinks([]);
                        setPreviousView('home');
                        setCurrentView('detail');
                      }}
                      className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-4 flex flex-col relative hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-pointer select-none"
                    >
                      {/* Heart icon overlay */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item.id);
                        }}
                        className="absolute right-3 top-3 w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-100 shadow-sm cursor-pointer hover:scale-105 active:scale-95 focus:outline-none"
                      >
                        <HeartIcon favorite={true} />
                      </button>

                      {/* Image */}
                      <div className="w-[120px] h-[120px] mx-auto flex items-center justify-center mb-4">
                        <img src={item.image} alt={item.name} className="max-h-full max-w-full object-contain" />
                      </div>

                      {/* Name / Brand */}
                      <span className="font-poppins font-bold text-[15px] text-[#3C2F2F] text-left truncate leading-snug">
                        {item.name}
                      </span>
                      <span className="font-roboto font-normal text-[12px] text-[#A6A6A6] text-left mt-0.5 truncate">
                        {item.brand}
                      </span>

                      {/* Price */}
                      <div className="flex justify-between items-center mt-4 pt-2 border-t border-gray-50">
                        <span className="font-poppins font-black text-[17px] text-[#EF2A39]">
                          ${item.price.toFixed(2)}
                        </span>
                        <span className="font-roboto font-bold text-[11px] text-[#A6A6A6]">
                          {item.deliveryTime}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {favoriteRestaurants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center select-none">
                  <div className="w-[80px] h-[80px] bg-red-50 rounded-full flex items-center justify-center mb-4 text-[#EF2A39]">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M17.25 1.85071C16.2243 1.86063 15.2152 2.11065 14.3035 2.58073C13.3918 3.05081 12.6029 3.72788 12 4.55771C11.397 3.72788 10.6081 3.05081 9.69644 2.58073C8.78476 2.11065 7.77565 1.86063 6.74996 1.85071C4.89173 1.92491 3.13848 2.73189 1.87358 4.09517C0.608672 5.45846 -0.0649657 7.26713 -4.03235e-05 9.12571C-4.03235e-05 13.6777 4.67396 18.5507 8.59996 21.8377C9.55329 22.6393 10.7589 23.0788 12.0045 23.0788C13.25 23.0788 14.4556 22.6393 15.409 21.8377C19.331 18.5507 24.009 13.6777 24.009 9.12571" />
                    </svg>
                  </div>
                  <span className="font-poppins font-bold text-[18px] text-[#3C2F2F]">No Favorite Stores Yet</span>
                  <p className="font-roboto text-[14px] text-[#A6A6A6] max-w-[320px] mt-2 leading-relaxed">
                    Tap the heart icon on any restaurant banner to save it here for quick access!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {restaurants.filter(rest => favoriteRestaurants.includes(rest.id)).map((rest) => (
                    <div
                      key={rest.id}
                      onClick={() => {
                        setSelectedRestaurant(rest);
                        setPreviousView('home');
                        setCurrentView('restaurant');
                      }}
                      className="bg-white rounded-[24px] border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer group active:scale-[0.99] text-left"
                    >
                      <div className="h-[140px] relative overflow-hidden bg-gray-100">
                        <img src={rest.cover} alt={rest.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavoriteRestaurant(rest.id);
                          }}
                          className="absolute right-3 top-3 w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-100 shadow-sm cursor-pointer hover:scale-105 active:scale-95 focus:outline-none"
                        >
                          <svg 
                            width="15" 
                            height="15" 
                            viewBox="0 0 24 24" 
                            fill="#EF2A39" 
                            stroke="#EF2A39" 
                            strokeWidth="2"
                          >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        </button>
                      </div>
                      <div className="p-4 flex gap-3 relative">
                        <div className="w-[54px] h-[54px] rounded-[14px] bg-white border border-gray-100 shadow-sm overflow-hidden flex items-center justify-center shrink-0 -mt-8 relative z-10">
                          <img src={rest.logo} alt={rest.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <h4 className="font-poppins font-bold text-[16px] text-[#3C2F2F] group-hover:text-[#EF2A39] transition-colors truncate">{rest.name}</h4>
                          <p className="font-roboto text-[12px] text-[#A6A6A6] mt-0.5 truncate">{rest.tags.join(' • ')}</p>
                          <div className="flex items-center gap-3 mt-2 font-roboto text-[12px] font-bold text-[#6A6A6A]">
                            <span className="flex items-center gap-0.5 text-yellow-500">★ {rest.rating}</span>
                            <span>• {rest.distance} miles</span>
                            <span>• Free Delivery</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDesktopSettings = () => {
    const activeSub = profileActiveSubSection === 'main' ? 'account' : profileActiveSubSection;
    return (
      <ProfileView 
        profileName={profileName}
        profileEmail={profileEmail}
        profilePhone={profilePhone}
        setProfilePhone={setProfilePhone}
        profilePicture={profilePicture}
        setShowAvatarModal={setShowAvatarModal}
        orders={orders}
        setCartItems={setCartItems}
        setOrderedItems={setOrderedItems}
        setCurrentView={setCurrentView}
        deliveryLocations={deliveryLocations}
        setDeliveryLocations={setDeliveryLocations}
        deliveryAddress={deliveryAddress}
        setDeliveryAddress={setDeliveryAddress}
        paymentCards={paymentCards}
        setPaymentCards={setPaymentCards}
        setShowAddCardModal={setShowAddCardModal}
        setShowLocationModal={setShowLocationModal}
        setShowLogoutModal={setShowLogoutModal}
        activeSub={activeSub}
        setActiveSub={setProfileActiveSubSection as any}
      />
    );
  };

  const renderDesktopRestaurant = () => {
    return (
      <RestaurantDetailView 
        restaurant={selectedRestaurant as any} 
        onBack={goBack} 
        onSelectFoodItem={(item: any) => {
          setSelectedFoodItem(item);
          setPreviousView('restaurant');
          setCurrentView('detail');
        }}
        onProceedToCheckout={() => setCurrentView('checkout')}
      />
    );
  };

  const renderDesktopDetail = () => {
    if (!selectedFoodItem) return null;
    return (
      <FoodItemDetailView 
        foodItem={selectedFoodItem as any}
        onBack={goBack}
        onVisitStore={() => {
          const match = restaurants.find(r => r.name.toLowerCase() === selectedFoodItem.brand.toLowerCase() || selectedFoodItem.brand.toLowerCase().includes(r.name.toLowerCase()));
          if (match) {
            setSelectedRestaurant(match);
          } else {
            const wendys = restaurants.find(r => r.id === 'rest_wendys' || r.name.toLowerCase().includes("wendy"));
            if (wendys) setSelectedRestaurant(wendys);
          }
          setPreviousView('detail');
          setRestaurantTab('overview');
          setCurrentView('restaurant');
        }}
        onGoToCart={() => { setPreviousView('detail'); setCurrentView('cart'); }}
        onSelectFoodItem={(item: any) => {
          setSelectedFoodItem(item);
        }}
      />
    );
  };

  const renderDesktopCart = () => {
    return (
      <CartView 
        deliveryAddress={deliveryAddress}
        setDeliveryAddress={setDeliveryAddress}
        isEditingAddress={isEditingAddress}
        setIsEditingAddress={setIsEditingAddress}
        deliveryLocations={deliveryLocations}
        onKeepOrdering={() => setCurrentView('home')}
        onCheckout={() => setCurrentView('checkout')}
      />
    );
  };

  const renderDesktopCheckout = () => {
    return (
      <CheckoutView 
        deliveryAddress={deliveryAddress}
        selectedRestaurant={selectedRestaurant as any}
        onBack={() => setCurrentView('cart')}
        onSuccessOrder={(newOrder: any) => {
          setOrders(prev => [newOrder, ...prev]);
          setOrderedItems(newOrder.items);
          setShowSuccessOrder(true);
          setCurrentView('tracking');
        }}
      />
    );
  };

  const renderDesktopTracking = () => {
    const activeOrder = orders.find(o => o.status !== 'Completed');
    return (
      <TrackingView 
        deliveryAddress={deliveryAddress}
        orderedItems={orderedItems}
        orderId={activeOrder ? activeOrder.id : undefined}
        restaurantName={activeOrder ? activeOrder.restaurantName : undefined}
        restaurantLogo={activeOrder ? activeOrder.restaurantLogo : undefined}
        initialStatus={activeOrder ? activeOrder.status : undefined}
        driverName={activeOrder?.driverName}
        driverRating={activeOrder?.driverRating}
        driverAvatar={activeOrder?.driverAvatar}
        onBackToHome={() => {
          setCurrentView('home');
          setActiveTab('home');
        }}
        onOpenChat={() => {
          setPreviousView('tracking');
          setChatRecipient('driver');
          setCurrentView('chat');
        }}
      />
    );
  };

  const renderDesktopChat = () => {
    const activeOrder = orders.find(o => o.status !== 'Completed');
    return (
      <ChatView
        driverName={activeOrder?.driverName} 
        chatRecipient={chatRecipient}
        setChatRecipient={setChatRecipient}
        onBack={goBack}
        profilePicture={profilePicture}
        activeOrderId={activeOrder ? activeOrder.id : undefined}
      />
    );
  };

  const renderMobileOrders = () => {
    return (
      <div className="absolute inset-x-0 top-[130px] bottom-[76px] overflow-y-auto scrollbar-hide p-[19px] text-left animate-fadeIn flex flex-col">
        {/* Active Deliveries */}
        <div className="space-y-3">
          <h4 className="font-poppins font-bold text-[16px] text-[#3C2F2F] border-b border-gray-50 pb-2 text-left">
            Active Deliveries ⚡
          </h4>
          {orders.filter(o => o.status !== 'Completed').length === 0 ? (
            <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6 text-center select-none">
              <div className="w-[54px] h-[54px] bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-3 text-[#FFE100]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <span className="font-poppins font-bold text-[14px] text-[#3C2F2F]">No Active Orders</span>
              <p className="font-roboto text-[12px] text-[#A6A6A6] mt-1">
                Place an order from home and track it here in real-time!
              </p>
            </div>
          ) : (
            orders.filter(o => o.status !== 'Completed').map((order) => (
              <div 
                key={order.id} 
                className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-4.5 flex flex-col gap-3.5 relative select-none"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-[42px] h-[42px] rounded-[14px] overflow-hidden bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
                      <img src={order.restaurantLogo} alt={order.restaurantName} className="w-full h-full object-cover scale-[1.02]" />
                    </div>
                    <div className="text-left">
                      <span className="font-poppins font-bold text-[14.5px] text-[#3C2F2F] block leading-snug">
                        {order.restaurantName}
                      </span>
                      <span className="font-roboto font-normal text-[11px] text-[#A6A6A6] block mt-0.5">
                        {order.date}
                      </span>
                    </div>
                  </div>
                  <span className="font-roboto font-bold text-[16px] text-[#EF2A39]">
                    ${order.totalPrice.toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-b border-gray-50/70 py-2.5 text-left">
                  <div className="space-y-1 font-roboto text-[12.5px] text-[#6A6A6A]">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {item.quantity}x {item.foodItem.name} ({item.size})
                        </span>
                        <span className="text-[#3C2F2F] font-medium">
                          ${(item.pricePerUnit * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-left">
                    <span className="w-2.5 h-2.5 bg-[#FFE100] rounded-full animate-ping shrink-0" />
                    <span className="font-roboto font-bold text-[12px] text-[#3C2F2F]">
                      Status: <span className="text-[#EF2A39]">{order.status}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => handleTrackOrder(order)}
                    className="px-4.5 py-2 bg-[#FFE100] hover:brightness-95 active:scale-95 transition-all rounded-[14px] font-roboto font-bold text-[12.5px] text-[#3C2F2F] shadow-[0_4px_12px_rgba(255,225,0,0.2)] cursor-pointer focus:outline-none"
                  >
                    Track Order
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order History */}
        <div className="space-y-3 pb-8">
          <h4 className="font-poppins font-bold text-[16px] text-[#3C2F2F] border-b border-gray-50 pb-2 pt-4 text-left">
            Order History 📜
          </h4>
          {orders.filter(o => o.status === 'Completed').map((order) => (
            <div 
              key={order.id} 
              className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-4.5 flex flex-col gap-3.5 relative select-none"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-[42px] h-[42px] rounded-[14px] overflow-hidden bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
                    <img src={order.restaurantLogo} alt={order.restaurantName} className="w-full h-full object-cover scale-[1.02]" />
                  </div>
                  <div className="text-left">
                    <span className="font-poppins font-bold text-[14.5px] text-[#3C2F2F] block leading-snug">
                      {order.restaurantName}
                    </span>
                    <span className="font-roboto font-normal text-[11px] text-[#A6A6A6] block mt-0.5">
                      {order.date}
                    </span>
                  </div>
                </div>
                <span className="font-roboto font-bold text-[16px] text-[#3C2F2F]">
                  ${order.totalPrice.toFixed(2)}
                </span>
              </div>

              <div className="border-t border-b border-gray-50/70 py-2.5 text-left">
                <div className="space-y-1 font-roboto text-[12.5px] text-[#6A6A6A]">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.foodItem.name} ({item.size})
                      </span>
                      <span className="text-[#A6A6A6]">
                        ${(item.pricePerUnit * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-left">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full shrink-0" />
                  <span className="font-roboto font-bold text-[12px] text-[#6A6A6A]">
                    Status: <span className="text-green-600">Delivered</span>
                  </span>
                </div>
                <button
                  onClick={() => handleReorder(order)}
                  className="px-4.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all rounded-[14px] font-roboto font-bold text-[12.5px] text-[#3C2F2F] cursor-pointer focus:outline-none"
                >
                  Re-order
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDesktopOrders = () => {
    return (
      <div className="max-w-[1400px] mx-auto select-none animate-fadeIn text-left py-6 px-4 space-y-8 min-h-[calc(100vh-140px)]">
        <div>
          <h2 className="font-poppins font-bold text-[28px] text-[#3C2F2F]">My Orders</h2>
          <p className="font-roboto text-[14px] text-[#A6A6A6] mt-1.5">Track your active deliveries and view order history</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          {/* Active Deliveries */}
          <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm space-y-6">
            <h3 className="font-poppins font-bold text-[18px] text-[#3C2F2F] border-b border-gray-50 pb-3 flex items-center gap-2">
              <span>Active Deliveries</span>
              <span className="text-[12px] bg-[#FFE100]/20 text-[#3C2F2F] px-2.5 py-0.5 rounded-full font-roboto font-bold">Ongoing</span>
            </h3>

            {orders.filter(o => o.status !== 'Completed').length === 0 ? (
              <div className="p-8 text-center select-none">
                <div className="w-[60px] h-[60px] bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#FFE100]">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <span className="font-poppins font-bold text-[15px] text-[#3C2F2F]">No Active Deliveries</span>
                <p className="font-roboto text-[13px] text-[#A6A6A6] mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                  Place an order from menu page and monitor the live courier coordinates here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.filter(o => o.status !== 'Completed').map((order) => (
                  <div key={order.id} className="border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 hover:border-gray-200 transition-all bg-gray-50/20">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100 bg-white flex items-center justify-center shadow-xs">
                          <img src={order.restaurantLogo} alt={order.restaurantName} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-poppins font-bold text-[15.5px] text-[#3C2F2F]">{order.restaurantName}</h4>
                          <span className="font-roboto text-[12px] text-[#A6A6A6] block mt-1">{order.date} • ID: #{order.id}</span>
                        </div>
                      </div>
                      <span className="font-poppins font-bold text-[18px] text-[#EF2A39]">${order.totalPrice.toFixed(2)}</span>
                    </div>

                    <div className="border-t border-b border-gray-100 py-3 text-left">
                      <div className="space-y-2 font-roboto text-[13px] text-[#6A6A6A]">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.quantity}x {item.foodItem.name} ({item.size})</span>
                            <span className="text-[#3C2F2F] font-semibold">${(item.pricePerUnit * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-left">
                        <span className="w-2.5 h-2.5 bg-[#FFE100] rounded-full animate-ping" />
                        <span className="font-roboto font-bold text-[13px] text-[#3C2F2F]">
                          Status: <span className="text-[#EF2A39]">{order.status}</span>
                        </span>
                      </div>
                      <button
                        onClick={() => handleTrackOrder(order)}
                        className="px-5 py-2.5 bg-[#FFE100] hover:brightness-95 active:scale-95 transition-all rounded-xl font-roboto font-bold text-[13px] text-[#3C2F2F] shadow-xs cursor-pointer focus:outline-none"
                      >
                        Track Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Orders */}
          <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm space-y-6">
            <h3 className="font-poppins font-bold text-[18px] text-[#3C2F2F] border-b border-gray-50 pb-3 flex items-center gap-2">
              <span>Order History</span>
              <span className="text-[12px] bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full font-roboto font-bold">Past</span>
            </h3>

            {orders.filter(o => o.status === 'Completed').length === 0 ? (
              <div className="p-8 text-center select-none text-gray-400 font-roboto text-[14px]">No past orders.</div>
            ) : (
              <div className="space-y-4">
                {orders.filter(o => o.status === 'Completed').map((order) => (
                  <div key={order.id} className="border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 hover:border-gray-200 transition-all bg-gray-50/20">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100 bg-white flex items-center justify-center shadow-xs">
                          <img src={order.restaurantLogo} alt={order.restaurantName} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-poppins font-bold text-[15.5px] text-[#3C2F2F]">{order.restaurantName}</h4>
                          <span className="font-roboto text-[12px] text-[#A6A6A6] block mt-1">{order.date} • ID: #{order.id}</span>
                        </div>
                      </div>
                      <span className="font-poppins font-bold text-[18px] text-[#3C2F2F]">${order.totalPrice.toFixed(2)}</span>
                    </div>

                    <div className="border-t border-b border-gray-100 py-3 text-left">
                      <div className="space-y-2 font-roboto text-[13px] text-[#6A6A6A]">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.quantity}x {item.foodItem.name} ({item.size})</span>
                            <span className="text-gray-400">${(item.pricePerUnit * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-left">
                        <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                        <span className="font-roboto font-bold text-[13px] text-green-600">Delivered</span>
                      </div>
                      <button
                        onClick={() => handleReorder(order)}
                        className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all rounded-xl font-roboto font-bold text-[13px] text-[#3C2F2F] cursor-pointer focus:outline-none"
                      >
                        Re-order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGlobalModals = () => {
    return (
      <>
        {/* showLegalModal (Policies & Legal Info) */}
        {showLegalModal && (
          <div className="fixed inset-0 z-[300] flex items-end lg:items-center lg:justify-center">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fadeInSimple"
              onClick={() => setShowLegalModal(false)}
            />
            {/* Modal Card content */}
            <div className="relative bg-white w-full max-h-[85vh] lg:max-h-[500px] lg:max-w-[500px] rounded-t-[30px] lg:rounded-[28px] p-6 shadow-2xl animate-slideUp flex flex-col z-[310] select-none text-left border-t lg:border border-gray-100">
              <div className="w-[48px] h-[5px] bg-gray-200 rounded-full mx-auto mb-5 lg:hidden shrink-0" />
              
              <h3 className="font-roboto font-bold text-[20px] text-[#3C2F2F] mb-4 text-left shrink-0">
                Policies & Legal Info
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 text-left font-roboto text-[14px] leading-[22px] text-[#6A6A6A] scrollbar-hide pb-6">
                <div>
                  <h4 className="font-bold text-[#3C2F2F] mb-1">1. Pricing & Fees</h4>
                  <p>All prices displayed include menu charges. A dynamic NY sales tax of 8.875% applies to all food sales. Flat service fees ($1.50) and delivery fees ($3.00) support local driver operations.</p>
                </div>
                <div>
                  <h4 className="font-bold text-[#3C2F2F] mb-1">2. Cancellation Policy</h4>
                  <p>Orders can only be cancelled within 60 seconds after payment confirmation. Once the restaurant begins preparing the food, cancellations are no longer accepted.</p>
                </div>
                <div>
                  <h4 className="font-bold text-[#3C2F2F] mb-1">3. Refund Policy</h4>
                  <p>Refunds are processed to the original payment method. If your food arrives cold, damaged, or items are missing, please contact support with photos within 2 hours of delivery for full reimbursement.</p>
                </div>
                <div>
                  <h4 className="font-bold text-[#3C2F2F] mb-1">4. Order Tracking</h4>
                  <p>Real-time order tracking activates immediately upon confirmation. You will receive GPS updates showing driver coordinates and estimated drop-off times.</p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowLegalModal(false)}
                className="w-full h-[55px] bg-[#FFE100] rounded-[18px] font-roboto font-bold text-[16px] text-[#3C2F2F] shadow-[0_6px_20px_rgba(255,225,0,0.3)] hover:brightness-95 active:scale-95 transition-all cursor-pointer focus:outline-none shrink-0"
              >
                Close Policies
              </button>
            </div>
          </div>
        )}

        {/* showAddCardModal (Add Payment methods) */}
        {showAddCardModal && (
          <div className="fixed inset-0 z-[300] flex items-end lg:items-center lg:justify-center">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fadeInSimple"
              onClick={() => setShowAddCardModal(false)}
            />
            {/* Slide up/centered content */}
            <div className="relative bg-white w-full max-h-[85vh] lg:max-h-[520px] lg:max-w-[480px] rounded-t-[30px] lg:rounded-[28px] p-6 shadow-2xl animate-slideUp flex flex-col z-[310] select-none pb-8 text-left border-t lg:border border-gray-100 overflow-y-auto scrollbar-hide">
              <div className="w-[40px] h-[5px] bg-gray-200 rounded-full mx-auto mb-5 lg:hidden shrink-0" />
              
              <h3 className="font-poppins font-semibold text-[20px] text-[#3C2F2F] mb-5 text-left shrink-0">
                Add Payment methods
              </h3>
              
              {/* Form */}
              <div className="space-y-4 flex-1">
                {/* Card Number Input */}
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Card Number (3999 - 1234 - 5678 - 0000)"
                    value={newCardNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                      const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 - ');
                      setNewCardNumber(formatted);
                    }}
                    className="w-full h-[50px] bg-gray-50 border border-gray-100 rounded-[16px] px-4 font-roboto text-[14px] text-[#3C2F2F] outline-none focus:border-[#EF2A39] focus:bg-white transition-all placeholder-gray-400 text-left"
                  />
                </div>
                
                {/* Expiry and CVC Row */}
                <div className="flex gap-4">
                  {/* Expiry */}
                  <div className="flex-1">
                    <input 
                      type="text"
                      placeholder="MM/YY"
                      value={newCardExpiry}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        const formatted = val.length > 2 ? `${val.slice(0, 2)}/${val.slice(2)}` : val;
                        setNewCardExpiry(formatted);
                      }}
                      className="w-full h-[50px] bg-gray-50 border border-gray-100 rounded-[16px] px-4 font-roboto text-[14px] text-[#3C2F2F] outline-none focus:border-[#EF2A39] focus:bg-white transition-all placeholder-gray-400 text-left"
                    />
                  </div>
                  
                  {/* CVC */}
                  <div className="flex-1">
                    <input 
                      type="password"
                      placeholder="CVC"
                      value={newCardCvc}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                        setNewCardCvc(val);
                      }}
                      className="w-full h-[50px] bg-gray-50 border border-gray-100 rounded-[16px] px-4 font-roboto text-[14px] text-[#3C2F2F] outline-none focus:border-[#EF2A39] focus:bg-white transition-all placeholder-gray-400 text-left"
                    />
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="mt-8 space-y-3 shrink-0">
                {/* Add Card Button */}
                <button 
                  onClick={() => {
                    const digitsOnly = newCardNumber.replace(/\D/g, '');
                    if (digitsOnly.length < 16) {
                      alert("Please enter a valid 16-digit card number");
                      return;
                    }
                    const brand = digitsOnly.startsWith('4') ? 'Visa' : digitsOnly.startsWith('5') ? 'Mastercard' : 'Credit';
                    const logo = digitsOnly.startsWith('4') ? '/assets/logo_visa.png' : '/assets/logo_mastercard.png';
                    const formattedNum = `${digitsOnly.slice(0, 4)} **** **** ${digitsOnly.slice(12)}`;
                    
                    const newCard = {
                      id: `card_${Date.now()}`,
                      type: digitsOnly.startsWith('4') ? 'debit' : 'credit', // Debit for Visa, Credit for Mastercard to test fail/success
                      name: `${brand} card`,
                      number: formattedNum,
                      logo
                    };
                    
                    setPaymentCards(prev => [...prev, newCard]);
                    setSelectedCardId(newCard.id);
                    
                    // Reset form
                    setNewCardNumber('');
                    setNewCardExpiry('');
                    setNewCardCvc('');
                    setShowAddCardModal(false);
                    
                    // Toast notification
                    setPaymentNotification({
                      type: 'success',
                      message: `Successfully added your new ${brand} card!`
                    });
                    setTimeout(() => setPaymentNotification(null), 3000);
                  }}
                  className="w-full h-[50px] bg-[#FFE100] hover:brightness-95 active:scale-98 transition-all rounded-[16px] font-roboto font-bold text-[15px] text-[#3C2F2F] shadow-[0_4px_12px_rgba(255,225,0,0.25)] focus:outline-none cursor-pointer"
                >
                  Add Card
                </button>
                
                {/* Scan Card Button */}
                <button 
                  onClick={() => {
                    setPaymentNotification({
                      type: 'success',
                      message: "Scan Card feature coming soon!"
                    });
                    setTimeout(() => setPaymentNotification(null), 3000);
                  }}
                  className="w-full h-[50px] bg-white border border-gray-200 hover:bg-gray-50 active:scale-98 transition-all rounded-[16px] font-roboto font-bold text-[15px] text-[#3C2F2F] focus:outline-none cursor-pointer"
                >
                  Scan Card
                </button>
              </div>
            </div>
          </div>
        )}

        {/* showAvatarModal (Select Profile Picture) */}
        {showAvatarModal && (
          <div className="fixed inset-0 z-[300] flex items-end lg:items-center lg:justify-center">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fadeInSimple"
              onClick={() => setShowAvatarModal(false)}
            />
            {/* Slide up content */}
            <div className="relative bg-white w-full max-h-[85vh] lg:max-h-[300px] lg:max-w-[480px] rounded-t-[30px] lg:rounded-[28px] p-6 shadow-2xl animate-slideUp flex flex-col z-[310] select-none pb-8 text-left border-t lg:border border-gray-100">
              <div className="w-[40px] h-[5px] bg-gray-200 rounded-full mx-auto mb-5 lg:hidden shrink-0" />
              
              <h3 className="font-poppins font-semibold text-[20px] text-[#3C2F2F] mb-5 text-left shrink-0">
                Select Profile Picture
              </h3>
              
              <div className="grid grid-cols-3 gap-4 flex-1">
                {[
                  { id: 'avatar_default', name: 'Simona Takahashi', path: '/assets/avatar.png' },
                  { id: 'avatar_driver', name: 'Your Driver', path: '/assets/driver_avatar.png' },
                  { id: 'avatar_user', name: 'Standard User', path: '/assets/user.png' }
                ].map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => {
                      setProfilePicture(avatar.path);
                      setShowAvatarModal(false);
                      setProfileMessage({ type: 'success', text: 'Profile picture updated successfully!' });
                      setTimeout(() => setProfileMessage(null), 3000);
                    }}
                    className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all focus:outline-none cursor-pointer border border-transparent hover:border-gray-100"
                  >
                    <div className="w-[64px] h-[64px] rounded-full overflow-hidden border border-gray-200">
                      <img src={avatar.path} alt={avatar.name} className="w-full h-full object-cover scale-[1.05]" />
                    </div>
                    <span className="font-roboto text-[11px] font-bold text-[#3C2F2F] text-center leading-tight">
                      {avatar.name}
                    </span>
                  </button>
                ))}
                
                {/* Upload Custom Image option */}
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAvatarModal(false);
                  }}
                  className="flex flex-col items-center justify-center gap-2 p-2 rounded-2xl bg-gray-50 hover:bg-gray-150/40 active:scale-95 transition-all focus:outline-none cursor-pointer border border-dashed border-gray-300"
                >
                  <div className="w-[64px] h-[64px] rounded-full overflow-hidden flex items-center justify-center bg-white border border-gray-200">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF2A39" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <span className="font-roboto text-[11px] font-bold text-[#EF2A39] text-center leading-tight">
                    Upload Custom
                  </span>
                </button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>
        )}

        {/* showLocationModal (Add Saved Location) */}
        {showLocationModal && (
          <div className="fixed inset-0 z-[300] flex items-end lg:items-center lg:justify-center">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fadeInSimple"
              onClick={() => setShowLocationModal(false)}
            />
            {/* Slide up content */}
            <div className="relative bg-white w-full max-h-[85vh] lg:max-h-[580px] lg:max-w-[480px] rounded-t-[30px] lg:rounded-[28px] p-6 shadow-2xl animate-slideUp flex flex-col z-[310] select-none pb-8 text-left border-t lg:border border-gray-100 overflow-y-auto scrollbar-hide">
              <div className="w-[40px] h-[5px] bg-gray-200 rounded-full mx-auto mb-5 lg:hidden shrink-0" />
              
              <h3 className="font-poppins font-semibold text-[20px] text-[#3C2F2F] mb-5 text-left shrink-0">
                Add Saved Location
              </h3>
              
              <div className="space-y-4 flex-1">
                {/* Location Name Input */}
                <div className="space-y-1">
                  <span className="text-[12px] font-semibold text-[#A6A6A6] block text-left">Location Name</span>
                  <input 
                    type="text"
                    placeholder="e.g. Home, Work, Gym, Friend's House"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    className="w-full h-[50px] bg-gray-50 border border-gray-100 rounded-[16px] px-4 font-roboto text-[14px] text-[#3C2F2F] outline-none focus:border-[#EF2A39] focus:bg-white transition-all placeholder-gray-400 text-left"
                  />
                </div>
                
                {/* Street Address Input */}
                <div className="space-y-1">
                  <span className="text-[12px] font-semibold text-[#A6A6A6] block text-left">Street Address</span>
                  <input 
                    type="text"
                    placeholder="e.g. 120 Broadway, New York, NY"
                    value={newLocationAddress}
                    onChange={(e) => setNewLocationAddress(e.target.value)}
                    className="w-full h-[50px] bg-gray-50 border border-gray-100 rounded-[16px] px-4 font-roboto text-[14px] text-[#3C2F2F] outline-none focus:border-[#EF2A39] focus:bg-white transition-all placeholder-gray-400 text-left"
                  />
                </div>

                {/* Simulator Options */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {/* Current Position Simulator */}
                  <button 
                    onClick={() => {
                      setIsFetchingLocation(true);
                      fetchGPSAddress(
                        (address, name) => {
                          setIsFetchingLocation(false);
                          setNewLocationName(name);
                          setNewLocationAddress(address);
                        },
                        (errorMsg) => {
                          setIsFetchingLocation(false);
                          alert(`GPS failed: ${errorMsg}\nFalling back to simulated Times Square address.`);
                          setNewLocationName('Times Square');
                          setNewLocationAddress('1560 Broadway, New York, NY 10036');
                        }
                      );
                    }}

                    disabled={isFetchingLocation}
                    className="h-[46px] bg-[#FFE100]/10 hover:bg-[#FFE100]/20 text-[#3C2F2F] rounded-[16px] text-[12.5px] font-roboto font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-[#FFE100]/30 disabled:opacity-50 cursor-pointer"
                  >
                    {isFetchingLocation ? (
                      <div className="w-[16px] h-[16px] border-2 border-gray-400 border-t-[#EF2A39] rounded-full animate-spin" />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10"/>
                        <circle cx="12" cy="12" r="3"/>
                        <line x1="12" y1="1" x2="12" y2="3"/>
                        <line x1="12" y1="21" x2="12" y2="23"/>
                        <line x1="1" y1="12" x2="3" y2="12"/>
                        <line x1="21" y1="12" x2="23" y2="12"/>
                      </svg>
                    )}
                    Use GPS
                  </button>

                  {/* Map Simulator */}
                  <button 
                    onClick={() => {
                      setNewLocationName('Financial District');
                      setNewLocationAddress('120 Broadway, New York, NY 10271');
                      alert("Map Selection Simulation:\nPoint coordinates selected successfully at '120 Broadway (Financial District)'");
                    }}
                    className="h-[46px] bg-[#FFE100]/10 hover:bg-[#FFE100]/20 text-[#3C2F2F] rounded-[16px] text-[12.5px] font-roboto font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-[#FFE100]/30 cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                      <line x1="9" y1="3" x2="9" y2="18"/>
                      <line x1="15" y1="6" x2="15" y2="21"/>
                    </svg>
                    Choose on Map
                  </button>
                </div>
              </div>
              
              {/* Actions */}
              <div className="mt-6 space-y-3 shrink-0">
                <button 
                  onClick={async () => {
                    if (!newLocationName.trim() || !newLocationAddress.trim()) {
                      alert("Please fill in both Name and Address fields.");
                      return;
                    }
                    let locationId = `loc_${Date.now()}`;
                    if (getAuthToken()) {
                      const res = await apiRequest('/addresses', {
                        method: 'POST',
                        body: { label: newLocationName, full_address: newLocationAddress },
                      });
                      if (res.success && res.data?.id) {
                        locationId = res.data.id;
                      }
                    }
                    const newLoc = {
                      id: locationId,
                      name: newLocationName,
                      address: newLocationAddress
                    };
                    setDeliveryLocations(prev => [...prev, newLoc]);
                    setShowLocationModal(false);
                    setProfileMessage({ type: 'success', text: `Saved location "${newLocationName}" added!` });
                    setTimeout(() => setProfileMessage(null), 3000);
                  }}
                  className="w-full h-[50px] bg-[#FFE100] hover:brightness-95 active:scale-98 transition-all rounded-[16px] font-roboto font-bold text-[15px] text-[#3C2F2F] shadow-[0_4px_12px_rgba(255,225,0,0.25)] focus:outline-none cursor-pointer"
                >
                  Save Location
                </button>
                <button 
                  onClick={() => setShowLocationModal(false)}
                  className="w-full h-[50px] bg-white border border-gray-200 hover:bg-gray-50 active:scale-98 transition-all rounded-[16px] font-roboto font-bold text-[15px] text-[#3C2F2F] focus:outline-none cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* showLogoutModal (Logout Confirmation Modal) */}
        {showLogoutModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fadeInSimple"
              onClick={() => setShowLogoutModal(false)}
            />
            {/* Modal Dialog Card */}
            <div className="relative bg-white rounded-[28px] z-[310] w-[90%] max-w-[420px] p-6 flex flex-col text-center shadow-2xl animate-scaleIn select-none border border-gray-50 text-left">
              <div className="w-[56px] h-[56px] bg-red-50 text-[#EF2A39] rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              
              <h3 className="font-poppins font-bold text-[18px] text-[#3C2F2F] mb-2 text-center">
                Log Out of Wolfie?
              </h3>
              <p className="font-roboto text-[13.5px] text-[#A6A6A6] leading-relaxed mb-6 text-center">
                You will be signed out of your active session and your cart items will be cleared.
              </p>
              
              <div className="space-y-2.5">
                <button 
                  onClick={() => {
                    // Execute central useAuth logout to clean queries and Zustand store
                    executeLogout();
                    // Reset ALL local component state variables
                    setProfileName('');
                    setProfileEmail('');
                    setProfilePhone('');
                    setProfilePicture('/assets/avatar.png');
                    setProfilePreferFood([]);
                    setProfileAllergies([]);
                    setDeliveryAddress('');
                    setDeliveryLocations([]);
                    setFavoriteRestaurants([]);
                    setOrders([]);
                    setCartItems([]);
                    setActiveTab('home');
                    // Reset auth & view
                    setAuthToken(null);
                    setAuthUserId(null);
                    setCurrentView('onboarding');
                    setOnboardingSlide(0);
                    setAuthEmail('');
                    setAuthPassword('');
                    setAuthFullName('');
                    setAuthPhone('');
                    setAuthConfirmPassword('');
                    setShowLogoutModal(false);
                  }}
                  className="w-full h-[48px] bg-[#EF2A39] hover:bg-[#EF2A39]/90 active:scale-95 transition-all text-white rounded-[16px] font-roboto font-bold text-[14.5px] cursor-pointer focus:outline-none text-center"
                >
                  Yes, Log Out
                </button>
                <button 
                  onClick={() => setShowLogoutModal(false)}
                  className="w-full h-[48px] bg-gray-50 border border-gray-200 hover:bg-gray-100 active:scale-95 transition-all text-[#3C2F2F] rounded-[16px] font-roboto font-bold text-[14.5px] cursor-pointer focus:outline-none text-center"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {/* showNotificationsModal (User Notifications Slide Up Modal) */}
        {showNotificationsModal && (
          <div className="fixed inset-0 z-[300] flex items-end lg:items-center lg:justify-center">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fadeInSimple"
              onClick={() => {
                setShowNotificationsModal(false);
                // Mark all as read when closing
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
              }}
            />
            {/* Slide up content */}
            <div className="relative bg-white w-full max-h-[85vh] lg:max-h-[500px] lg:max-w-[440px] rounded-t-[30px] lg:rounded-[28px] p-6 shadow-2xl animate-slideUp flex flex-col z-[310] select-none pb-8 text-left border-t lg:border border-gray-100 overflow-y-auto scrollbar-hide">
              <div className="w-[40px] h-[5px] bg-gray-200 rounded-full mx-auto mb-5 lg:hidden shrink-0" />
              
              <div className="flex justify-between items-center mb-5 shrink-0">
                <h3 className="font-poppins font-semibold text-[20px] text-[#3C2F2F]">
                  Notifications 🔔
                </h3>
                {notifications.length > 0 && (
                  <button 
                    onClick={() => setNotifications([])}
                    className="text-[12px] font-roboto font-bold text-[#EF2A39] hover:underline focus:outline-none cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-3.5 flex-1 overflow-y-auto scrollbar-hide pr-1 mb-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-10 flex flex-col items-center justify-center">
                    <span className="text-[32px] mb-2">📭</span>
                    <span className="font-roboto font-bold text-[14px] text-gray-400">All caught up!</span>
                    <p className="font-roboto text-[11.5px] text-gray-400 mt-1">No new alerts or delivery updates right now.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className={`p-3.5 rounded-[18px] border transition-all ${
                        notif.read ? 'bg-white border-gray-100' : 'bg-red-50/40 border-red-100/50 shadow-xs'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="font-poppins font-bold text-[13.5px] text-[#3C2F2F]">{notif.title}</h4>
                        <span className="text-[10px] font-roboto text-gray-400 shrink-0 font-medium">{notif.time}</span>
                      </div>
                      <p className="font-roboto text-[12px] text-[#6A6A6A] mt-1 leading-relaxed">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>

              <button 
                onClick={() => {
                  setShowNotificationsModal(false);
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                }}
                className="w-full h-[50px] bg-[#FFE100] hover:brightness-95 active:scale-98 transition-all rounded-[16px] font-roboto font-bold text-[15px] text-[#3C2F2F] shadow-[0_4px_12px_rgba(255,225,0,0.2)] focus:outline-none cursor-pointer shrink-0 text-center"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderDesktopView = () => {
    const isAuthView = ['onboarding', 'login', 'register', 'otp', 'forgot', 'reset', 'address_entry'].includes(currentView);
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-inter">
        {renderDesktopNavbar()}
        <main className="flex-1 flex flex-col">
          {isAuthView ? (
            renderDesktopAuthFlow()
          ) : (
            <div className="w-full flex-1 flex">
              <div className="flex-1 min-h-[calc(100vh-80px)] p-8">
                {currentView === 'home' && renderDesktopHome()}
                {currentView === 'restaurant' && renderDesktopRestaurant()}
                {currentView === 'detail' && renderDesktopDetail()}
                {currentView === 'cart' && renderDesktopCart()}
                {currentView === 'checkout' && renderDesktopCheckout()}
                {currentView === 'tracking' && renderDesktopTracking()}
                {currentView === 'chat' && renderDesktopChat()}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#3C2F2F]">
      {/* PC/Desktop Layout (lg screens >= 1024px) */}
      <div className="hidden lg:block">
        {renderDesktopView()}
      </div>

      {/* Mobile Layout (screens < 1024px) */}
      <div className="lg:hidden flex items-center justify-center min-h-screen bg-[#F3F4F6] p-0 md:p-6">
        {/* Phone Mockup Frame (iPhone 14 Pro Max Ratio: 430px x 932px) */}
        <div className="w-full max-w-[430px] h-[932px] bg-white md:rounded-[40px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] md:border-[8px] md:border-[#1C1C1E] relative overflow-hidden flex flex-col">
        
        {currentView === 'home' ? (
          <>
            {/* Fixed Header Layer (y = 0 to 130) */}
            <div className="absolute top-0 left-0 w-full h-[130px] bg-white z-30 select-none border-b border-gray-50 flex items-center px-[19px]">
              {/* Brand Icon Left */}
              <div 
                onClick={() => { setCurrentView('home'); setActiveTab('home'); }}
                className="w-[36px] h-[36px] bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center cursor-pointer shadow-xs active:scale-95 transition-transform"
              >
                <img src="/assets/wolf_logo.png" alt="Wolfie" className="w-[22px] h-[22px] object-contain" />
              </div>

              {/* Delivery Address Middle */}
              <div className="flex-1 flex justify-center px-2">
                <div 
                  onClick={() => setShowLocationModal(true)} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-full cursor-pointer max-w-[200px] transition-colors shadow-xs active:scale-97"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF2A39" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span className="font-roboto font-bold text-[11px] text-[#3C2F2F] truncate">
                    {deliveryAddress || "Select Address..."}
                  </span>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#A6A6A6" strokeWidth="3" className="shrink-0">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {/* Icons Right (Notification + Support) */}
              <div className="flex items-center gap-2">
                {/* Notifications Bell Button */}
                <button 
                  onClick={() => setShowNotificationsModal(true)}
                  className="w-[36px] h-[36px] bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl flex items-center justify-center cursor-pointer shadow-xs active:scale-90 transition-transform relative focus:outline-none"
                  title="Notifications"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {notifications.some(n => !n.read) && (
                    <span className="absolute top-[8px] right-[8px] w-2.5 h-2.5 bg-[#EF2A39] border-2 border-white rounded-full animate-bounce" />
                  )}
                </button>

                {/* Support Chat Button */}
                <button 
                  onClick={() => {
                    setPreviousView(currentView);
                    setChatRecipient('support');
                    setCurrentView('chat');
                  }}
                  className="w-[36px] h-[36px] bg-[#EF2A39] hover:bg-[#D61B29] rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(239,42,57,0.2)] active:scale-90 transition-transform focus:outline-none cursor-pointer"
                  title="Customer Support"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content Layer (y = 130 to 856) */}
            <div className="absolute top-[130px] bottom-[76px] left-0 right-0 overflow-y-auto scrollbar-hide">
              {activeTab === 'home' && (
                <>
                  {/* Search bar & Filter (top = 33px relative to container) */}
              <div className="absolute left-0 top-[33px] w-full h-[60px] px-[19px]">
                {/* Search Container (x = 19px, w = 319px, h = 60px) */}
                <div className="absolute left-[19px] w-[319px] h-[60px] bg-white rounded-[20px] shadow-[0_4px_19px_rgba(0,0,0,0.15)] flex items-center">
                  <img 
                    src="/assets/icon_search.svg" 
                    alt="Search" 
                    className="absolute left-[20px] top-[18px] w-6 h-6 object-contain" 
                  />
                  <input 
                    type="text" 
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="absolute left-[68px] top-[10px] w-[230px] h-[40px] bg-transparent outline-none font-inter font-medium text-[16px] text-[#3C2F2F] placeholder-[#3C2F2F]/40"
                  />
                </div>
                
                {/* Filter Settings Button (x = 351px, w = 60px, h = 60px, color = #FFE100) */}
                <button 
                  className="absolute left-[351px] w-[60px] h-[60px] bg-[#FFE100] rounded-[20px] flex items-center justify-center cursor-pointer hover:brightness-95 active:scale-95 transition-all focus:outline-none"
                >
                  <img 
                    src="/assets/icon_settings.svg" 
                    alt="Filter" 
                    className="w-6 h-6 object-contain" 
                  />
                </button>
              </div>

              {/* Categories Row (top = 134px relative to container, h = 50px) */}
              <div className="absolute left-0 top-[134px] w-full h-[50px] overflow-x-auto scrollbar-hide flex items-center gap-[14px] px-[19px]">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`h-[50px] ${cat.width} flex items-center justify-center rounded-[20px] transition-all duration-250 cursor-pointer shrink-0 focus:outline-none ${
                      activeCategory === cat.name
                        ? 'bg-[#EF2A39] text-[#F5F5F5] shadow-[0_6px_17px_rgba(239,42,57,0.3)]'
                        : 'bg-[#F3F4F6] text-[#6A6A6A] hover:bg-gray-200'
                    }`}
                  >
                    <span className="font-inter font-medium text-[16px]">
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Restaurants Section (top = 204px, h = 205px) */}
              <div className="absolute left-0 top-[204px] w-full h-[205px] select-none text-left">
                {/* Header Row */}
                <div className="flex justify-between items-center px-[19px] mb-3">
                  <h3 className="font-poppins font-bold text-[18px] text-[#3C2F2F]">
                    Restaurants
                  </h3>
                  
                  {/* Small pill filters */}
                  <div className="flex gap-1.5">
                    {[
                      { id: 'near', name: 'Near' },
                      { id: 'rating', name: 'Rating 4.7+' },
                      { id: 'best_seller', name: 'Best Seller' }
                    ].map((f) => {
                      const isActive = restaurantFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setRestaurantFilter(isActive ? 'all' : f.id as any)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-roboto font-bold transition-all duration-200 cursor-pointer focus:outline-none ${
                            isActive
                              ? 'bg-[#EF2A39] text-white shadow-[0_2px_8px_rgba(239,42,57,0.25)] scale-[1.03]'
                              : 'bg-[#F3F4F6] text-[#6A6A6A] hover:bg-gray-200'
                          }`}
                        >
                          {f.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Horizontal Scroll Box */}
                <div className="w-full h-[155px] overflow-x-auto scrollbar-hide flex gap-[14px] px-[19px] pb-[10px]">
                  {restaurants.filter(rest => {
                    const matchesSearch = rest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                          rest.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
                    if (!matchesSearch) return false;
                    if (restaurantFilter === 'near' && rest.distance > 0.5) return false;
                    if (restaurantFilter === 'rating' && rest.rating < 4.7) return false;
                    if (restaurantFilter === 'best_seller' && !rest.isBestSeller) return false;
                    if (activeCategory === 'Near Me' && rest.distance > 0.5) return false;
                    if (activeCategory === 'TOP RATING' && rest.rating < 4.7) return false;
                    if (activeCategory === 'CLOSE' && rest.distance > 0.8) return false;
                    return true;
                  }).length === 0 ? (
                    <div className="w-full flex items-center justify-center h-[120px] bg-gray-50 border border-dashed border-gray-200 rounded-[20px]">
                      <span className="text-[12px] font-roboto text-gray-400">No restaurants match filter</span>
                    </div>
                  ) : (
                    restaurants.filter(rest => {
                      const matchesSearch = rest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            rest.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
                      if (!matchesSearch) return false;
                      if (restaurantFilter === 'near' && rest.distance > 0.5) return false;
                      if (restaurantFilter === 'rating' && rest.rating < 4.7) return false;
                      if (restaurantFilter === 'best_seller' && !rest.isBestSeller) return false;
                      if (activeCategory === 'Near Me' && rest.distance > 0.5) return false;
                      if (activeCategory === 'TOP RATING' && rest.rating < 4.7) return false;
                      if (activeCategory === 'CLOSE' && rest.distance > 0.8) return false;
                      return true;
                    }).map((rest) => (
                      <div
                        key={rest.id}
                        onClick={() => {
                          setSelectedRestaurant(rest);
                          setRestaurantTab('overview');
                          setPreviousView('home');
                          setCurrentView('restaurant');
                        }}
                        className="w-[220px] h-[135px] bg-white rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-gray-100/50 shrink-0 relative overflow-hidden active:scale-[0.98] hover:shadow-[0_6px_15px_rgba(0,0,0,0.12)] transition-all duration-200 cursor-pointer flex flex-col"
                      >
                        {/* Top half: Cover photo */}
                        <div className="h-[65px] w-full relative">
                          <img
                            src={rest.cover}
                            alt={rest.name}
                            className="w-full h-full object-cover"
                          />
                          {rest.isBestSeller && (
                            <span className="absolute left-3 top-2.5 bg-[#FFE100] text-[#3C2F2F] text-[9px] font-bold px-2 py-0.5 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.1)]">
                              🔥 BEST SELLER
                            </span>
                          )}
                        </div>

                        {/* Overlapping Logo */}
                        <div className="w-[36px] h-[36px] rounded-lg overflow-hidden bg-white border-2 border-white absolute top-[45px] left-[15px] shadow-[0_2px_6px_rgba(0,0,0,0.15)] flex items-center justify-center">
                          <img
                            src={rest.logo}
                            alt={rest.name}
                            className="w-full h-full object-cover scale-[1.02]"
                          />
                        </div>

                        {/* Bottom half: Info */}
                        <div className="flex-1 flex flex-col justify-end p-2.5 pl-[15px]">
                          {/* Name */}
                          <span className="font-poppins font-bold text-[14px] text-[#3C2F2F] truncate leading-tight mb-1">
                            {rest.name}
                          </span>
                          
                          {/* Stats */}
                          <div className="flex items-center gap-1.5 text-[11px] font-roboto text-[#A6A6A6]">
                            <span className="text-[#FFE100] text-[12px] leading-none">★</span>
                            <span className="text-[#3C2F2F] font-bold">{rest.rating}</span>
                            <span>•</span>
                            <span>{rest.distance} mi</span>
                            <span>•</span>
                            <span>${rest.deliveryFee.toFixed(2)} Del.</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Product Cards Section */}
              {filteredFoodItems.length > 0 && (
                <h3 className="absolute left-[19px] top-[425px] font-poppins font-bold text-[18px] text-[#3C2F2F]">
                  Popular Dishes
                </h3>
              )}

              {filteredFoodItems.length === 0 ? (
                <div className="absolute left-[19px] top-[425px] right-[19px] h-[120px] bg-gray-50 border border-dashed border-gray-200 rounded-[20px] flex items-center justify-center">
                  <span className="text-[14px] font-roboto text-gray-400">No dishes match selected filter</span>
                </div>
              ) : (
                <>
                  {/* Product Cards Row 1 (top = 465px relative to container) */}
                  <div className="absolute left-0 top-[465px] w-full px-[19px] grid grid-cols-2 gap-[22px]">
                    {filteredFoodItems.slice(0, 2).map((item, idx) => (
                      <div 
                        key={item.id} 
                        onClick={() => {
                          setSelectedFoodItem(item);
                          setPortionCount(2);
                          setSpicyLevel(57);
                          setSelectedSize('M');
                          setSelectedToppings([]);
                          setSelectedAddons([]);
                          setSelectedDrinks([]);
                          setActiveCustomizerTab(null);
                          setCurrentView('detail');
                        }}
                        className="relative w-full h-[225px] bg-white rounded-[20px] shadow-[0_6px_17px_rgba(0,0,0,0.13)] select-none hover:shadow-[0_8px_22px_rgba(0,0,0,0.18)] transition-shadow duration-300 cursor-pointer"
                      >
                        {/* Heart Icon (aligned to right edge with 12px margin) */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.id);
                          }}
                          className="absolute right-[12px] top-[12px] w-[21.36px] h-[20px] flex items-center justify-center cursor-pointer transition-transform active:scale-90 focus:outline-none"
                        >
                          <HeartIcon favorite={favorites.includes(item.id)} />
                        </button>

                        {/* Oval shadow under burger (centered horizontally) */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-[87.27px] w-[117.24px] h-[18.18px] bg-black/10 rounded-full blur-[4px]"></div>

                        {/* Burger image (centered horizontally) */}
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="absolute left-1/2 -translate-x-1/2 top-[20px] w-[159px] h-[95px] object-contain transition-transform duration-300 hover:scale-105"
                        />

                        {/* Text details (x = 11px, y = 136px, right = 11px) */}
                        <div className="absolute left-[11px] top-[136px] right-[11px] h-[44px] text-left">
                          <span className="font-roboto font-semibold text-[16px] text-[#3C2F2F] leading-[21.55px] block truncate">
                            {item.name}
                          </span>
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              const match = restaurants.find(r => r.name.toLowerCase() === item.brand.toLowerCase() || item.brand.toLowerCase().includes(r.name.toLowerCase()));
                              if (match) {
                                setSelectedRestaurant(match);
                              } else {
                                const wendys = restaurants.find(r => r.id === 'rest_wendys' || r.name.toLowerCase().includes("wendy"));
                                if (wendys) setSelectedRestaurant(wendys);
                              }
                              setPreviousView('home');
                              setRestaurantTab('overview');
                              setCurrentView('restaurant');
                            }}
                            className="font-roboto font-normal text-[16px] text-[#EF2A39] hover:underline cursor-pointer leading-[21.55px] block truncate"
                          >
                            {item.brand}
                          </span>
                        </div>

                        {/* Rating & Delivery Time (x = 11px, y = 189px) */}
                        <div className="absolute left-[11px] top-[189px] flex items-center gap-[5px]">
                          <img 
                            src="/assets/icon_card_star.svg" 
                            alt="Star" 
                            className="w-[16px] h-[16px] object-contain" 
                          />
                          <span className="font-roboto font-medium text-[16px] text-[#3C2F2F] leading-[21.55px]">
                            {item.rating.toFixed(1)}
                          </span>
                          <span className="font-roboto font-normal text-[14px] text-[#A6A6A6] leading-[21.55px] ml-1">
                            • {item.deliveryTime}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Product Cards Row 2 (top = 712px relative to container) */}
                  <div className="absolute left-0 top-[712px] w-full px-[19px] grid grid-cols-2 gap-[22px] pb-6">
                    {filteredFoodItems.slice(2, 4).map((item, idx) => (
                      <div 
                        key={item.id} 
                        onClick={() => {
                          setSelectedFoodItem(item);
                          setPortionCount(2);
                          setSpicyLevel(57);
                          setSelectedSize('M');
                          setSelectedToppings([]);
                          setSelectedAddons([]);
                          setSelectedDrinks([]);
                          setActiveCustomizerTab(null);
                          setCurrentView('detail');
                        }}
                        className="relative w-full h-[225px] bg-white rounded-[20px] shadow-[0_6px_17px_rgba(0,0,0,0.13)] select-none hover:shadow-[0_8px_22px_rgba(0,0,0,0.18)] transition-shadow duration-300 cursor-pointer"
                      >
                        {/* Heart Icon */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.id);
                          }}
                          className="absolute right-[12px] top-[12px] w-[21.36px] h-[20px] flex items-center justify-center cursor-pointer transition-transform active:scale-90 focus:outline-none"
                        >
                          <HeartIcon favorite={favorites.includes(item.id)} />
                        </button>

                        {/* Oval shadow under burger */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-[87.27px] w-[117.24px] h-[18.18px] bg-black/10 rounded-full blur-[4px]"></div>

                        {/* Burger image */}
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="absolute left-1/2 -translate-x-1/2 top-[20px] w-[159px] h-[95px] object-contain transition-transform duration-300 hover:scale-105"
                        />

                        {/* Text details */}
                        <div className="absolute left-[11px] top-[136px] right-[11px] h-[44px] text-left">
                          <span className="font-roboto font-semibold text-[16px] text-[#3C2F2F] leading-[21.55px] block truncate">
                            {item.name}
                          </span>
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              const match = restaurants.find(r => r.name.toLowerCase() === item.brand.toLowerCase() || item.brand.toLowerCase().includes(r.name.toLowerCase()));
                              if (match) {
                                setSelectedRestaurant(match);
                              } else {
                                const wendys = restaurants.find(r => r.id === 'rest_wendys' || r.name.toLowerCase().includes("wendy"));
                                if (wendys) setSelectedRestaurant(wendys);
                              }
                              setPreviousView('home');
                              setRestaurantTab('overview');
                              setCurrentView('restaurant');
                            }}
                            className="font-roboto font-normal text-[16px] text-[#EF2A39] hover:underline cursor-pointer leading-[21.55px] block truncate"
                          >
                            {item.brand}
                          </span>
                        </div>

                        {/* Rating & Delivery Time */}
                        <div className="absolute left-[11px] top-[189px] flex items-center gap-[5px]">
                          <img 
                            src="/assets/icon_card_star.svg" 
                            alt="Star" 
                            className="w-[16px] h-[16px] object-contain" 
                          />
                          <span className="font-roboto font-medium text-[16px] text-[#3C2F2F] leading-[21.55px]">
                            {item.rating.toFixed(1)}
                          </span>
                          <span className="font-roboto font-normal text-[14px] text-[#A6A6A6] leading-[21.55px] ml-1">
                            • {item.deliveryTime}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom scroll spacer */}
                  <div className="absolute left-0 top-[937px] w-full h-[50px]"></div>
                </>
              )}
            </>
          )}

          {activeTab === 'heart' && (
            <div className="absolute inset-x-0 top-[130px] bottom-[76px] overflow-y-auto scrollbar-hide p-[19px] text-left animate-fadeIn flex flex-col">
              {/* Segmented Control */}
              <div className="bg-gray-100 p-1.5 rounded-[18px] flex items-center mb-6 shrink-0 select-none">
                <button
                  onClick={() => setFavSubTab('items')}
                  className={`flex-1 py-2 rounded-[14px] font-roboto font-bold text-[14px] text-center transition-all cursor-pointer focus:outline-none ${
                    favSubTab === 'items'
                      ? 'bg-white text-[#3C2F2F] shadow-[0_3px_10px_rgba(0,0,0,0.06)]'
                      : 'text-[#A6A6A6] hover:text-[#3C2F2F]'
                  }`}
                >
                  Favorite Items
                </button>
                <button
                  onClick={() => setFavSubTab('restaurants')}
                  className={`flex-1 py-2 rounded-[14px] font-roboto font-bold text-[14px] text-center transition-all cursor-pointer focus:outline-none ${
                    favSubTab === 'restaurants'
                      ? 'bg-white text-[#3C2F2F] shadow-[0_3px_10px_rgba(0,0,0,0.06)]'
                      : 'text-[#A6A6A6] hover:text-[#3C2F2F]'
                  }`}
                >
                  Restaurants
                </button>
              </div>

              {/* Favorites Content */}
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-6">
                {favSubTab === 'items' ? (
                  <div className="flex flex-col gap-4">
                    {favorites.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center select-none">
                        <div className="w-[80px] h-[80px] bg-red-50 rounded-full flex items-center justify-center mb-4 text-[#EF2A39]">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        </div>
                        <span className="font-poppins font-bold text-[16px] text-[#3C2F2F]">No Favorite Items Yet</span>
                        <p className="font-roboto text-[13px] text-[#A6A6A6] max-w-[240px] mt-1.5 leading-relaxed">
                          Tap the heart icon on any burger to save it here for quick access next time!
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {activeDishes.filter(item => favorites.includes(item.id)).map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setSelectedFoodItem(item);
                              setPortionCount(1);
                              setSpicyLevel(57);
                              setSelectedSize('M');
                              setSelectedToppings([]);
                              setSelectedAddons([]);
                              setSelectedDrinks([]);
                              setPreviousView('home');
                              setCurrentView('detail');
                            }}
                            className="bg-white rounded-[20px] shadow-[0_6px_17px_rgba(0,0,0,0.06)] border border-gray-100 p-3.5 flex flex-col relative active:scale-95 transition-transform duration-200 cursor-pointer select-none"
                          >
                            {/* Heart icon overlay */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item.id);
                              }}
                              className="absolute right-2 top-2 w-7 h-7 rounded-full flex items-center justify-center bg-white/90 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] cursor-pointer active:scale-90 focus:outline-none"
                            >
                              <HeartIcon favorite={true} />
                            </button>

                            {/* Image */}
                            <div className="w-[100px] h-[100px] mx-auto flex items-center justify-center mb-3">
                              <img src={item.image} alt={item.name} className="max-h-full max-w-full object-contain" />
                            </div>

                            {/* Name / Brand */}
                            <span className="font-poppins font-bold text-[14px] text-[#3C2F2F] text-left truncate leading-snug">
                              {item.name}
                            </span>
                            <span className="font-roboto font-normal text-[11px] text-[#A6A6A6] text-left mt-0.5 truncate">
                              {item.brand}
                            </span>

                            {/* Price */}
                            <div className="flex justify-between items-center mt-3">
                              <span className="font-roboto font-bold text-[16px] text-[#EF2A39]">
                                ${item.price.toFixed(2)}
                              </span>
                              <span className="font-roboto font-normal text-[11px] text-[#A6A6A6]">
                                {item.deliveryTime}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {favoriteRestaurants.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center select-none">
                        <div className="w-[80px] h-[80px] bg-red-50 rounded-full flex items-center justify-center mb-4 text-[#EF2A39]">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                        </div>
                        <span className="font-poppins font-bold text-[16px] text-[#3C2F2F]">No Favorite Restaurants</span>
                        <p className="font-roboto text-[13px] text-[#A6A6A6] max-w-[240px] mt-1.5 leading-relaxed">
                          Tap the heart icon on any restaurant page to pin it here.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4.5">
                        {restaurants.filter(rest => favoriteRestaurants.includes(rest.id)).map((rest) => (
                          <div
                            key={rest.id}
                            onClick={() => {
                              setSelectedRestaurant(rest);
                              setRestaurantTab('overview');
                              setPreviousView('home');
                              setCurrentView('restaurant');
                            }}
                            className="w-full bg-white rounded-[24px] border border-gray-100 shadow-[0_6px_20px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col relative active:scale-[0.99] transition-all cursor-pointer"
                          >
                            {/* Banner Cover */}
                            <div className="h-[90px] w-full relative">
                              <img src={rest.cover} alt={rest.name} className="w-full h-full object-cover" />
                              {/* Heart Unfavorite button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavoriteRestaurant(rest.id);
                                }}
                                className="absolute right-3 top-3 w-8 h-8 rounded-full flex items-center justify-center bg-white/95 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] cursor-pointer active:scale-90 focus:outline-none"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#EF2A39" stroke="#EF2A39" strokeWidth="2">
                                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                              </button>
                            </div>

                            {/* Bottom part */}
                            <div className="p-4 flex items-center gap-3">
                              {/* Logo */}
                              <div className="w-[48px] h-[48px] rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
                                <img src={rest.logo} alt={rest.name} className="w-full h-full object-cover scale-[1.02]" />
                              </div>

                              {/* Details */}
                              <div className="text-left min-w-0 flex-1">
                                <h4 className="font-poppins font-bold text-[15px] text-[#3C2F2F] truncate">
                                  {rest.name}
                                </h4>
                                <p className="font-roboto text-[11px] text-[#A6A6A6] truncate mt-0.5">
                                  {rest.tags.join(' • ')}
                                </p>
                                <div className="flex items-center gap-2 mt-1 font-roboto text-[11px] text-[#A6A6A6]">
                                  <span className="text-[#FFE100] text-[12px] leading-none">★</span>
                                  <span className="text-[#3C2F2F] font-bold">{rest.rating}</span>
                                  <span>•</span>
                                  <span>{rest.deliveryTime}</span>
                                  <span>•</span>
                                  <span>${rest.deliveryFee.toFixed(2)} delivery</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'user' && (
            <div className="flex flex-col p-[19px] pb-24 text-left animate-fadeIn">
              
              {/* Profile Message Banner */}
              {profileMessage && (
                <div className={`p-3.5 rounded-[16px] text-[13px] font-roboto font-medium flex items-center gap-2 border mb-5 ${
                  profileMessage.type === 'success' 
                    ? 'bg-green-50 border-green-100 text-green-700' 
                    : 'bg-red-50 border-red-100 text-[#EF2A39]'
                }`}>
                  <span>{profileMessage.type === 'success' ? '✓' : '⚠'}</span>
                  <span>{profileMessage.text}</span>
                </div>
              )}

              {/* Sub Section Router */}
              {profileActiveSubSection === 'main' ? (
                <div className="space-y-5">
                  {/* Profile Summary Card */}
                  <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 flex flex-col items-center relative overflow-hidden">
                    <div className="relative group">
                      <div className="w-[88px] h-[88px] rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
                        <img 
                          src={profilePicture} 
                          alt="User Profile" 
                          className="w-full h-full object-cover scale-[1.05]"
                        />
                      </div>
                      <button 
                        onClick={() => setShowAvatarModal(true)}
                        className="absolute bottom-0 right-0 w-[28px] h-[28px] bg-[#FFE100] rounded-full flex items-center justify-center border border-white shadow active:scale-90 transition-transform focus:outline-none cursor-pointer"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.5">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                      </button>
                    </div>
                    <h3 className="font-poppins font-semibold text-[18px] text-[#3C2F2F] mt-3.5">
                      {profileName}
                    </h3>
                    <span className="font-roboto text-[12.5px] text-[#A6A6A6]">
                      {profileEmail}
                    </span>
                  </div>

                  {/* Menu Options Index List */}
                  <div className="space-y-3">
                    {[
                      {
                        id: 'account',
                        title: 'Account Information',
                        subtitle: 'secured name, email & phone details',
                        color: 'bg-red-50 text-[#EF2A39]',
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        )
                      },
                      {
                        id: 'orders',
                        title: 'Order History',
                        subtitle: 'track active orders & past deliveries',
                        color: 'bg-[#EF2A39]/10 text-[#EF2A39]',
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                        )
                      },
                      {
                        id: 'diet',
                        title: 'Dietary Preferences',
                        subtitle: 'manage food allergies & active diets',
                        color: 'bg-green-50 text-green-600',
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M2 22c5-1 9-4 11-9S18 4 22 2c-1 5-4 9-9 11s-8 6-11 9z" />
                          </svg>
                        )
                      },
                      {
                        id: 'payment',
                        title: 'Saved Payments',
                        subtitle: 'credit/debit cards & transaction wallets',
                        color: 'bg-[#FFE100]/15 text-[#3C2F2F]',
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                          </svg>
                        )
                      },
                      {
                        id: 'locations',
                        title: 'Saved Locations',
                        subtitle: 'manage delivery and drop-off addresses',
                        color: 'bg-blue-50 text-blue-600',
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                        )
                      },
                      {
                        id: 'password',
                        title: 'Change Password',
                        subtitle: 'reset account security credentials',
                        color: 'bg-purple-50 text-purple-600',
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        )
                      },
                      {
                        id: 'notifications',
                        title: 'App Notifications',
                        subtitle: 'manage alerts & transaction notifications',
                        color: 'bg-orange-50 text-orange-600',
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          </svg>
                        )
                      },
                      {
                        id: 'support',
                        title: 'Customer Support',
                        subtitle: 'chat with our 24/7 help desk',
                        color: 'bg-blue-50 text-blue-600',
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        )
                      }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.id === 'support') {
                            setPreviousView('home');
                            setChatRecipient('support');
                            setCurrentView('chat');
                          } else {
                            setProfileActiveSubSection(item.id as any);
                            // Sync phone input state on open
                            if (item.id === 'account') {
                              setPhoneTemp(profilePhone);
                            }
                            // Clear password states on open
                            if (item.id === 'password') {
                              setPasswordError('');
                              setPasswordSuccess('');
                            }
                          }
                        }}
                        className="w-full bg-white border border-gray-100/75 shadow-[0_4px_15px_rgba(0,0,0,0.02)] p-4 rounded-[20px] flex items-center justify-between hover:border-[#EF2A39]/20 transition-all active:scale-[0.98] cursor-pointer focus:outline-none"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-[42px] h-[42px] ${item.color} rounded-[14px] flex items-center justify-center shrink-0`}>
                            {item.icon}
                          </div>
                          <div className="text-left min-w-0">
                            <span className="font-poppins font-bold text-[14.5px] text-[#3C2F2F] block truncate">{item.title}</span>
                            <span className="font-roboto text-[11px] text-[#A6A6A6] block mt-0.5 truncate">{item.subtitle}</span>
                          </div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A6A6A6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ml-2">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    ))}
                  </div>

                  {/* Log Out Button */}
                  <div className="pt-2">
                    <button 
                      onClick={() => setShowLogoutModal(true)}
                      className="w-full h-[52px] bg-white border border-[#EF2A39] hover:bg-red-50 text-[#EF2A39] rounded-[20px] font-roboto font-bold text-[14.5px] active:scale-95 transition-all focus:outline-none cursor-pointer"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Sub Window Navigation Bar */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 select-none shrink-0 mb-1">
                    <button 
                      onClick={() => setProfileActiveSubSection('main')}
                      className="w-[28px] h-[28px] bg-gray-50 border border-gray-100 rounded-[10px] flex items-center justify-center cursor-pointer active:scale-90 transition-transform focus:outline-none"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <h3 className="font-poppins font-bold text-[16px] text-[#3C2F2F] uppercase tracking-wide">
                      {profileActiveSubSection === 'account' ? 'Account Details' : 
                       profileActiveSubSection === 'diet' ? 'Diet & Allergies' :
                       profileActiveSubSection === 'payment' ? 'Payment Methods' :
                       profileActiveSubSection === 'locations' ? 'Delivery Locations' :
                       profileActiveSubSection === 'password' ? 'Change Password' :
                       profileActiveSubSection === 'notifications' ? 'Notifications' :
                       profileActiveSubSection === 'orders' ? 'Order History' : ''}
                    </h3>
                    <div className="w-[28px]" />
                  </div>

                  {/* SUB SECTION: ACCOUNT INFORMATION */}
                  {profileActiveSubSection === 'account' && (
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 space-y-4 animate-fadeIn">
                      <h4 className="font-poppins font-bold text-[14px] text-gray-400 uppercase tracking-wide border-b border-gray-50 pb-1 text-left">secured demographics</h4>
                      
                      {/* Full Name (Read Only) */}
                      <div className="space-y-1">
                        <span className="text-[12px] font-semibold text-[#A6A6A6] block text-left">Full Name</span>
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            disabled 
                            value={profileName}
                            className="w-full bg-[#F3F4F6] border border-gray-150 rounded-[16px] px-4 py-3 text-[14px] font-medium text-[#6A6A6A] outline-none cursor-not-allowed text-left pr-10"
                          />
                          <div className="absolute right-4 text-gray-400">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Email (Read Only) */}
                      <div className="space-y-1">
                        <span className="text-[12px] font-semibold text-[#A6A6A6] block text-left">Email Address</span>
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            disabled 
                            value={profileEmail}
                            className="w-full bg-[#F3F4F6] border border-gray-150 rounded-[16px] px-4 py-3 text-[14px] font-medium text-[#6A6A6A] outline-none cursor-not-allowed text-left pr-10"
                          />
                          <div className="absolute right-4 text-gray-400">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Phone Number (Editable) */}
                      <div className="space-y-1">
                        <span className="text-[12px] font-semibold text-[#A6A6A6] block text-left">Phone Number</span>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            disabled={!isEditingPhone}
                            value={isEditingPhone ? phoneTemp : profilePhone}
                            onChange={(e) => setPhoneTemp(e.target.value)}
                            className={`flex-1 bg-[#F9FAFB] border rounded-[16px] px-4 py-3 text-[14px] font-medium text-[#3C2F2F] outline-none transition-all text-left ${
                              isEditingPhone ? 'border-[#EF2A39] bg-white shadow-sm' : 'border-gray-100'
                            }`}
                          />
                          {isEditingPhone ? (
                            <div className="flex gap-1.5 shrink-0">
                              <button 
                                onClick={() => {
                                  if (!phoneTemp.trim()) {
                                    alert("Phone number cannot be empty.");
                                    return;
                                  }
                                  setProfilePhone(phoneTemp);
                                  setIsEditingPhone(false);
                                  setProfileMessage({ type: 'success', text: 'Phone number updated!' });
                                  setTimeout(() => setProfileMessage(null), 3000);
                                }}
                                className="px-3 bg-[#FFE100] text-[#3C2F2F] rounded-[14px] text-[12px] font-bold active:scale-95 transition-transform cursor-pointer"
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => {
                                  setIsEditingPhone(false);
                                }}
                                className="px-3 bg-white border border-gray-200 text-gray-500 rounded-[14px] text-[12px] font-bold active:scale-95 transition-transform cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                setPhoneTemp(profilePhone);
                                setIsEditingPhone(true);
                              }}
                              className="px-3.5 bg-white border border-gray-200 text-[#3C2F2F] hover:bg-gray-50 rounded-[16px] text-[12.5px] font-bold active:scale-95 transition-transform shrink-0 cursor-pointer"
                            >
                              Change
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB SECTION: DIETARY PREFERENCES & ALLERGIES */}
                  {profileActiveSubSection === 'diet' && (
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 space-y-4 animate-fadeIn">
                      <div>
                        <h4 className="font-poppins font-bold text-[14px] text-gray-400 uppercase tracking-wide border-b border-gray-50 pb-1 text-left">Dietary Preferences</h4>
                        <span className="font-roboto text-[11px] text-[#A6A6A6]">Match dishes containing your preferred diets</span>
                      </div>
                      
                      {/* Diet tags */}
                      <div className="flex flex-wrap gap-2.5">
                        {[
                          { id: 'healthy', label: 'Healthy', icon: (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 shrink-0">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                          )},
                          { id: 'halal', label: 'Halal', icon: (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 shrink-0">
                              <path d="M12 3a9 9 0 1 0 9 9 9.75 9.75 0 0 0-.5-3 6.75 6.75 0 0 1-8.5-8.5A10 10 0 0 0 12 3z" />
                            </svg>
                          )},
                          { id: 'vegan', label: 'Vegan', icon: (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 shrink-0">
                              <path d="M2 22c5-1 9-4 11-9S18 4 22 2c-1 5-4 9-9 11s-8 6-11 9z" />
                            </svg>
                          )}
                        ].map((diet) => {
                          const isSelected = profilePreferFood.includes(diet.id);
                          return (
                            <button
                              key={diet.id}
                              onClick={() => {
                                handleToggleDietary(diet.id);
                              }}
                              className={`px-3.5 py-2 rounded-full border text-[13px] font-roboto font-medium flex items-center transition-all focus:outline-none cursor-pointer ${
                                isSelected
                                  ? 'bg-[#EF2A39]/10 border-[#EF2A39] text-[#EF2A39]'
                                  : 'bg-[#F9FAFB] border-gray-100 text-[#6A6A6A] hover:bg-gray-100'
                              }`}
                            >
                              {diet.icon}
                              {diet.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-gray-50">
                        <h4 className="font-poppins font-bold text-[14px] text-gray-400 uppercase tracking-wide border-b border-gray-50 pb-1 text-left">Allergies</h4>
                        <span className="font-roboto text-[11px] text-[#A6A6A6]">Dishes with these ingredients will be flagged</span>
                      </div>

                      {/* Allergy chips */}
                      <div className="flex flex-wrap gap-2.5">
                        {[
                          { id: 'peanuts', label: 'Peanuts', icon: (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 shrink-0">
                              <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" />
                            </svg>
                          )},
                          { id: 'gluten', label: 'Gluten', icon: (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 shrink-0">
                              <path d="M12 2v20M8 5l4-2 4 2M8 10l4-2 4 2M8 15l4-2 4 2M8 20l4-2 4 2" />
                            </svg>
                          )},
                          { id: 'dairy', label: 'Dairy', icon: (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 shrink-0">
                              <path d="M6 20h12V10L14 6H10L6 10v10z" />
                              <path d="M6 10h12" />
                            </svg>
                          )},
                          { id: 'shellfish', label: 'Shellfish', icon: (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 shrink-0">
                              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                              <path d="M12 8a4 4 0 0 0-4 4" />
                            </svg>
                          )}
                        ].map((allergy) => {
                          const isSelected = profileAllergies.includes(allergy.id);
                          return (
                            <button
                              key={allergy.id}
                              onClick={() => {
                                handleToggleAllergy(allergy.id);
                              }}
                              className={`px-3.5 py-2 rounded-full border text-[13px] font-roboto font-medium flex items-center transition-all focus:outline-none cursor-pointer ${
                                isSelected
                                  ? 'bg-[#EF2A39]/10 border-[#EF2A39] text-[#EF2A39]'
                                  : 'bg-[#F9FAFB] border-gray-100 text-[#6A6A6A] hover:bg-gray-100'
                              }`}
                            >
                              {allergy.icon}
                              {allergy.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SUB SECTION: SAVED PAYMENT METHODS */}
                  {profileActiveSubSection === 'payment' && (
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 space-y-4 animate-fadeIn">
                      <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                        <h4 className="font-poppins font-bold text-[14px] text-gray-400 uppercase tracking-wide text-left">Payment Cards</h4>
                        <button 
                          onClick={() => setShowAddCardModal(true)}
                          className="text-[#EF2A39] font-roboto font-bold text-[12.5px] active:scale-95 transition-transform cursor-pointer"
                        >
                          + Add Card
                        </button>
                      </div>

                      <div className="space-y-3">
                        {paymentCards.length > 0 ? (
                          paymentCards.map((card) => (
                            <div key={card.id} className="flex items-center justify-between p-3.5 bg-[#F9FAFB] rounded-[18px] border border-gray-100">
                              <div className="flex items-center gap-3">
                                <div className="w-[42px] h-[28px] bg-white rounded-lg flex items-center justify-center p-1 border border-gray-100 shadow-sm shrink-0">
                                  <img src={card.logo} alt={card.name} className="max-h-full max-w-full object-contain" />
                                </div>
                                <div className="text-left">
                                  <span className="font-roboto font-bold text-[13.5px] text-[#3C2F2F] block">{card.name}</span>
                                  <span className="font-roboto text-[11px] text-[#A6A6A6] block mt-0.5">{card.number}</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  setPaymentCards(prev => prev.filter(c => c.id !== card.id));
                                  setProfileMessage({ type: 'success', text: 'Payment card removed.' });
                                  setTimeout(() => setProfileMessage(null), 3000);
                                }}
                                className="w-7 h-7 bg-red-50 hover:bg-red-100 text-[#EF2A39] rounded-[10px] flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          ))
                        ) : (
                          <span className="text-[13px] text-gray-400 font-roboto block text-center py-2">No payment methods saved.</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB SECTION: SAVED LOCATIONS */}
                  {profileActiveSubSection === 'locations' && (
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 space-y-4 animate-fadeIn">
                      <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                        <h4 className="font-poppins font-bold text-[14px] text-gray-400 uppercase tracking-wide text-left">Saved Addresses</h4>
                        <button 
                          onClick={() => {
                            setNewLocationName('');
                            setNewLocationAddress('');
                            setShowLocationModal(true);
                          }}
                          className="text-[#EF2A39] font-roboto font-bold text-[12.5px] active:scale-95 transition-transform cursor-pointer"
                        >
                          + Add New
                        </button>
                      </div>

                      <div className="space-y-3">
                        {deliveryLocations.length > 0 ? (
                          deliveryLocations.map((loc) => {
                            const isActive = deliveryAddress === `${loc.name}: ${loc.address}` || deliveryAddress === loc.address;
                            return (
                              <div 
                                key={loc.id} 
                                onClick={() => setDeliveryAddress(`${loc.name}: ${loc.address}`)}
                                className={`flex items-center justify-between p-3.5 rounded-[18px] border transition-all cursor-pointer ${
                                  isActive ? 'border-[#EF2A39] bg-red-50/10' : 'border-gray-100 bg-[#F9FAFB]'
                                }`}
                              >
                                <div className="text-left min-w-0 pr-3">
                                  <span className="font-roboto font-bold text-[13.5px] text-[#3C2F2F] block truncate">
                                    {loc.name} {isActive && <span className="text-[9px] bg-[#EF2A39] text-white px-1.5 py-0.5 rounded-full ml-1 font-bold uppercase tracking-wider">Active</span>}
                                  </span>
                                  <span className="font-roboto text-[11px] text-[#A6A6A6] block mt-0.5 truncate">{loc.address}</span>
                                </div>
                                <button 
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (getAuthToken() && !loc.id.startsWith('loc_')) {
                                      await apiRequest(`/addresses/${loc.id}`, { method: 'DELETE' });
                                    }
                                    setDeliveryLocations(prev => prev.filter(l => l.id !== loc.id));
                                    setProfileMessage({ type: 'success', text: 'Location removed.' });
                                    setTimeout(() => setProfileMessage(null), 3000);
                                  }}
                                  className="w-7 h-7 bg-red-50 hover:bg-red-100 text-[#EF2A39] rounded-[10px] flex items-center justify-center active:scale-90 transition-transform shrink-0 cursor-pointer"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-[13px] text-gray-400 font-roboto block text-center py-2">No locations saved.</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB SECTION: CHANGE PASSWORD */}
                  {profileActiveSubSection === 'password' && (
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 space-y-4 animate-fadeIn">
                      <h4 className="font-poppins font-bold text-[14px] text-gray-400 uppercase tracking-wide border-b border-gray-50 pb-1 text-left">Update Security</h4>
                      
                      {passwordError && <span className="text-[12px] font-roboto font-semibold text-[#EF2A39] block text-left">{passwordError}</span>}
                      {passwordSuccess && <span className="text-[12px] font-roboto font-semibold text-green-600 block text-left">{passwordSuccess}</span>}

                      <div className="space-y-3">
                        <input 
                          type="password" 
                          placeholder="New Password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-[#F9FAFB] border border-gray-100 rounded-[16px] px-4 py-3 text-[14px] font-medium text-[#3C2F2F] outline-none focus:border-[#EF2A39]/30 transition-all text-left"
                        />
                        <input 
                          type="password" 
                          placeholder="Confirm New Password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-[#F9FAFB] border border-gray-100 rounded-[16px] px-4 py-3 text-[14px] font-medium text-[#3C2F2F] outline-none focus:border-[#EF2A39]/30 transition-all text-left"
                        />
                        <button 
                          onClick={() => {
                            setPasswordError('');
                            setPasswordSuccess('');
                            if (!newPassword || !confirmPassword) {
                              setPasswordError('Please fill in both fields.');
                              return;
                            }
                            if (newPassword !== confirmPassword) {
                              setPasswordError('Passwords do not match.');
                              return;
                            }
                            if (newPassword.length < 6) {
                              setPasswordError('Password must be at least 6 characters.');
                              return;
                            }
                            const token = getAuthToken();
                            if (token) {
                              apiRequest('/auth/change-password', {
                                method: 'POST',
                                body: { new_password: newPassword }
                              }).then((res) => {
                                if (res.success) {
                                  setCurrentPassword(newPassword);
                                  setNewPassword('');
                                  setConfirmPassword('');
                                  setPasswordSuccess('Password successfully updated!');
                                  setTimeout(() => setPasswordSuccess(''), 3000);
                                } else {
                                  setPasswordError(res.error || 'Failed to update password.');
                                }
                              });
                            } else {
                              setPasswordError('Authentication required.');
                            }
                          }}
                          className="w-full h-[46px] bg-[#FFE100] hover:brightness-95 active:scale-95 transition-all rounded-[16px] font-roboto font-bold text-[14px] text-[#3C2F2F] shadow-[0_4px_12px_rgba(255,225,0,0.15)] cursor-pointer"
                        >
                          Update Password
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUB SECTION: NOTIFICATIONS */}
                  {profileActiveSubSection === 'notifications' && (
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 flex items-center justify-between animate-fadeIn">
                      <div className="text-left">
                        <h4 className="font-poppins font-semibold text-[15px] text-[#3C2F2F]">Push Notifications</h4>
                        <span className="font-roboto text-[11px] text-[#A6A6A6]">Stay updated on tracking details & deals</span>
                      </div>
                      <button 
                        onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                        className={`w-[50px] h-[28px] rounded-full transition-colors relative focus:outline-none cursor-pointer ${
                          notificationsEnabled ? 'bg-[#4CAF50]' : 'bg-gray-200'
                        }`}
                      >
                        <div className={`w-[22px] h-[22px] bg-white rounded-full absolute top-[3px] transition-all shadow-[0_2px_4px_rgba(0,0,0,0.15)] ${
                          notificationsEnabled ? 'left-[25px]' : 'left-[3px]'
                        }`} />
                      </button>
                    </div>
                  )}

                  {/* SUB SECTION: ORDER HISTORY */}
                  {profileActiveSubSection === 'orders' && (
                    <div className="space-y-5 flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide">
                      
                      {/* Active / Ongoing Orders Section */}
                      <div className="space-y-3">
                        <h4 className="font-poppins font-bold text-[16px] text-[#3C2F2F] border-b border-gray-50 pb-2 text-left">
                          Active Deliveries ⚡
                        </h4>
                        
                        {orders.filter(o => o.status !== 'Completed').length === 0 ? (
                          <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6 text-center select-none">
                            <div className="w-[54px] h-[54px] bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-3 text-[#FFE100]">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <rect x="1" y="3" width="15" height="13" />
                                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                <circle cx="5.5" cy="18.5" r="2.5" />
                                <circle cx="18.5" cy="18.5" r="2.5" />
                              </svg>
                            </div>
                            <span className="font-poppins font-bold text-[14px] text-[#3C2F2F]">No Active Orders</span>
                            <p className="font-roboto text-[12px] text-[#A6A6A6] mt-1">
                              Place an order from home and track it here in real-time!
                            </p>
                          </div>
                        ) : (
                          orders.filter(o => o.status !== 'Completed').map((order) => {
                            return (
                              <div 
                                key={order.id} 
                                className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-4.5 flex flex-col gap-3.5 relative select-none"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-[42px] h-[42px] rounded-[14px] overflow-hidden bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
                                      <img src={order.restaurantLogo} alt={order.restaurantName} className="w-full h-full object-cover scale-[1.02]" />
                                    </div>
                                    <div className="text-left">
                                      <span className="font-poppins font-bold text-[14.5px] text-[#3C2F2F] block leading-snug">
                                        {order.restaurantName}
                                      </span>
                                      <span className="font-roboto font-normal text-[11px] text-[#A6A6A6] block mt-0.5">
                                        {order.date}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="font-roboto font-bold text-[16px] text-[#EF2A39]">
                                    ${order.totalPrice.toFixed(2)}
                                  </span>
                                </div>

                                <div className="border-t border-b border-gray-50/70 py-2.5 text-left">
                                  <div className="space-y-1 font-roboto text-[12.5px] text-[#6A6A6A]">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="flex justify-between">
                                        <span>
                                          {item.quantity}x {item.foodItem.name} ({item.size})
                                        </span>
                                        <span className="text-[#3C2F2F] font-medium">
                                          ${(item.pricePerUnit * item.quantity).toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-1.5 text-left">
                                    <span className="w-2.5 h-2.5 bg-[#FFE100] rounded-full animate-ping shrink-0" />
                                    <span className="font-roboto font-bold text-[12px] text-[#3C2F2F]">
                                      Status: <span className="text-[#EF2A39]">{order.status}</span>
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleTrackOrder(order)}
                                    className="px-4.5 py-2 bg-[#FFE100] hover:brightness-95 active:scale-95 transition-all rounded-[14px] font-roboto font-bold text-[12.5px] text-[#3C2F2F] shadow-[0_4px_12px_rgba(255,225,0,0.2)] cursor-pointer focus:outline-none"
                                  >
                                    Track Order
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Completed / Past Orders Section */}
                      <div className="space-y-3 pb-8">
                        <h4 className="font-poppins font-bold text-[16px] text-[#3C2F2F] border-b border-gray-50 pb-2 pt-2 text-left">
                          Order History 📜
                        </h4>
                        
                        {orders.filter(o => o.status === 'Completed').map((order) => {
                          return (
                            <div 
                              key={order.id} 
                              className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-4.5 flex flex-col gap-3.5 relative select-none"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-[42px] h-[42px] rounded-[14px] overflow-hidden bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
                                    <img src={order.restaurantLogo} alt={order.restaurantName} className="w-full h-full object-cover scale-[1.02]" />
                                  </div>
                                  <div className="text-left">
                                    <span className="font-poppins font-bold text-[14.5px] text-[#3C2F2F] block leading-snug">
                                      {order.restaurantName}
                                    </span>
                                    <span className="font-roboto font-normal text-[11px] text-[#A6A6A6] block mt-0.5">
                                      {order.date}
                                    </span>
                                  </div>
                                </div>
                                <span className="font-roboto font-bold text-[16px] text-[#3C2F2F]">
                                  ${order.totalPrice.toFixed(2)}
                                </span>
                              </div>

                              <div className="border-t border-b border-gray-50/70 py-2.5 text-left">
                                <div className="space-y-1 font-roboto text-[12.5px] text-[#6A6A6A]">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between">
                                      <span>
                                        {item.quantity}x {item.foodItem.name} ({item.size})
                                      </span>
                                      <span className="text-[#A6A6A6]">
                                        ${(item.pricePerUnit * item.quantity).toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5 text-left">
                                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full shrink-0" />
                                  <span className="font-roboto font-bold text-[12px] text-[#6A6A6A]">
                                    Status: <span className="text-green-600">Delivered</span>
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleReorder(order)}
                                  className="px-4.5 py-2 bg-white border border-[#EF2A39] hover:bg-red-50/50 active:scale-95 transition-all rounded-[14px] font-roboto font-bold text-[12.5px] text-[#EF2A39] cursor-pointer focus:outline-none"
                                >
                                  Re-order
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}

                </div>
              )}

            </div>
          )}
        </div>

            {/* Fixed Custom Bottom Navigation Layer (y = 856 to 932, h = 76px) */}
            <div className="absolute bottom-0 left-0 right-0 h-[76px] z-40 select-none">
              {/* Custom Yellow SVG notched bar with smooth mathematical curve and drop shadow */}
              <svg 
                viewBox="0 0 430 76" 
                className="absolute bottom-0 w-full h-full fill-[#FFE100] overflow-visible"
                style={{ filter: 'drop-shadow(0px -4px 8px rgba(0, 0, 0, 0.15))' }}
                preserveAspectRatio="none"
              >
                <path d="M 0 0 L 144 0 A 41 41 0 0 1 179.5 20.5 A 41 41 0 0 0 250.5 20.5 A 41 41 0 0 1 286 0 L 430 0 L 430 76 L 0 76 Z" />
              </svg>

              {/* Floating Action Button (Red circular cart button, centered responsively, diameter = 72px + shadow padding) */}
              <button 
                onClick={() => {
                  setPreviousView('home');
                  setCurrentView('cart');
                }}
                className="absolute left-1/2 -translate-x-1/2 -top-[52px] w-[114px] h-[114px] flex items-center justify-center cursor-pointer active:scale-95 transition-transform z-50 focus:outline-none"
              >
                <div className="w-[72px] h-[72px] bg-[#EF2A39] rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(239,42,57,0.4)] relative">
                  <CartIcon color="#FFFFFF" size={26} />
                  {cartItems.length > 0 && (
                    <div className="absolute -top-1 -right-1 bg-white text-[#EF2A39] border border-[#EF2A39] text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                    </div>
                  )}
                </div>
              </button>

              {/* Nav Menu Icons (y = 17px relative to bottom bar) */}
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <div key={item.id}>
                    {/* Icon button */}
                    <button
                      onClick={() => {
                        setActiveTab(item.id);
                        if (item.id === 'comment') {
                          setCurrentView('tracking');
                        } else if (item.id === 'home') {
                          setCurrentView('home');
                        }
                      }}
                      className={`absolute ${item.left} -translate-x-1/2 top-[17px] w-6 h-6 flex items-center justify-center cursor-pointer transition-transform active:scale-90 z-50 focus:outline-none`}
                    >
                      <img 
                        src={item.icon} 
                        alt={item.id} 
                        className={`w-full h-full object-contain ${isActive ? 'opacity-100 scale-105' : 'opacity-85'}`}
                      />
                    </button>
                    {/* Active Indicator White Dot (y = 49px relative to bottom bar) */}
                    {isActive && (
                      <div className={`absolute ${item.dotLeft} -translate-x-1/2 top-[49px] w-1 h-1 bg-white rounded-full z-50`}></div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          selectedFoodItem && (
            <div className="absolute inset-0 bg-white flex flex-col select-none z-50 animate-fadeIn">
              
              {/* Back Button (x = 12px, y = 22px relative) */}
              <button 
                onClick={goBack} 
                className="absolute left-[12px] top-[22px] w-[28px] h-[28px] flex items-center justify-center cursor-pointer active:scale-90 transition-transform focus:outline-none z-50"
              >
                <img 
                  src="/assets/icon_arrow_left.svg" 
                  alt="Back" 
                  className="w-full h-full object-contain" 
                />
              </button>

              {/* Support Chat Button */}
              <button 
                onClick={() => {
                  setPreviousView(currentView);
                  setChatRecipient('support');
                  setCurrentView('chat');
                }}
                className="absolute left-[48px] top-[22px] w-[28px] h-[28px] bg-[#2563EB] hover:bg-[#1D4ED8] rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.25)] active:scale-90 transition-transform focus:outline-none cursor-pointer z-50 animate-fadeIn"
                title="Customer Support"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>

              {/* Search Icon (x = 391px, y = 28px relative) */}
              <button 
                className="absolute right-[19px] top-[28px] w-[20px] h-[20px] flex items-center justify-center cursor-pointer active:scale-90 transition-transform focus:outline-none z-50"
              >
                <img 
                  src="/assets/icon_search.svg" 
                  alt="Search" 
                  className="w-full h-full object-contain" 
                />
              </button>

              {/* Swipe/Scroll Navigation Chevrons */}
              {getNavigationList().length > 1 && (
                <>
                  <button 
                    onClick={() => navigateItem('prev')}
                    className="absolute left-[12px] top-[170px] w-[40px] h-[40px] rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.12)] border border-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-50 active:scale-90 transition-all z-[60] focus:outline-none"
                    title="Previous Item"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF2A39" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  
                  <button 
                    onClick={() => navigateItem('next')}
                    className="absolute right-[12px] top-[170px] w-[40px] h-[40px] rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.12)] border border-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-50 active:scale-90 transition-all z-[60] focus:outline-none"
                    title="Next Item"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF2A39" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </>
              )}

              {/* Burger Image & Shadow Group (shifted higher) */}
              <div className="absolute left-[40px] top-[16px] w-[350px] h-[350px] select-none pointer-events-none">
                {/* Ellipse shadow */}
                <div className="absolute left-[41px] top-[299px] w-[268px] h-[28px] bg-black/5 rounded-full blur-[6px]" />
                
                {/* Burger high-res image */}
                <img 
                  src={selectedFoodItem.id === 'food_1' ? '/assets/hamburger_details.png' : selectedFoodItem.image} 
                  alt={selectedFoodItem.name} 
                  className="absolute left-0 top-0 w-full h-full object-contain"
                />
              </div>

              {/* Size selection group (right under the burger image) */}
              <div className="absolute left-[19px] top-[380px] w-[184px] h-[65px]">
                <span className="absolute left-0 top-0 font-roboto font-semibold text-[16px] text-[#3C2F2F]">
                  Size
                </span>
                <div className="absolute left-0 top-[25px] w-[184px] h-[40px] flex gap-[32px]">
                  {(['S', 'M', 'L'] as const).map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`w-[40px] h-[40px] rounded-[14px] flex items-center justify-center font-roboto font-medium text-[16px] transition-all cursor-pointer focus:outline-none ${
                          isSelected
                            ? 'bg-[#FFE100] text-[#3C2F2F] shadow-[0_7px_30px_rgba(255,225,0,0.3)]'
                            : 'bg-white text-[#3C2F2F] shadow-[0_7px_30px_rgba(0,0,0,0.06)] border border-gray-100'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title (placed below Size selector) */}
              <h2 className="absolute left-[19px] top-[460px] w-[362px] font-roboto font-semibold text-[28px] text-[#3C2F2F] leading-[34px] text-left truncate">
                {selectedFoodItem.name}
              </h2>

              {/* Rating & Delivery Time (placed below Title) */}
              <div className="absolute left-[19px] top-[502px] flex items-center gap-[12px]">
                <div className="flex items-center gap-[6px]">
                  <img 
                    src="/assets/icon_card_star.svg" 
                    alt="Star" 
                    className="w-[16px] h-[16px] object-contain" 
                  />
                  <span className="font-roboto font-semibold text-[16px] text-[#3C2F2F]">
                    {selectedFoodItem.rating.toFixed(1)}
                  </span>
                  <span className="font-roboto font-normal text-[16px] text-[#A6A6A6]">
                    — {selectedFoodItem.deliveryTime}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    if (selectedFoodItem) {
                      const match = restaurants.find(r => r.name.toLowerCase() === selectedFoodItem.brand.toLowerCase() || selectedFoodItem.brand.toLowerCase().includes(r.name.toLowerCase()));
                      if (match) {
                        setSelectedRestaurant(match);
                      } else {
                        const wendys = restaurants.find(r => r.id === 'rest_wendys' || r.name.toLowerCase().includes("wendy"));
                        if (wendys) setSelectedRestaurant(wendys);
                      }
                    }
                    setPreviousView('detail');
                    setRestaurantTab('overview');
                    setCurrentView('restaurant');
                  }}
                  className="bg-[#EF2A39]/10 hover:bg-[#EF2A39]/15 border border-[#EF2A39]/20 rounded-full px-2.5 py-0.5 text-[11px] font-roboto font-bold text-[#EF2A39] active:scale-95 transition-transform cursor-pointer flex items-center gap-1 focus:outline-none"
                >
                  <span>Store</span>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>

              {/* Product Description (placed below Rating/Time) */}
              <p className="absolute left-[19px] top-[536px] w-[392px] font-roboto font-normal text-[15px] text-[#A6A6A6] leading-[22px] text-left">
                {selectedFoodItem.description}
              </p>

              {/* Customizer Capsule Row (top = 630px) */}
              <div className="absolute left-[19px] top-[630px] w-[392px] h-[44px] flex gap-[12px] z-20">
                {/* Toppings Capsule */}
                <button
                  onClick={() => setActiveCustomizerTab('toppings')}
                  className={`flex-1 h-[44px] rounded-full border flex items-center justify-center gap-1.5 font-inter font-medium text-[13px] transition-all cursor-pointer focus:outline-none bg-white ${
                    selectedToppings.length > 0
                      ? 'border-[#EF2A39] text-[#EF2A39] bg-[#EF2A39]/5 shadow-[0_2px_8px_rgba(239,42,57,0.05)]'
                      : 'border-gray-200 text-[#3C2F2F] hover:border-gray-300'
                  }`}
                >
                  <span className="text-[#EF2A39] font-bold text-[15px]">+</span>
                  Toppings
                  {selectedToppings.length > 0 && (
                    <span className="ml-0.5 bg-[#EF2A39] text-white text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                      {selectedToppings.length}
                    </span>
                  )}
                </button>

                {/* Addons Capsule */}
                <button
                  onClick={() => setActiveCustomizerTab('addons')}
                  className={`flex-1 h-[44px] rounded-full border flex items-center justify-center gap-1.5 font-inter font-medium text-[13px] transition-all cursor-pointer focus:outline-none bg-white ${
                    selectedAddons.length > 0
                      ? 'border-[#EF2A39] text-[#EF2A39] bg-[#EF2A39]/5 shadow-[0_2px_8px_rgba(239,42,57,0.05)]'
                      : 'border-gray-200 text-[#3C2F2F] hover:border-gray-300'
                  }`}
                >
                  <span className="text-[#EF2A39] font-bold text-[15px]">+</span>
                  Addons
                  {selectedAddons.length > 0 && (
                    <span className="ml-0.5 bg-[#EF2A39] text-white text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                      {selectedAddons.length}
                    </span>
                  )}
                </button>

                {/* Drinks Capsule */}
                <button
                  onClick={() => setActiveCustomizerTab('drinks')}
                  className={`flex-1 h-[44px] rounded-full border flex items-center justify-center gap-1.5 font-inter font-medium text-[13px] transition-all cursor-pointer focus:outline-none bg-white ${
                    selectedDrinks.length > 0
                      ? 'border-[#EF2A39] text-[#EF2A39] bg-[#EF2A39]/5 shadow-[0_2px_8px_rgba(239,42,57,0.05)]'
                      : 'border-gray-200 text-[#3C2F2F] hover:border-gray-300'
                  }`}
                >
                  <span className="text-[#EF2A39] font-bold text-[15px]">+</span>
                  Drinks
                  {selectedDrinks.length > 0 && (
                    <span className="ml-0.5 bg-[#EF2A39] text-white text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                      {selectedDrinks.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Spicy slider group (shifted up, top = 690px, w = 230px) */}
              <div className="absolute left-[19px] top-[690px] w-[230px] h-[67px]">
                <span className="absolute left-0 top-0 font-roboto font-semibold text-[16px] text-[#3C2F2F]">
                  Spicy
                </span>
                
                {/* Slider track container */}
                <div className="absolute left-[3px] top-[30px] w-[230px] h-[14px] flex items-center">
                  {/* Track background */}
                  <div className="absolute left-0 right-0 h-[4px] bg-[#F3F4F6] rounded-full" />
                  {/* Active track fill */}
                  <div 
                    className="absolute left-0 h-[4px] bg-[#EF2A39] rounded-full" 
                    style={{ width: `${spicyLevel}%` }}
                  />
                  {/* Thumb */}
                  <div 
                    className="absolute w-[14px] h-[14px] bg-[#EF2A39] rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.2)] -translate-x-1/2 pointer-events-none"
                    style={{ left: `${spicyLevel}%` }}
                  />
                  {/* Input range */}
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={spicyLevel} 
                    onChange={(e) => setSpicyLevel(Number(e.target.value))} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                </div>

                {/* Slider labels */}
                <span className="absolute left-0 top-[51px] font-roboto font-medium text-[14px] text-[#4CAF50]">
                  Mild
                </span>
                <span className="absolute left-[210px] top-[51px] font-roboto font-medium text-[14px] text-[#EF2A39]">
                  Hot
                </span>
              </div>

              {/* Price display (white card, old style, left = 290px, top = 690px, w = 121px, h = 64px) */}
              <div className="absolute left-[290px] top-[690px] w-[121px] h-[64px] bg-white rounded-[24px] shadow-[0_7px_30px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center select-none">
                <span className="font-roboto font-bold text-[22px] text-[#3C2F2F]">
                  ${(
                    (selectedSize === 'S' ? selectedFoodItem.price - 0.50 : selectedSize === 'L' ? selectedFoodItem.price + 1.00 : selectedFoodItem.price) +
                    selectedToppings.reduce((sum, id) => sum + (toppingOptions.find(o => o.id === id)?.price || 0), 0) +
                    selectedAddons.reduce((sum, id) => sum + (addonOptions.find(o => o.id === id)?.price || 0), 0) +
                    selectedDrinks.reduce((sum, id) => sum + (drinkOptions.find(o => o.id === id)?.price || 0), 0)
                  ).toFixed(2)}
                </span>
              </div>

              {/* Bottom Action Bar (Price box removed for spacing, ADD TO CART & Red Cart button, h = 70px) */}
              <div className="absolute bottom-[34px] left-[19px] right-[19px] h-[70px] flex gap-[14px]">
                {/* ADD TO CART button */}
                <button 
                  onClick={addToCart}
                  className="flex-1 h-[70px] bg-[#FFE100] rounded-[24px] shadow-[0_10px_25px_rgba(255,225,0,0.25)] flex items-center justify-center cursor-pointer active:scale-95 transition-transform focus:outline-none"
                >
                  <span className="font-roboto font-bold text-[18px] text-[#3C2F2F]">
                    {addedToCartFeedback ? "✓ ADDED!" : "ADD TO CART"}
                  </span>
                </button>

                {/* Red Cart button */}
                <button 
                  onClick={() => {
                    setPreviousView('detail');
                    setCurrentView('cart');
                  }}
                  className="w-[70px] h-[70px] bg-[#EF2A39] rounded-[24px] shadow-[0_10px_25px_rgba(239,42,57,0.3)] flex items-center justify-center cursor-pointer active:scale-95 transition-transform focus:outline-none shrink-0 relative"
                >
                  <CartIcon color="#FFFFFF" size={24} />
                  {cartItems.length > 0 && (
                    <div className="absolute -top-1 -right-1 bg-white text-[#EF2A39] border border-[#EF2A39] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                    </div>
                  )}
                </button>
              </div>

              {/* Slide-Up Bottom Sheet Customizer Modal overlay and content */}
              {activeCustomizerTab && (
                <>
                  {/* Backdrop Overlay */}
                  <div 
                    className="absolute inset-0 bg-black/40 z-[90] animate-fadeInSimple"
                    onClick={() => setActiveCustomizerTab(null)}
                  />
                  
                  {/* Slide Up Content */}
                  <div className="absolute bottom-0 left-0 right-0 max-h-[440px] bg-white rounded-t-[30px] z-[100] flex flex-col p-6 animate-slideUp shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-gray-100">
                    <div className="w-[48px] h-[5px] bg-gray-200 rounded-full mx-auto mb-5 shrink-0" />
                    
                    <h3 className="font-roboto font-bold text-[20px] text-[#3C2F2F] mb-4 text-left capitalize shrink-0">
                      Choose {activeCustomizerTab}
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 scrollbar-hide">
                      {(activeCustomizerTab === 'toppings' ? toppingOptions : activeCustomizerTab === 'addons' ? addonOptions : drinkOptions).map((option) => {
                        const isSelected = activeCustomizerTab === 'toppings' 
                          ? selectedToppings.includes(option.id)
                          : activeCustomizerTab === 'addons' 
                            ? selectedAddons.includes(option.id)
                            : selectedDrinks.includes(option.id);
                        
                        return (
                          <div 
                            key={option.id}
                            onClick={() => toggleOption(option.id, activeCustomizerTab)}
                            className={`flex items-center justify-between p-3.5 rounded-[16px] border transition-all cursor-pointer select-none active:scale-[0.99] ${
                              isSelected 
                                ? 'border-[#FFE100] bg-[#FFE100]/5' 
                                : 'border-gray-100 bg-white hover:border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-[20px] h-[20px] rounded-[6px] border flex items-center justify-center transition-all ${
                                isSelected ? 'bg-[#EF2A39] border-[#EF2A39]' : 'border-gray-300 bg-white'
                              }`}>
                                {isSelected && (
                                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                              <span className="font-roboto font-medium text-[15px] text-[#3C2F2F]">{option.name}</span>
                            </div>
                            <span className="font-roboto font-semibold text-[15px] text-[#EF2A39]">+${option.price.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                    
                    <button 
                      onClick={() => setActiveCustomizerTab(null)}
                      className="mt-5 w-full h-[55px] bg-[#FFE100] rounded-[18px] font-roboto font-bold text-[16px] text-[#3C2F2F] shadow-[0_6px_20px_rgba(255,225,0,0.3)] hover:brightness-95 active:scale-95 transition-all cursor-pointer focus:outline-none shrink-0"
                    >
                      Apply Selection
                    </button>
                  </div>
                </>
              )}

            </div>
          )
        )}

        {/* CHAT VIEW (DRIVER OR SUPPORT CHAT) */}
        {currentView === 'chat' && (() => {
          const messages = chatRecipient === 'support' ? supportMessages : driverMessages;
          const recipientName = chatRecipient === 'support' ? 'Customer Support' : 'Your Driver';
          const recipientAvatar = chatRecipient === 'support' ? '/assets/wolf_logo.png' : '/assets/driver_avatar.png';
          
          return (
            <div className="absolute inset-0 bg-[#F9FAFB] flex flex-col select-none z-50 animate-fadeIn text-[#3C2F2F]">
              {/* Header */}
              <div className="h-[76px] shrink-0 flex items-center justify-between px-[19px] border-b border-gray-100 bg-white shadow-sm z-10">
                <button 
                  onClick={() => {
                    if (chatRecipient === 'support') {
                      goBack();
                    } else {
                      setCurrentView('tracking');
                    }
                  }} 
                  className="w-[28px] h-[28px] flex items-center justify-center cursor-pointer active:scale-90 transition-transform focus:outline-none"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>

                <div className="flex items-center gap-2.5">
                  <div className="w-[36px] h-[36px] rounded-full overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                    <img 
                      src={recipientAvatar} 
                      alt={recipientName} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="text-left">
                    <span className="font-poppins font-bold text-[14px] text-[#3C2F2F] block leading-tight">
                      {recipientName}
                    </span>
                    <span className="font-roboto font-semibold text-[10px] text-[#4CAF50] block mt-0.5 uppercase tracking-wider">
                      {chatRecipient === 'support' ? 'Online • 24/7' : 'Active • On Way'}
                    </span>
                  </div>
                </div>

                <div className="w-[28px]" />
              </div>

              {/* Message scroll container */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-hide bg-gray-50/50">
                {/* 26 minutes ago separator */}
                <div className="text-center my-2">
                  <span className="font-roboto font-normal text-[11px] text-[#A6A6A6] bg-white border border-gray-100 px-3 py-1 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.01)]">
                    26 minutes ago
                  </span>
                </div>

                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div 
                      key={msg.id}
                      className={`flex gap-2.5 max-w-[85%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}
                    >
                      {/* Avatar */}
                      <div className="w-[32px] h-[32px] rounded-full overflow-hidden bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                        <img 
                          src={isUser ? profilePicture : recipientAvatar} 
                          alt={isUser ? 'User' : recipientName} 
                          className="w-full h-full object-cover" 
                        />
                      </div>

                      {/* Text Bubble */}
                      <div className="flex flex-col">
                        <div 
                          className={`px-4 py-3 rounded-t-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-left ${
                            isUser 
                              ? 'bg-[#EF2A39] text-white rounded-l-[18px] rounded-r-none' 
                              : 'bg-[#F5F6F8] text-[#3C2F2F] rounded-r-[18px] rounded-l-none border border-gray-100/50'
                          }`}
                        >
                          <p className="font-roboto text-[13.5px] leading-relaxed break-words font-medium">
                            {msg.text}
                          </p>
                        </div>
                        <span className={`font-roboto text-[9.5px] text-[#A6A6A6] mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input bottom bar */}
              <div className="h-[76px] shrink-0 border-t border-gray-150/50 bg-white px-4 flex items-center shadow-lg relative z-10 pb-1">
                <input 
                  type="text" 
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  placeholder="Type here..."
                  className="flex-1 h-[48px] bg-gray-50 border border-gray-150 rounded-[18px] px-4 font-roboto text-[14px] text-[#3C2F2F] outline-none focus:border-[#EF2A39]/30 transition-all font-medium"
                />
                
                <button 
                  onClick={handleSendMessage}
                  className="w-[48px] h-[48px] bg-[#EF2A39] rounded-[16px] flex items-center justify-center cursor-pointer hover:brightness-95 active:scale-95 transition-all shadow-[0_4px_12px_rgba(239,42,57,0.25)] ml-3 focus:outline-none shrink-0"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform translate-x-[1px]">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })()}

        {/* RESTAURANT LANDING VIEW (WENDY'S) */}
        {currentView === 'restaurant' && (
          <div className="absolute inset-0 bg-[#F9FAFB] flex flex-col select-none z-50 animate-fadeIn text-[#3C2F2F]">
            
            {/* 1. OVERVIEW SUB-VIEW (Cover photo banner style) */}
            {restaurantTab === 'overview' && (
              <div className="flex-1 flex flex-col overflow-y-auto scrollbar-hide relative pb-28">
                {/* Banner Cover */}
                <div className="w-full h-[200px] relative shrink-0">
                  <img 
                    src={selectedRestaurant.cover} 
                    alt={`${selectedRestaurant.name} Storefront`} 
                    className="w-full h-full object-cover"
                  />
                  {/* Back button */}
                  <button 
                    onClick={goBack}
                    className="absolute left-[19px] top-[28px] w-[36px] h-[36px] bg-white rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:scale-90 transition-transform focus:outline-none cursor-pointer z-10"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                  </button>

                  {/* Support Chat Button */}
                  <button 
                    onClick={() => {
                      setPreviousView(currentView);
                      setChatRecipient('support');
                      setCurrentView('chat');
                    }}
                    className="absolute left-[63px] top-[28px] w-[36px] h-[36px] bg-[#2563EB] hover:bg-[#1D4ED8] rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.25)] active:scale-90 transition-transform focus:outline-none cursor-pointer z-10 animate-fadeIn"
                    title="Customer Support"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                  
                  {/* Action Buttons */}
                  <div className="absolute right-[19px] top-[28px] flex gap-3 z-10">
                    <button className="w-[36px] h-[36px] bg-white rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:scale-90 transition-transform focus:outline-none cursor-pointer">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => toggleFavoriteRestaurant(selectedRestaurant.id)}
                      className="w-[36px] h-[36px] bg-white rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:scale-90 transition-transform focus:outline-none cursor-pointer z-10"
                    >
                      <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill={favoriteRestaurants.includes(selectedRestaurant.id) ? "#EF2A39" : "none"} 
                        stroke={favoriteRestaurants.includes(selectedRestaurant.id) ? "#EF2A39" : "#3C2F2F"} 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Profile Logo & Title Container */}
                <div className="px-[19px] relative mt-[-46px] space-y-4">
                  {/* Overlapping logo */}
                  <div className="w-[92px] h-[92px] rounded-[24px] overflow-hidden bg-white border-4 border-white shadow-[0_6px_20px_rgba(0,0,0,0.12)] flex items-center justify-center">
                    <img 
                      src={selectedRestaurant.logo} 
                      alt={`${selectedRestaurant.name} Logo`} 
                      className="w-full h-full object-cover scale-[1.02]"
                    />
                  </div>

                  {/* Restaurant details */}
                  <div className="text-left space-y-1 pt-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-poppins font-bold text-[24px] text-[#3C2F2F] leading-tight">{selectedRestaurant.name}</h2>
                      <svg className="w-[18px] h-[18px] text-blue-500 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#0066FF"/>
                      </svg>
                    </div>
                    <span className="font-roboto text-[13px] text-[#A6A6A6] block">
                      {selectedRestaurant.tags.join(' • ')}
                    </span>
                    
                    <div className="flex items-center gap-3 pt-2 text-[12px] font-roboto">
                      <div className="bg-[#FFE100]/10 border border-[#FFE100]/25 rounded-full px-3 py-1 flex items-center gap-1 font-bold text-[#3C2F2F]">
                        <span className="text-[#FFE100] text-[13px] leading-none">★</span>
                        <span>{selectedRestaurant.rating}</span>
                        <span className="text-gray-400 font-normal ml-0.5">({selectedRestaurant.reviewsCount} reviews)</span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <span className="text-[#6A6A6A] font-medium">$$ • {selectedRestaurant.deliveryTime}</span>
                    </div>
                  </div>

                  {/* Specifications Card */}
                  <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50/50 border border-gray-100 rounded-[20px] p-3.5 mt-4 text-center shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
                    <div className="space-y-1 pr-1 text-left pl-3">
                      <span className="text-[13px] font-bold text-[#3C2F2F] block">{selectedRestaurant.deliveryTime}</span>
                      <span className="text-[10px] font-semibold text-[#A6A6A6] block">Delivery time</span>
                    </div>
                    <div className="space-y-1 px-1 text-left pl-3">
                      <span className="text-[13px] font-bold text-[#3C2F2F] block">${selectedRestaurant.deliveryFee.toFixed(2)}</span>
                      <span className="text-[10px] font-semibold text-[#A6A6A6] block">Delivery fee</span>
                    </div>
                    <div className="space-y-1 pl-3 text-left">
                      <span className="text-[13px] font-bold text-[#3C2F2F] block">${selectedRestaurant.minOrder.toFixed(2)}</span>
                      <span className="text-[10px] font-semibold text-[#A6A6A6] block">Min. order</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="text-left pt-2">
                    <p className="font-roboto font-normal text-[13.5px] text-[#A6A6A6] leading-relaxed">
                      {selectedRestaurant.description}
                    </p>
                  </div>

                  {/* Top Categories Scroller */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-poppins font-bold text-[15px] text-[#3C2F2F]">Top Categories</h4>
                      <button 
                        onClick={() => setRestaurantTab('menu')}
                        className="text-[#EF2A39] font-roboto font-bold text-[13px] active:scale-95 transition-transform"
                      >
                        See all
                      </button>
                    </div>

                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 shrink-0">
                      {[
                        { name: 'Burgers', image: '/assets/hamburger_1.png' },
                        { name: 'Chicken', image: '/assets/hamburger_details.png' },
                        { name: 'Sides', image: '/assets/hamburger_3.png' },
                        { name: 'Drinks', image: '/assets/hamburger_4.png' }
                      ].map((cat) => (
                        <button
                          key={cat.name}
                          onClick={() => {
                            setMenuActiveCategory(cat.name);
                            setRestaurantTab('menu');
                          }}
                          className="w-[100px] bg-white border border-gray-100/75 rounded-[20px] p-3 flex flex-col items-center gap-2 shadow-[0_4px_10px_rgba(0,0,0,0.02)] active:scale-95 transition-all shrink-0 focus:outline-none"
                        >
                          <div className="w-[60px] h-[40px] flex items-center justify-center">
                            <img src={cat.image} alt={cat.name} className="max-h-full max-w-full object-contain" />
                          </div>
                          <span className="font-poppins font-bold text-[12px] text-[#3C2F2F]">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. MENU SUB-VIEW */}
            {restaurantTab === 'menu' && (
              <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="h-[76px] shrink-0 flex items-center justify-between px-[19px] border-b border-gray-50 bg-white">
                  <button 
                    onClick={() => setRestaurantTab('overview')}
                    className="w-[28px] h-[28px] bg-gray-50 border border-gray-100 rounded-[10px] flex items-center justify-center cursor-pointer active:scale-90 transition-transform focus:outline-none"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <h3 className="font-poppins font-bold text-[16px] text-[#3C2F2F] uppercase tracking-wide">{selectedRestaurant.name} Menu</h3>
                  <div className="flex gap-2">
                    <button className="w-[28px] h-[28px] flex items-center justify-center active:scale-90 transition-transform focus:outline-none">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                    </button>
                    <button className="w-[28px] h-[28px] flex items-center justify-center active:scale-90 transition-transform focus:outline-none">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Categories Slider */}
                <div className="h-[52px] shrink-0 border-b border-gray-50 bg-white flex items-center overflow-x-auto scrollbar-hide px-[19px] gap-2.5">
                  {['All', 'Burgers', 'Chicken', 'Sides', 'Drinks', 'Desserts'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setMenuActiveCategory(cat)}
                      className={`px-4 h-[32px] rounded-full text-[12px] font-roboto font-bold transition-all focus:outline-none shrink-0 ${
                        menuActiveCategory === cat 
                          ? 'bg-[#EF2A39] text-white shadow-[0_4px_10px_rgba(239,42,57,0.2)]'
                          : 'bg-gray-150 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto scrollbar-hide px-[19px] pt-4 pb-28 space-y-6">
                  {/* Category Section: Burgers */}
                  {(menuActiveCategory === 'All' || menuActiveCategory === 'Burgers') && (
                    <div className="space-y-3">
                      <h4 className="font-poppins font-bold text-[14px] text-gray-400 uppercase tracking-wider text-left border-b border-gray-50 pb-1">Burgers</h4>
                      
                      <div className="space-y-3">
                        {restaurantMenuItems
                          .filter(i => i.category === 'Burgers')
                          .map((item) => (
                            <div 
                              key={item.id} 
                              onClick={() => {
                                const mappedFoodItem: FoodItem = {
                                  id: item.id,
                                  name: item.name,
                                  brand: item.brand,
                                  rating: selectedRestaurant.rating,
                                  image: item.image,
                                  description: item.description || "Fresh and delicious food prepared with high-quality ingredients.",
                                  price: item.price,
                                  deliveryTime: selectedRestaurant.deliveryTime
                                };
                                setSelectedFoodItem(mappedFoodItem);
                                setPortionCount(2);
                                setSpicyLevel(57);
                                setSelectedSize('M');
                                setSelectedToppings([]);
                                setSelectedAddons([]);
                                setSelectedDrinks([]);
                                setActiveCustomizerTab(null);
                                setPreviousView('restaurant');
                                setCurrentView('detail');
                              }}
                              className="flex items-center justify-between bg-white border border-gray-100/75 p-3 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] active:scale-[0.99] transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-[76px] h-[76px] rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center p-1.5 shrink-0">
                                  <img src={item.image} alt={item.name} className="max-h-full max-w-full object-contain" />
                                </div>
                                <div className="text-left min-w-0">
                                  <span className="font-poppins font-bold text-[14px] text-[#3C2F2F] block truncate">{item.name}</span>
                                  <span className="font-roboto text-[11px] text-[#A6A6A6] block mt-0.5 truncate">{item.brand}</span>
                                  <span className="font-roboto font-bold text-[13.5px] text-[#EF2A39] block mt-1">${item.price.toFixed(2)}</span>
                                </div>
                              </div>

                              {/* Cart control */}
                              <div className="shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                                {getCartQuantity(item.id) > 0 ? (
                                  <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-150 rounded-full px-2 py-0.5">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); removeRestaurantItemFromCart(item); }}
                                      className="w-[20px] h-[20px] bg-white rounded-full border border-gray-200 flex items-center justify-center font-bold text-[12px] text-[#6A6A6A] hover:bg-gray-100 active:scale-90 transition-all focus:outline-none cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="font-roboto font-bold text-[13px] text-[#3C2F2F]">
                                      {getCartQuantity(item.id)}
                                    </span>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); addRestaurantItemToCart(item); }}
                                      className="w-[20px] h-[20px] bg-[#EF2A39] text-white rounded-full flex items-center justify-center font-bold text-[12px] hover:bg-[#EF2A39]/90 active:scale-90 transition-all focus:outline-none cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); addRestaurantItemToCart(item); }}
                                    className="w-[28px] h-[28px] bg-[#EF2A39] text-white rounded-full flex items-center justify-center font-bold hover:bg-[#EF2A39]/95 active:scale-90 transition-all focus:outline-none cursor-pointer shadow-sm"
                                  >
                                    +
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Category Section: Chicken */}
                  {(menuActiveCategory === 'All' || menuActiveCategory === 'Chicken') && (
                    <div className="space-y-3 pt-2">
                      <h4 className="font-poppins font-bold text-[14px] text-gray-400 uppercase tracking-wider text-left border-b border-gray-50 pb-1">Chicken</h4>
                      
                      <div className="space-y-3">
                        {restaurantMenuItems
                          .filter(i => i.category === 'Chicken')
                          .map((item) => (
                            <div 
                              key={item.id} 
                              onClick={() => {
                                const mappedFoodItem: FoodItem = {
                                  id: item.id,
                                  name: item.name,
                                  brand: item.brand,
                                  rating: selectedRestaurant.rating,
                                  image: item.image,
                                  description: item.description || "Fresh and delicious food prepared with high-quality ingredients.",
                                  price: item.price,
                                  deliveryTime: selectedRestaurant.deliveryTime
                                };
                                setSelectedFoodItem(mappedFoodItem);
                                setPortionCount(2);
                                setSpicyLevel(57);
                                setSelectedSize('M');
                                setSelectedToppings([]);
                                setSelectedAddons([]);
                                setSelectedDrinks([]);
                                setActiveCustomizerTab(null);
                                setPreviousView('restaurant');
                                setCurrentView('detail');
                              }}
                              className="flex items-center justify-between bg-white border border-gray-100/75 p-3 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] active:scale-[0.99] transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-[76px] h-[76px] rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center p-1.5 shrink-0">
                                  <img src={item.image} alt={item.name} className="max-h-full max-w-full object-contain" />
                                </div>
                                <div className="text-left min-w-0">
                                  <span className="font-poppins font-bold text-[14px] text-[#3C2F2F] block truncate">{item.name}</span>
                                  <span className="font-roboto text-[11px] text-[#A6A6A6] block mt-0.5 truncate">{item.brand}</span>
                                  <span className="font-roboto font-bold text-[13.5px] text-[#EF2A39] block mt-1">${item.price.toFixed(2)}</span>
                                </div>
                              </div>

                              {/* Cart control */}
                              <div className="shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                                {getCartQuantity(item.id) > 0 ? (
                                  <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-150 rounded-full px-2 py-0.5">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); removeRestaurantItemFromCart(item); }}
                                      className="w-[20px] h-[20px] bg-white rounded-full border border-gray-200 flex items-center justify-center font-bold text-[12px] text-[#6A6A6A] hover:bg-gray-100 active:scale-90 transition-all focus:outline-none cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="font-roboto font-bold text-[13px] text-[#3C2F2F]">
                                      {getCartQuantity(item.id)}
                                    </span>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); addRestaurantItemToCart(item); }}
                                      className="w-[20px] h-[20px] bg-[#EF2A39] text-white rounded-full flex items-center justify-center font-bold text-[12px] hover:bg-[#EF2A39]/90 active:scale-90 transition-all focus:outline-none cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); addRestaurantItemToCart(item); }}
                                    className="w-[28px] h-[28px] bg-[#EF2A39] text-white rounded-full flex items-center justify-center font-bold hover:bg-[#EF2A39]/95 active:scale-90 transition-all focus:outline-none cursor-pointer shadow-sm"
                                  >
                                    +
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. REVIEWS SUB-VIEW */}
            {restaurantTab === 'reviews' && (
              <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="h-[76px] shrink-0 flex items-center justify-between px-[19px] border-b border-gray-50 bg-white">
                  <button 
                    onClick={() => setRestaurantTab('overview')}
                    className="w-[28px] h-[28px] bg-gray-50 border border-gray-100 rounded-[10px] flex items-center justify-center cursor-pointer active:scale-90 transition-transform focus:outline-none"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <h3 className="font-poppins font-bold text-[16px] text-[#3C2F2F] uppercase tracking-wide">Reviews</h3>
                  <div className="w-[28px]" />
                </div>

                {/* Scrollable Comments list */}
                <div className="flex-1 overflow-y-auto scrollbar-hide px-[19px] pt-4 pb-28 space-y-5">
                  
                  {/* Rating Breakdown card */}
                  <div className="bg-white rounded-[24px] border border-gray-100 p-5 flex items-center justify-between shadow-[0_4px_12px_rgba(0,0,0,0.01)] shrink-0">
                    <div className="text-left space-y-1">
                      <span className="font-poppins font-bold text-[32px] text-[#3C2F2F]">4.8</span>
                      <span className="text-[12px] font-roboto font-bold text-gray-400 block">Out of 5 stars</span>
                      <div className="flex text-[#FFE100] text-[15px] pt-1">
                        <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                      </div>
                    </div>
                    <div className="w-[72px] h-[72px] bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center p-2.5 shrink-0 overflow-hidden shadow-sm">
                      <img src={selectedRestaurant.logo} alt={`${selectedRestaurant.name} Mascot`} className="w-full h-full object-cover scale-[1.02]" />
                    </div>
                  </div>

                  {/* Reviews Feed */}
                  <div className="space-y-4">
                    <h4 className="font-poppins font-bold text-[14px] text-gray-400 uppercase tracking-wider text-left border-b border-gray-50 pb-1">Customer Feed</h4>
                    
                    <div className="space-y-3.5">
                      {restaurantReviews.map((rev) => (
                        <div key={rev.id} className="bg-white border border-gray-100 p-4 rounded-[22px] space-y-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] text-left">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2.5">
                              <div className="w-[36px] h-[36px] rounded-full overflow-hidden bg-gray-150 border border-white shrink-0 shadow-sm">
                                <img src={rev.avatar} alt={rev.author} className="w-full h-full object-cover scale-[1.05]" />
                              </div>
                              <div className="text-left">
                                <span className="font-poppins font-bold text-[13px] text-[#3C2F2F] block">{rev.author}</span>
                                <span className="font-roboto text-[10.5px] text-[#A6A6A6] block">{rev.date}</span>
                              </div>
                            </div>

                            {/* Stars rating display */}
                            <div className="flex text-[#FFE100] text-[11px]">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i}>{i < rev.rating ? '★' : '☆'}</span>
                              ))}
                            </div>
                          </div>
                          <p className="font-roboto text-[13px] text-[#6A6A6A] leading-relaxed">
                            {rev.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* 4. FLOATING STICKY ACTION NAV BAR (Menu / Reviews) */}
            <div className="absolute bottom-[20px] left-1/2 -translate-x-1/2 w-[340px] h-[60px] bg-white border border-gray-100 shadow-[0_12px_32px_rgba(0,0,0,0.15)] rounded-full flex items-center justify-between p-1.5 z-[60] select-none">
              <button 
                onClick={() => setRestaurantTab('menu')}
                className={`flex-1 h-full rounded-full flex items-center justify-center gap-2 font-roboto font-bold text-[13.5px] transition-all focus:outline-none cursor-pointer ${
                  restaurantTab === 'menu' 
                    ? 'bg-[#1C1C1E] text-white shadow-md' 
                    : 'bg-transparent text-[#6A6A6A] hover:bg-gray-50'
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <span>Menu</span>
              </button>
              <button 
                onClick={() => setRestaurantTab('reviews')}
                className={`flex-1 h-full rounded-full flex items-center justify-center gap-2 font-roboto font-bold text-[13.5px] transition-all focus:outline-none cursor-pointer ${
                  restaurantTab === 'reviews' 
                    ? 'bg-[#1C1C1E] text-white shadow-md' 
                    : 'bg-transparent text-[#6A6A6A] hover:bg-gray-50'
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>Reviews</span>
              </button>
            </div>

          </div>
        )}

        {/* CART VIEW (Checkout Page) */}
        {currentView === 'cart' && (() => {
          const subtotal = cartItems.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
          const deliveryFee = subtotal > 0 ? 3.00 : 0.00;
          const serviceFee = subtotal > 0 ? 1.50 : 0.00;
          const taxFee = subtotal > 0 ? subtotal * 0.08875 : 0.00;

          return (
            <div className="absolute inset-0 bg-white flex flex-col select-none z-50 animate-fadeIn">
              
              {/* Cart Header */}
              <div className="h-[76px] shrink-0 flex items-center justify-between px-[19px] relative border-b border-gray-50 bg-white">
                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={goBack} 
                    className="w-[28px] h-[28px] flex items-center justify-center cursor-pointer active:scale-90 transition-transform focus:outline-none"
                  >
                    <img 
                      src="/assets/icon_arrow_left.svg" 
                      alt="Back" 
                      className="w-full h-full object-contain" 
                    />
                  </button>
                  {/* Support Chat Button */}
                  <button 
                    onClick={() => {
                      setPreviousView(currentView);
                      setChatRecipient('support');
                      setCurrentView('chat');
                    }}
                    className="w-[28px] h-[28px] bg-[#2563EB] hover:bg-[#1D4ED8] rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.25)] active:scale-90 transition-transform focus:outline-none cursor-pointer animate-fadeIn"
                    title="Customer Support"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </div>
                
                <h2 className="font-inter font-semibold text-[16px] text-[#3C2F2F]">
                  Cart
                </h2>
                
                <div className="w-[66px]" /> {/* Spacer to center title */}
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto px-[19px] py-4 space-y-4 scrollbar-hide max-h-[500px]">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-10 text-center select-none">
                    <div className="w-[80px] h-[80px] bg-gray-50 rounded-full flex items-center justify-center mb-4 text-[#A6A6A6]">
                      <CartIcon color="#A6A6A6" size={36} />
                    </div>
                    <span className="font-roboto font-semibold text-[18px] text-[#3C2F2F]">Your Cart is Empty</span>
                    <p className="font-roboto font-normal text-[14px] text-[#A6A6A6] mt-2 max-w-[240px]">
                      Add some delicious items from our menu or trigger a mock re-order to load items.
                    </p>
                    <button 
                      onClick={() => setCurrentView('home')}
                      className="mt-6 px-6 py-3 bg-[#FFE100] rounded-full font-roboto font-bold text-[14px] text-[#3C2F2F] shadow-[0_5px_15px_rgba(255,225,0,0.3)] cursor-pointer hover:brightness-95 active:scale-95 transition-all focus:outline-none"
                    >
                      Go Shop
                    </button>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.cartId} className="w-[392px] h-[118px] bg-white rounded-[24px] shadow-[0_4px_18px_rgba(0,0,0,0.06)] border border-gray-50 p-3 flex gap-3 relative select-none">
                      {/* Image container */}
                      <div className="w-[88px] h-[88px] bg-[#F9FAFB] rounded-[18px] overflow-hidden flex items-center justify-center shrink-0 border border-gray-100/30">
                        <img 
                          src={item.foodItem.id === 'food_1' ? '/assets/hamburger_details.png' : item.foodItem.image} 
                          alt={item.foodItem.name} 
                          className="w-[78px] h-[48px] object-contain"
                        />
                      </div>
                      
                      {/* Item Details */}
                      <div className="flex-1 min-w-0 pr-6 text-left flex flex-col justify-center">
                        <span className="font-roboto font-semibold text-[15px] text-[#3C2F2F] block truncate">
                          {item.foodItem.name}
                        </span>
                        <span className="font-roboto font-normal text-[12px] text-[#A6A6A6] block truncate mt-0.5 capitalize">
                          Size: {item.size} • Spicy: {item.spicy}%
                        </span>
                        {(item.toppings.length > 0 || item.addons.length > 0 || item.drinks.length > 0) && (
                          <span className="font-roboto font-normal text-[11px] text-[#A6A6A6] block truncate mt-0.5">
                            { [
                                ...item.toppings.map(id => toppingOptions.find(o => o.id === id)?.name),
                                ...item.addons.map(id => addonOptions.find(o => o.id === id)?.name),
                                ...item.drinks.map(id => drinkOptions.find(o => o.id === id)?.name)
                              ].filter(Boolean).join(', ') }
                          </span>
                        )}
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="font-roboto font-bold text-[15px] text-[#3C2F2F]">
                            ${(item.pricePerUnit * item.quantity).toFixed(2)}
                          </span>
                          <span className="font-roboto font-normal text-[11px] text-[#A6A6A6]">
                            (${item.pricePerUnit.toFixed(2)} each)
                          </span>
                        </div>
                      </div>

                      {/* Delete button (red trash icon) */}
                      <button 
                        onClick={() => removeFromCart(item.cartId)}
                        className="absolute right-[12px] top-[12px] w-[20px] h-[20px] flex items-center justify-center text-[#EF2A39] hover:text-[#EF2A39]/80 active:scale-90 transition-transform cursor-pointer focus:outline-none"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>

                      {/* Quantity buttons */}
                      <div className="absolute right-[12px] bottom-[12px] flex items-center gap-[8px]">
                        <button 
                          onClick={() => updateQuantity(item.cartId, -1)}
                          className="w-[24px] h-[24px] bg-[#EF2A39] text-white rounded-[8px] flex items-center justify-center font-bold text-[14px] cursor-pointer active:scale-90 transition-transform focus:outline-none"
                        >
                          -
                        </button>
                        <span className="w-[14px] font-roboto font-semibold text-[13px] text-[#3C2F2F] text-center">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => updateQuantity(item.cartId, 1)}
                          className="w-[24px] h-[24px] bg-[#EF2A39] text-white rounded-[8px] flex items-center justify-center font-bold text-[14px] cursor-pointer active:scale-90 transition-transform focus:outline-none"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Delivery and Summary Card Container */}
              <div className="absolute top-[580px] bottom-[120px] left-0 right-0 px-[19px] flex flex-col justify-end select-none">
                {/* Delivery location card */}
                {isEditingAddress ? (
                  <div className="bg-gray-50 rounded-[20px] p-3.5 mb-4 border border-gray-100/50 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="flex-1 bg-white border border-gray-200 rounded-[10px] px-2.5 py-1.5 font-roboto text-[12.5px] text-[#3C2F2F] outline-none focus:border-[#EF2A39]"
                        autoFocus
                      />
                      <button
                        type="button"
                        disabled={isFetchingLocation}
                        onClick={() => {
                          setIsFetchingLocation(true);
                          fetchGPSAddress(
                            (addr, name) => {
                              setDeliveryAddress(`${name}: ${addr}`);
                              setIsFetchingLocation(false);
                            },
                            (err) => {
                              alert(err);
                              setIsFetchingLocation(false);
                            }
                          );
                        }}
                        className="px-2.5 py-1.5 bg-[#EF2A39]/10 text-[#EF2A39] rounded-[10px] font-roboto font-bold text-[11px] hover:brightness-95 active:scale-95 transition-all focus:outline-none flex items-center gap-1 shrink-0"
                      >
                        📍 {isFetchingLocation ? '...' : 'GPS'}
                      </button>
                    </div>

                    {deliveryLocations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {deliveryLocations.map(loc => {
                          const isSel = deliveryAddress === `${loc.name}: ${loc.address}` || deliveryAddress === loc.address;
                          return (
                            <button
                              key={loc.id}
                              type="button"
                              onClick={() => setDeliveryAddress(`${loc.name}: ${loc.address}`)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-roboto font-bold border transition-all cursor-pointer ${
                                isSel 
                                  ? 'border-[#EF2A39] bg-[#EF2A39]/5 text-[#EF2A39]' 
                                  : 'border-gray-200 bg-white text-[#3C2F2F]'
                              }`}
                            >
                              {loc.name}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      className="w-full py-2 bg-[#EF2A39] text-white rounded-[10px] font-roboto font-bold text-[12px] hover:brightness-95 active:scale-95 transition-all focus:outline-none cursor-pointer"
                    >
                      Confirm
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-[20px] mb-4 border border-gray-100/50">
                    <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                      <div className="w-[32px] h-[32px] bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-[0_2px_6px_rgba(0,0,0,0.03)] shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF2A39" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                          <circle cx="12" cy="9" r="2.5" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-roboto font-medium text-[14px] text-[#3C2F2F] block truncate">
                          Deliver to: {deliveryAddress}
                        </span>
                        <span className="font-roboto font-normal text-[12px] text-[#A6A6A6] block mt-0.5">
                          Delivery Time: {cartItems.length > 0 ? cartItems[0].foodItem.deliveryTime : '26 mins'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsEditingAddress(true)}
                      className="ml-2 font-roboto font-semibold text-[13px] text-[#EF2A39] hover:text-[#EF2A39]/80 active:scale-95 transition-all focus:outline-none shrink-0"
                    >
                      Change
                    </button>
                  </div>
                )}

                {/* Price Ledger */}
                <div className="space-y-2.5 pb-2 text-left">
                  <div className="flex justify-between items-center">
                    <span className="font-roboto font-normal text-[14px] text-[#A6A6A6]">Subtotal</span>
                    <span className="font-roboto font-semibold text-[14px] text-[#3C2F2F]">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-roboto font-normal text-[14px] text-[#A6A6A6]">Delivery Fee</span>
                    <span className="font-roboto font-semibold text-[14px] text-[#3C2F2F]">${deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-roboto font-normal text-[14px] text-[#A6A6A6]">Service Fee</span>
                    <span className="font-roboto font-semibold text-[14px] text-[#3C2F2F]">${serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-roboto font-normal text-[14px] text-[#A6A6A6]">Tax (8.875%)</span>
                    <span className="font-roboto font-semibold text-[14px] text-[#3C2F2F]">${taxFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-100 my-2 pt-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-roboto font-bold text-[16px] text-[#3C2F2F]">Total</span>
                    <span className="font-roboto font-bold text-[18px] text-[#EF2A39]">${(subtotal + deliveryFee + serviceFee + taxFee).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Bar Footer */}
              <div className="absolute bottom-[34px] left-[19px] right-[19px] h-[64px] flex gap-[16px] select-none">
                <button 
                  onClick={() => setCurrentView('home')}
                  className="w-[140px] h-[64px] bg-white border border-gray-200 rounded-[24px] shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex items-center justify-center cursor-pointer active:scale-95 transition-transform font-roboto font-bold text-[13px] text-[#3C2F2F] focus:outline-none"
                >
                  KEEP ORDERING
                </button>
                
                <button 
                  onClick={() => {
                    if (cartItems.length > 0) {
                      setCurrentView('checkout');
                    }
                  }}
                  disabled={cartItems.length === 0}
                  className={`flex-1 h-[64px] rounded-[24px] flex items-center justify-center font-roboto font-bold text-[16px] text-[#3C2F2F] focus:outline-none transition-all ${
                    cartItems.length === 0 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-none' 
                      : 'bg-[#FFE100] shadow-[0_10px_25px_rgba(255,225,0,0.35)] cursor-pointer active:scale-95'
                  }`}
                >
                  CHECKOUT
                </button>
              </div>

            </div>
          );
        })()}

        {/* CHECKOUT VIEW */}
        {currentView === 'checkout' && (() => {
          const subtotal = cartItems.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
          const deliveryFee = subtotal > 0 ? 3.00 : 0.00;
          const serviceFee = subtotal > 0 ? 1.50 : 0.00;
          const taxFee = subtotal > 0 ? subtotal * 0.08875 : 0.00;
          const total = subtotal + deliveryFee + serviceFee + taxFee;

          const handlePay = () => {
            processOrderPayment(total);
          };

          return (
            <div className="absolute inset-0 bg-white flex flex-col select-none z-50 animate-fadeIn">
              
              {/* Checkout Header */}
              <div className="h-[76px] shrink-0 flex items-center justify-between px-[19px] relative border-b border-gray-50 bg-white">
                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={() => setCurrentView('cart')} 
                    className="w-[28px] h-[28px] flex items-center justify-center cursor-pointer active:scale-90 transition-transform focus:outline-none"
                  >
                    <img 
                      src="/assets/icon_arrow_left.svg" 
                      alt="Back" 
                      className="w-full h-full object-contain" 
                    />
                  </button>
                  {/* Support Chat Button */}
                  <button 
                    onClick={() => {
                      setPreviousView(currentView);
                      setChatRecipient('support');
                      setCurrentView('chat');
                    }}
                    className="w-[28px] h-[28px] bg-[#2563EB] hover:bg-[#1D4ED8] rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.25)] active:scale-90 transition-transform focus:outline-none cursor-pointer animate-fadeIn"
                    title="Customer Support"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </div>
                
                <h2 className="font-inter font-semibold text-[16px] text-[#3C2F2F]">
                  Payment
                </h2>
                
                <button className="w-[20px] h-[20px] flex items-center justify-center cursor-pointer active:scale-90 transition-transform focus:outline-none">
                  <img 
                    src="/assets/icon_search.svg" 
                    alt="Search" 
                    className="w-full h-full object-contain" 
                  />
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto px-[19px] py-4 space-y-6 scrollbar-hide">
                
                {/* Order Summary Block */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-poppins font-semibold text-[20px] text-[#3C2F2F]">
                      Order summary
                    </h3>
                    <button 
                      onClick={() => setShowLegalModal(true)}
                      className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 text-[#6A6A6A] font-bold text-[12px] flex items-center justify-center cursor-pointer transition-colors focus:outline-none"
                    >
                      ?
                    </button>
                  </div>
                  
                  {/* Basket Items List Review */}
                  <div className="bg-gray-50/50 border border-gray-100/50 rounded-[20px] p-4.5 mb-3 space-y-3.5 text-left">
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Basket Items</div>
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start py-1 border-b border-gray-100/30 last:border-0 last:pb-0 font-roboto text-[13.5px]">
                        <div>
                          <span className="font-bold text-[#3C2F2F]">{item.quantity}x {item.foodItem.name}</span>
                          <span className="text-[#A6A6A6] text-[11px] block mt-0.5">Size: {item.size} • Spicy: {item.spicy}%</span>
                          {((item.toppings || []).length > 0 || (item.addons || []).length > 0 || (item.drinks || []).length > 0) && (
                            <span className="text-[#6A6A6A] text-[10.5px] block mt-0.5 leading-snug">
                              + {[
                                ...item.toppings.map(id => toppingOptions.find(o => o.id === id)?.name),
                                ...item.addons.map(id => addonOptions.find(o => o.id === id)?.name),
                                ...item.drinks.map(id => drinkOptions.find(o => o.id === id)?.name)
                              ].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-[#EF2A39] shrink-0 ml-2">${(item.pricePerUnit * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Ledger */}
                  <div className="bg-gray-50/50 border border-gray-100/50 rounded-[20px] p-4.5 space-y-3.5 text-left">
                    <div className="flex justify-between items-center">
                      <span className="font-roboto font-normal text-[15px] text-[#A6A6A6]">Order</span>
                      <span className="font-roboto font-normal text-[15px] text-[#3C2F2F]">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-roboto font-normal text-[15px] text-[#A6A6A6]">Taxes</span>
                      <span className="font-roboto font-normal text-[15px] text-[#3C2F2F]">${taxFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-roboto font-normal text-[15px] text-[#A6A6A6]">Delivery fees</span>
                      <span className="font-roboto font-normal text-[15px] text-[#3C2F2F]">${deliveryFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-roboto font-normal text-[15px] text-[#A6A6A6]">Service fee</span>
                      <span className="font-roboto font-normal text-[15px] text-[#3C2F2F]">${serviceFee.toFixed(2)}</span>
                    </div>
                    
                    <div className="border-t border-gray-200/60 my-2 pt-2.5" />
                    
                    <div className="flex justify-between items-center">
                      <span className="font-roboto font-bold text-[15px] text-[#3C2F2F]">Total:</span>
                      <span className="font-roboto font-bold text-[15px] text-[#3C2F2F]">${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="font-roboto font-bold text-[12px] text-[#3C2F2F]">Estimated delivery time:</span>
                      <span className="font-roboto font-bold text-[12px] text-[#3C2F2F]">15 - 30mins</span>
                    </div>
                  </div>
                </div>

                {/* Payment Methods Section */}
                <div className="space-y-4">
                  <h3 className="font-poppins font-semibold text-[20px] text-[#3C2F2F] text-left">
                    Payment methods
                  </h3>
                  
                  <div className="space-y-3.5">
                    {paymentCards.map((card) => {
                      const isSelected = selectedCardId === card.id;
                      return (
                        <div 
                          key={card.id}
                          onClick={() => setSelectedCardId(card.id)}
                          className={`w-full h-[80px] rounded-[24px] border p-4 flex items-center justify-between cursor-pointer transition-all select-none ${
                            isSelected 
                              ? 'border-[#FFE100] bg-[#FFE100]/5 shadow-[0_4px_12px_rgba(255,225,0,0.06)]' 
                              : 'border-gray-100 bg-white hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-4 text-left">
                            <div className="w-[70px] h-[42px] bg-white rounded-lg flex items-center justify-center p-1 border border-gray-100 shrink-0">
                              <img src={card.logo} alt={card.name} className="w-full h-full object-contain" />
                            </div>
                            <div>
                              <span className="font-roboto font-medium text-[14px] text-[#3C2F2F] block">{card.name}</span>
                              <span className="font-roboto font-normal text-[14px] text-[#A6A6A6] block mt-0.5">{card.number}</span>
                            </div>
                          </div>
                          
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isSelected ? 'border-[#EF2A39] bg-[#EF2A39]' : 'border-gray-300 bg-white'
                          }`}>
                            {isSelected && (
                              <div className="w-2.5 h-2.5 rounded-full bg-white" />
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Add New Card Button Row */}
                    <button
                      onClick={() => setShowAddCardModal(true)}
                      className="w-full h-[60px] rounded-[24px] border border-dashed border-gray-300 hover:border-gray-400 bg-gray-50/30 flex items-center justify-center gap-2 font-roboto font-semibold text-[14px] text-[#3C2F2F] hover:bg-gray-50 active:scale-98 transition-all focus:outline-none"
                    >
                      <span className="text-[#EF2A39] font-bold text-[18px]">+</span>
                      Add new card
                    </button>
                  </div>
                </div>

                {/* Save Card Checkbox */}
                <div 
                  onClick={() => setSaveCardDetails(!saveCardDetails)}
                  className="flex items-center gap-3 py-2 cursor-pointer select-none"
                >
                  <div className={`w-[18px] h-[18px] rounded-[6px] border flex items-center justify-center transition-all shrink-0 ${
                    saveCardDetails ? 'bg-[#EF2A39] border-[#EF2A39]' : 'border-gray-300 bg-white'
                  }`}>
                    {saveCardDetails && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 3.5L4 6.5L9 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="font-roboto font-normal text-[14px] text-[#3C2F2F] text-left">
                    Save card details for future payments
                  </span>
                </div>

              </div>

              {/* Bottom Action Footer Bar */}
              <div className="h-[96px] shrink-0 border-t border-gray-50 px-[19px] py-4 bg-white flex items-center justify-between select-none">
                <div className="text-left">
                  <span className="font-roboto font-normal text-[13px] text-[#A6A6A6] block">Total price</span>
                  <span className="font-roboto font-bold text-[26px] text-[#3C2F2F] block mt-0.5 leading-none">
                    ${total.toFixed(2)}
                  </span>
                </div>
                
                <button 
                  onClick={handlePay}
                  disabled={cartItems.length === 0}
                  className={`w-[209px] h-[64px] rounded-[24px] flex items-center justify-center font-roboto font-bold text-[16px] text-[#3C2F2F] focus:outline-none transition-all ${
                    cartItems.length === 0 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-none' 
                      : 'bg-[#FFE100] shadow-[0_10px_25px_rgba(255,225,0,0.3)] cursor-pointer active:scale-95'
                  }`}
                >
                  Pay Now
                </button>
              </div>

              {/* Waiting/Processing payment spinner popup */}
              {isProcessingPayment && (
                <>
                  <div className="absolute inset-0 bg-black/60 z-[180] animate-fadeInSimple" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] bg-white rounded-[24px] p-6 z-[190] flex flex-col items-center shadow-[0_15px_40px_rgba(0,0,0,0.25)] animate-fadeIn">
                    <div className="w-[50px] h-[50px] border-4 border-gray-200 border-t-[#EF2A39] rounded-full animate-spin mb-4" />
                    <span className="font-roboto font-bold text-[16px] text-[#3C2F2F]">Processing Payment...</span>
                    <p className="font-roboto font-normal text-[13px] text-[#A6A6A6] mt-2 text-center">
                      Please do not close the app or refresh. We are verifying with your bank.
                    </p>
                  </div>
                </>
              )}



            </div>
          );
        })()}

        {/* ORDER TRACKING PLACEHOLDER VIEW */}
        {/* ORDER TRACKING VIEW */}
        {currentView === 'tracking' && (
          <div className="absolute inset-0 bg-[#F9FAFB] flex flex-col select-none z-50 animate-fadeIn">
            {/* Header */}
            <div className="h-[76px] shrink-0 flex items-center justify-between px-[19px] border-b border-gray-50 bg-white">
              <div className="flex items-center gap-2.5">
                <button 
                  onClick={() => {
                    setOrderedItems([]);
                    setCurrentView('home');
                    setActiveTab('home');
                  }}
                  className="w-[28px] h-[28px] flex items-center justify-center cursor-pointer active:scale-90 transition-transform focus:outline-none"
                >
                  <img 
                    src="/assets/icon_arrow_left.svg" 
                    alt="Back" 
                    className="w-full h-full object-contain" 
                  />
                </button>
                {/* Support Chat Button */}
                <button 
                  onClick={() => {
                    setPreviousView(currentView);
                    setChatRecipient('support');
                    setCurrentView('chat');
                  }}
                  className="w-[28px] h-[28px] bg-[#2563EB] hover:bg-[#1D4ED8] rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.25)] active:scale-90 transition-transform focus:outline-none cursor-pointer animate-fadeIn"
                  title="Customer Support"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              </div>
              
              <h2 className="font-inter font-semibold text-[16px] text-[#3C2F2F]">
                Track Order
              </h2>
              
              <div className="w-[66px]" />
            </div>

            {/* Map Frame Container */}
            <div className="w-full h-[50vh] bg-gray-100 relative overflow-hidden" id="map-container">
              <div ref={mapContainerRef} className="w-full h-full" />
              {!mapboxLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                  <div className="w-[30px] h-[30px] border-4 border-gray-200 border-t-[#EF2A39] rounded-full animate-spin" />
                  <span className="ml-3 font-roboto text-[14px] text-gray-500 font-medium">Loading Mapbox...</span>
                </div>
              )}
            </div>

            {/* Details Drawer (Bottom Card) */}
            <div className="flex-1 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.06)] border-t border-gray-100 flex flex-col p-[19px] overflow-y-auto scrollbar-hide">
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes pulse {
                  0% {
                    transform: scale(0.9);
                    opacity: 0.8;
                    box-shadow: 0 0 0 0 rgba(255, 225, 0, 0.7);
                  }
                  70% {
                    transform: scale(1.15);
                    opacity: 0.1;
                    box-shadow: 0 0 0 12px rgba(255, 225, 0, 0);
                  }
                  100% {
                    transform: scale(0.9);
                    opacity: 0.8;
                    box-shadow: 0 0 0 0 rgba(255, 225, 0, 0);
                  }
                }
                .pulse-ring {
                  animation: pulse 2s infinite;
                }
              `}} />

              {/* Row 1: Order ID & Estimates */}
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <span className="font-roboto font-normal text-[12px] text-[#A6A6A6]">Order ID</span>
                  <span className="font-roboto font-bold text-[16px] text-[#3C2F2F] block mt-0.5">#{activeOrder?.id || ''}</span>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="font-roboto font-bold text-[18px] text-[#3C2F2F]">
                      {trackingStatus === 'arrived' ? 'Delivered' : 
                       trackingStatus === 'ontheway' ? '7 mins' : 
                       trackingStatus === 'preparing' ? '15 mins' : '20 mins'}
                    </span>
                    <span className="font-roboto font-semibold text-[12px] text-[#EF2A39] bg-[#EF2A39]/10 px-2 py-0.5 rounded-full">
                      {trackingStatus === 'arrived' ? 'Completed' : 
                       trackingStatus === 'ontheway' ? 'Late: 12m' : 
                       trackingStatus === 'preparing' ? 'Late: 22m' : 'Late: 25m'}
                    </span>
                  </div>
                  <span className="font-roboto font-normal text-[11px] text-[#A6A6A6] block mt-0.5">Estimated Drop-off</span>
                </div>
              </div>

              {/* Traffic & Weather Info */}
              <div className="flex items-center gap-4 bg-gray-50/70 border border-gray-100/30 rounded-[16px] p-2.5 mt-3.5 text-left shrink-0">
                <div className="flex items-center gap-1.5 font-roboto text-[12px] text-[#6A6A6A]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EF2A39" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v4c0 .6.4 1 1 1h2" />
                    <circle cx="7" cy="17" r="2" />
                    <circle cx="16" cy="17" r="2" />
                  </svg>
                  <span>Traffic: <strong className="text-[#3C2F2F] font-semibold">—</strong></span>
                </div>
                <div className="w-[1px] h-[12px] bg-gray-200" />
                <div className="flex items-center gap-1.5 font-roboto text-[12px] text-[#6A6A6A]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFE100" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  <span>Weather: <strong className="text-[#3C2F2F] font-semibold">—</strong></span>
                </div>
              </div>

              {/* Row 2: Status Stepper */}
              <div className="py-4 border-t border-b border-gray-50 my-4 shrink-0">
                <div className="flex items-center justify-between relative px-2">
                  {/* Progress Line */}
                  <div className="absolute left-[30px] right-[30px] top-[14px] h-[3px] bg-gray-100 z-0">
                    <div 
                      className="h-full bg-[#EF2A39] transition-all duration-500" 
                      style={{ 
                        width: 
                          trackingStatus === 'received' ? '0%' : 
                          trackingStatus === 'preparing' ? '33.33%' : 
                          trackingStatus === 'ontheway' ? '66.66%' : '100%' 
                      }}
                    />
                  </div>
                  
                  {/* Step 1: Received */}
                  <div className="flex flex-col items-center z-10 w-[60px]">
                    <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      trackingStatus === 'received' 
                        ? 'bg-[#FFE100] border-[#FFE100] text-[#3C2F2F] shadow-[0_0_12px_rgba(255,225,0,0.5)] animate-pulse' 
                        : ['preparing', 'ontheway', 'arrived'].includes(trackingStatus)
                          ? 'bg-[#EF2A39] border-[#EF2A39] text-white'
                          : 'bg-white border-gray-200 text-gray-400'
                    }`}>
                      <svg width="12" height="9" viewBox="0 0 12 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[12px] h-[9px]">
                        <path d="M1 4L4.5 7.5L11 1" />
                      </svg>
                    </div>
                    <span className="font-roboto text-[11px] mt-1.5 font-medium text-[#3C2F2F]">Received</span>
                  </div>
                  
                  {/* Step 2: Preparing */}
                  <div className="flex flex-col items-center z-10 w-[60px]">
                    <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      trackingStatus === 'preparing'
                        ? 'bg-[#FFE100] border-[#FFE100] text-[#3C2F2F] shadow-[0_0_12px_rgba(255,225,0,0.5)] animate-pulse'
                        : ['ontheway', 'arrived'].includes(trackingStatus)
                          ? 'bg-[#EF2A39] border-[#EF2A39] text-white'
                          : 'bg-white border-gray-200 text-gray-400'
                    }`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
                        <path d="M6 18V6a4 4 0 0 1 8 0v12" />
                        <path d="M18 18V9a4 4 0 0 0-8 0v9" />
                        <path d="M3 18h18" />
                      </svg>
                    </div>
                    <span className="font-roboto text-[11px] mt-1.5 font-medium text-[#3C2F2F]">Preparing</span>
                  </div>
                  
                  {/* Step 3: On the way */}
                  <div className="flex flex-col items-center z-10 w-[60px]">
                    <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      trackingStatus === 'ontheway'
                        ? 'bg-[#FFE100] border-[#FFE100] text-[#3C2F2F] shadow-[0_0_12px_rgba(255,225,0,0.5)] animate-pulse'
                        : trackingStatus === 'arrived'
                          ? 'bg-[#EF2A39] border-[#EF2A39] text-white'
                          : 'bg-white border-gray-200 text-gray-400'
                    }`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
                        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v4c0 .6.4 1 1 1h2" />
                        <circle cx="7" cy="17" r="2" />
                        <circle cx="16" cy="17" r="2" />
                      </svg>
                    </div>
                    <span className="font-roboto text-[11px] mt-1.5 font-medium text-[#3C2F2F]">On Way</span>
                  </div>
                  
                  {/* Step 4: Arrived */}
                  <div className="flex flex-col items-center z-10 w-[60px]">
                    <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      trackingStatus === 'arrived'
                        ? 'bg-[#4CAF50] border-[#4CAF50] text-white shadow-[0_0_12px_rgba(76,175,80,0.5)]'
                        : 'bg-white border-gray-200 text-gray-400'
                    }`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
                        <polyline points="21 8 21 21 3 21 3 8" />
                        <rect x="1" y="3" width="22" height="5" />
                        <line x1="12" y1="3" x2="12" y2="21" />
                      </svg>
                    </div>
                    <span className="font-roboto text-[11px] mt-1.5 font-medium text-[#3C2F2F]">Arrived</span>
                  </div>
                </div>
              </div>

              {/* Row 3: Expandable Order Summary */}
              {(() => {
                const currentItems = orderedItems.length > 0 ? orderedItems : (activeOrder ? activeOrder.items : []);
                const itemsCount = currentItems.reduce((sum, item) => sum + item.quantity, 0);
                const itemsTotal = currentItems.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
                
                return (
                  <div className="bg-gray-50/50 rounded-[20px] border border-gray-100/50 p-3.5 mb-4 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <span className="font-roboto font-medium text-[14px] text-[#3C2F2F]">Order Details</span>
                        <span className="font-roboto font-normal text-[12px] text-[#A6A6A6] block mt-0.5">
                          {itemsCount} {itemsCount === 1 ? 'item' : 'items'} • ${itemsTotal.toFixed(2)}
                        </span>
                      </div>
                      <button 
                        onClick={() => setShowTrackingDetails(!showTrackingDetails)}
                        className="px-3.5 py-1.5 bg-white border border-gray-100 rounded-[12px] font-roboto font-bold text-[12px] text-[#EF2A39] hover:bg-gray-50 active:scale-95 transition-all shadow-[0_2px_6px_rgba(0,0,0,0.02)] focus:outline-none"
                      >
                        {showTrackingDetails ? 'Hide' : 'Detail'}
                      </button>
                    </div>
                    
                    {/* Inline list of items when expanded */}
                    {showTrackingDetails && (
                      <div className="mt-3.5 pt-3.5 border-t border-gray-100 space-y-3 max-h-[160px] overflow-y-auto scrollbar-hide text-left">
                        {currentItems.length > 0 ? (
                          currentItems.map((item) => (
                            <div key={item.cartId} className="flex justify-between items-start text-[13px]">
                              <div className="min-w-0 flex-1 pr-3">
                                <span className="font-roboto font-semibold text-[#3C2F2F] block">
                                  {item.quantity}x {item.foodItem.name} ({item.size})
                                </span>
                                <span className="font-roboto font-normal text-[11px] text-[#A6A6A6] block mt-0.5 capitalize">
                                  Spicy: {item.spicy}% • {[
                                    ...item.toppings.map(id => toppingOptions.find(o => o.id === id)?.name),
                                    ...item.addons.map(id => addonOptions.find(o => o.id === id)?.name),
                                    ...item.drinks.map(id => drinkOptions.find(o => o.id === id)?.name)
                                  ].filter(Boolean).join(', ')}
                                </span>
                              </div>
                              <span className="font-roboto font-bold text-[#3C2F2F] shrink-0">
                                ${(item.pricePerUnit * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-[13px] text-[#A6A6A6] text-center font-roboto">No active order items found.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Row 4: Driver Profile Card */}
              <div className="flex items-center justify-between p-3.5 bg-[#3C2F2F] rounded-[24px] text-white shrink-0">
                <div className="flex items-center gap-3.5 text-left min-w-0">
                  <div className="w-[50px] h-[50px] rounded-[16px] overflow-hidden bg-white/10 shrink-0 border border-white/10">
                    <img 
                      src={activeOrder?.driverAvatar || "/assets/driver_avatar.png"} 
                      alt={activeOrder?.driverName || 'Driver'} 
                      className="w-full h-full object-cover scale-[1.05]"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="font-roboto font-bold text-[15px] block truncate">{activeOrder?.driverName || 'Kenji Sato'}</span>
                    <span className="font-roboto font-medium text-[12px] text-[#FFE100] block mt-0.5">{activeOrder?.driverRating || '4.9'} ★ • Delivery Driver</span>
                  </div>
                </div>
                
                {/* Call & Chat buttons */}
                <div className="flex gap-2.5 shrink-0">
                  {/* Chat */}
                  <button 
                    onClick={() => {
                      setPreviousView('tracking');
                      setChatRecipient('driver');
                      setCurrentView('chat');
                    }}
                    className="w-[40px] h-[40px] bg-white/15 hover:bg-white/20 active:scale-90 transition-all rounded-[12px] flex items-center justify-center focus:outline-none"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </button>
                  {/* Call */}
                  <button 
                    onClick={() => {
                      alert(`Call Simulator:\nConnecting secure line to Driver ${activeOrder?.driverName || 'Kenji Sato'} (+1 555-019-2831)...`);
                    }}
                    className="w-[40px] h-[40px] bg-white/15 hover:bg-white/20 active:scale-90 transition-all rounded-[12px] flex items-center justify-center focus:outline-none"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* ORDER ARRIVED FEEDBACK MODAL OVERLAY */}
            {showFeedbackModal && (
              <>
                <div 
                  className="absolute inset-0 bg-black/60 z-[150] animate-fadeInSimple"
                  onClick={() => setShowFeedbackModal(false)}
                />
                <div className="absolute bottom-0 left-0 right-0 max-h-[90%] bg-white rounded-t-[32px] z-[160] flex flex-col p-6 animate-slideUp shadow-[0_-10px_40px_rgba(0,0,0,0.2)] select-none">
                  {/* Handle bar */}
                  <div className="w-[40px] h-[5px] bg-gray-200 rounded-full mx-auto mb-5 shrink-0" />
                  
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4 shrink-0">
                    <div className="w-[32px] h-[32px] bg-green-50 text-[#4CAF50] rounded-full flex items-center justify-center font-bold text-[18px]">✓</div>
                    <h3 className="font-poppins font-semibold text-[18px] text-[#3C2F2F]">Order Delivered!</h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto scrollbar-hide space-y-5 pr-1">
                    {/* Proof of Delivery Image */}
                    <div className="relative rounded-2xl overflow-hidden border border-gray-100/50">
                      <img 
                        src="/assets/delivery_proof.png" 
                        alt="Delivery Proof" 
                        className="w-full h-[150px] object-cover"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2.5 text-left text-white text-[12px] font-roboto font-medium flex items-center gap-2">
                        <span>📷</span>
                        <span>Photo proof left by {activeOrder?.driverName || 'Driver'}</span>
                      </div>
                    </div>
                    
                    {/* Restaurant Rating Section */}
                    <div className="text-left space-y-2.5">
                      <div className="flex items-center gap-3.5 text-left">
                        <div className="w-[44px] h-[44px] bg-[#F9FAFB] rounded-full overflow-hidden flex items-center justify-center p-0.5 border border-gray-100 shrink-0">
                          <img src="/assets/hamburger_1.png" alt="Wendy's Logo" className="w-[38px] h-[24px] object-contain" />
                        </div>
                        <div>
                          <h4 className="font-roboto font-bold text-[15px] text-[#3C2F2F]">Wendy's Burger</h4>
                          <span className="font-roboto text-[11px] text-[#A6A6A6] block mt-0.5">Rate the food quality</span>
                        </div>
                      </div>

                      <div className="flex gap-2.5 justify-start py-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRestaurantRating(star)}
                            className="focus:outline-none transition-transform active:scale-90"
                          >
                            <svg width="30" height="30" viewBox="0 0 24 24" fill={star <= restaurantRating ? "#FFE100" : "none"} stroke={star <= restaurantRating ? "#FFE100" : "#D1D5DB"} strokeWidth="2.2">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        ))}
                      </div>

                      <input 
                        type="text" 
                        placeholder="Write feedback about the food..."
                        value={restaurantComment}
                        onChange={(e) => setRestaurantComment(e.target.value)}
                        className="w-full h-[45px] bg-gray-50 border border-gray-100 rounded-[14px] px-3.5 font-roboto text-[13px] text-[#3C2F2F] outline-none focus:border-[#EF2A39] focus:bg-white transition-all placeholder-gray-400"
                      />
                    </div>
                    
                    {/* Driver Rating Section */}
                    <div className="text-left space-y-2.5 pt-2 border-t border-gray-50">
                      <div className="flex items-center gap-3.5 text-left">
                        <div className="w-[44px] h-[44px] bg-gray-100 rounded-full overflow-hidden border border-gray-100 shrink-0">
                          <img src={activeOrder?.driverAvatar || "/assets/driver_avatar.png"} alt={activeOrder?.driverName || 'Driver'} className="w-full h-full object-cover scale-[1.05]" />
                        </div>
                        <div>
                          <h4 className="font-roboto font-bold text-[15px] text-[#3C2F2F]">{activeOrder?.driverName || 'Kenji Sato'} (Driver)</h4>
                          <span className="font-roboto text-[11px] text-[#A6A6A6] block mt-0.5">Rate the delivery service</span>
                        </div>
                      </div>

                      <div className="flex gap-2.5 justify-start py-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setDriverRating(star)}
                            className="focus:outline-none transition-transform active:scale-90"
                          >
                            <svg width="30" height="30" viewBox="0 0 24 24" fill={star <= driverRating ? "#FFE100" : "none"} stroke={star <= driverRating ? "#FFE100" : "#D1D5DB"} strokeWidth="2.2">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        ))}
                      </div>

                      <input 
                        type="text" 
                        placeholder="Write feedback about the delivery service..."
                        value={driverComment}
                        onChange={(e) => setDriverComment(e.target.value)}
                        className="w-full h-[45px] bg-gray-50 border border-gray-100 rounded-[14px] px-3.5 font-roboto text-[13px] text-[#3C2F2F] outline-none focus:border-[#EF2A39] focus:bg-white transition-all placeholder-gray-400"
                      />
                    </div>
                  </div>
                  
                  {/* Submit Button */}
                  <div className="mt-6 shrink-0 flex gap-3.5">
                    <button
                      onClick={() => {
                        setShowFeedbackModal(false);
                        setRestaurantRating(5);
                        setDriverRating(5);
                        setRestaurantComment('');
                        setDriverComment('');
                        setOrderedItems([]);
                        setCurrentView('home');
                        setActiveTab('home');
                      }}
                      className="flex-1 h-[50px] bg-white border border-gray-200 rounded-[16px] font-roboto font-bold text-[14px] text-[#3C2F2F] hover:bg-gray-50 active:scale-95 transition-all focus:outline-none"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => {
                        console.log("Submitting Feedback:", {
                          restaurantRating,
                          restaurantComment,
                          driverRating,
                          driverComment
                        });

                        // Display premium simulator notification
                        setPaymentNotification({
                          type: 'success',
                          message: 'Review published to Wendy\'s landing page and saved in the driver\'s profile!'
                        });
                        setTimeout(() => setPaymentNotification(null), 4000);
                        
                        // Append review dynamically to restaurant page reviews list
                        const newReview = {
                          id: 'rev_' + Date.now(),
                          author: profileName || 'Simona Takahashi',
                          avatar: profilePicture || '/assets/avatar.png',
                          rating: restaurantRating,
                          date: 'Just now',
                          comment: restaurantComment.trim() || `Delicious ${selectedRestaurant.name} food, hot food, and very fast delivery!`
                        };
                        setRestaurantReviews(prev => [newReview, ...prev]);

                        // Reset form & states
                        setRestaurantRating(5);
                        setDriverRating(5);
                        setRestaurantComment('');
                        setDriverComment('');
                        setShowFeedbackModal(false);
                        
                        // Clear active tracking & return home
                        setOrderedItems([]);
                        setCurrentView('home');
                        setActiveTab('home');
                      }}
                      className="flex-[2] h-[50px] bg-[#FFE100] rounded-[16px] font-roboto font-bold text-[14px] text-[#3C2F2F] shadow-[0_5px_15px_rgba(255,225,0,0.25)] hover:brightness-95 active:scale-95 transition-all focus:outline-none"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Floating payment notifications banner toast */}
        {paymentNotification && (
          <div className="absolute top-[28px] left-[19px] right-[19px] z-[220] animate-slideDown">
            <div className={`p-4 rounded-[18px] shadow-[0_6px_20px_rgba(0,0,0,0.15)] flex items-center gap-3 border ${
              paymentNotification.type === 'success' 
                ? 'bg-[#E8F5E9] border-[#A5D6A7] text-[#2E7D32]' 
                : 'bg-[#FFEBEE] border-[#FFCDD2] text-[#C62828]'
            }`}>
              <div className={`w-[24px] h-[24px] rounded-full flex items-center justify-center shrink-0 ${
                paymentNotification.type === 'success' ? 'bg-[#2E7D32] text-white' : 'bg-[#C62828] text-white'
              }`}>
                {paymentNotification.type === 'success' ? (
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 5 4.5 8.5 13 1" />
                  </svg>
                ) : (
                  <span className="font-bold text-[14px]">!</span>
                )}
              </div>
              <span className="font-roboto font-medium text-[13px] text-left leading-[18px]">
                {paymentNotification.message}
              </span>
            </div>
          </div>
        )}

        {/* Order success popup overlay */}
        {showSuccessOrder && (
          <>
            <div className="absolute inset-0 bg-black/50 z-[120] animate-fadeInSimple" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] bg-white rounded-[32px] p-6 z-[130] flex flex-col items-center text-center shadow-[0_15px_40px_rgba(0,0,0,0.2)] animate-fadeIn select-none">
              <div className="w-[80px] h-[80px] bg-green-50 rounded-full flex items-center justify-center mb-4 text-[#4CAF50]">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              
              <h3 className="font-roboto font-bold text-[22px] text-[#3C2F2F]">Order Placed!</h3>
              <p className="font-roboto font-normal text-[14px] text-[#A6A6A6] mt-2 leading-[20px]">
                Your {selectedRestaurant.name} order is being prepared and will arrive at <strong>{deliveryAddress}</strong> in {selectedRestaurant.deliveryTime}!
              </p>
              
              <div className="mt-6 w-full flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setOrderedItems([...cartItems]);
                    setCartItems([]);
                    setShowSuccessOrder(false);
                    setCurrentView('tracking');
                  }}
                  className="w-full h-[55px] bg-[#FFE100] rounded-[18px] font-roboto font-bold text-[16px] text-[#3C2F2F] shadow-[0_5px_15px_rgba(255,225,0,0.3)] cursor-pointer hover:brightness-95 active:scale-95 transition-all focus:outline-none"
                >
                  Track Order
                </button>
                <button 
                  onClick={() => {
                    setCartItems([]);
                    setShowSuccessOrder(false);
                    setCurrentView('home');
                  }}
                  className="w-full h-[55px] bg-white border border-gray-200 rounded-[18px] font-roboto font-bold text-[16px] text-[#3C2F2F] shadow-[0_4px_10px_rgba(0,0,0,0.03)] cursor-pointer hover:brightness-95 active:scale-95 transition-all focus:outline-none"
                >
                  Keep Browsing
                </button>
              </div>
            </div>
          </>
        )}



        {/* ONBOARDING VIEW */}
        {currentView === 'onboarding' && (
          <div className="absolute inset-0 bg-white flex flex-col select-none z-[80] animate-fadeIn text-[#3C2F2F]">
            {/* Header / Logo */}
            <div className="flex flex-col items-center justify-center pt-12 pb-4 shrink-0">
              <img src="/assets/wolf_logo.png" alt="Wolfie Logo" className="w-[100px] h-auto object-contain" />
              <h1 className="font-lustria font-normal text-[32px] text-[#3C2F2F] tracking-wider mt-2">WOLFIE</h1>
              <p className="font-poppins font-medium text-[10px] text-[#EF2A39] tracking-[0.2em] uppercase mt-0.5">Gourmet Delivery</p>
            </div>

            {/* Skip Button */}
            <button 
              onClick={() => setCurrentView('login')}
              className="absolute right-[24px] top-[48px] font-roboto font-bold text-[14px] text-[#A6A6A6] hover:text-[#3C2F2F] active:scale-95 transition-all cursor-pointer focus:outline-none"
            >
              Skip
            </button>

            {/* Carousel Content */}
            <div className="flex-1 flex flex-col justify-center px-8 text-center my-2">
              {onboardingSlide === 0 && (
                <div className="animate-fadeIn flex flex-col items-center">
                  <div className="w-[95%] h-[280px] relative mb-6 flex items-center justify-center overflow-hidden rounded-[28px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100/50">
                    <img src="/assets/onboarding_burger.png" alt="Your Diet, Your Rules" className="max-h-full max-w-full object-contain scale-[1.1]" />
                  </div>
                  <h2 className="font-poppins font-bold text-[22px] text-[#3C2F2F] leading-snug mb-3">
                    Your Diet, Your Rules
                  </h2>
                  <p className="font-roboto font-normal text-[14.5px] text-[#A6A6A6] leading-relaxed">
                    Save your specific preferences (Healthy, Halal, Vegan) and allergy safeguards. Wolfie screens items to ensure a safe, tailored dining experience.
                  </p>
                </div>
              )}
              {onboardingSlide === 1 && (
                <div className="animate-fadeIn flex flex-col items-center">
                  <div className="w-[95%] h-[280px] relative mb-6 flex items-center justify-center overflow-hidden rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100/50">
                    <img src="/assets/onboarding_bklyn.jpg" alt="Discover Restaurant Profiles" className="w-full h-full object-cover" />
                  </div>
                  <h2 className="font-poppins font-bold text-[22px] text-[#3C2F2F] leading-snug mb-3">
                    Discover Restaurant Profiles
                  </h2>
                  <p className="font-roboto font-normal text-[14.5px] text-[#A6A6A6] leading-relaxed">
                    Browse menus, read verified comments, and check out visual storefront stories modeled like your favorite social feeds.
                  </p>
                </div>
              )}
              {onboardingSlide === 2 && (
                <div className="animate-fadeIn flex flex-col items-center">
                  <div className="w-[95%] h-[280px] relative mb-6 flex items-center justify-center overflow-hidden rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100/50">
                    <img src="/assets/onboarding_radar_ny.png" alt="Precision Radar Tracking" className="w-full h-full object-cover" />
                  </div>
                  <h2 className="font-poppins font-bold text-[22px] text-[#3C2F2F] leading-snug mb-3">
                    Precision Radar Tracking
                  </h2>
                  <p className="font-roboto font-normal text-[14.5px] text-[#A6A6A6] leading-relaxed">
                    Watch driver {activeOrder?.driverName || 'Driver'} navigate the Manhattan grid street-by-street on a live Mapbox radar screen, synced with real-time status updates.
                  </p>
                </div>
              )}
            </div>

            {/* Slide Indicators & Navigation Footer */}
            <div className="h-[150px] flex flex-col items-center justify-between pb-12 shrink-0">
              {/* Dots */}
              <div className="flex gap-2">
                {[0, 1, 2].map((idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setOnboardingSlide(idx)}
                    className={`h-[8px] rounded-full transition-all cursor-pointer ${
                      onboardingSlide === idx ? 'w-[24px] bg-[#EF2A39]' : 'w-[8px] bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              {/* Action Button */}
              <button 
                onClick={() => {
                  if (onboardingSlide < 2) {
                    setOnboardingSlide(prev => prev + 1);
                  } else {
                    setCurrentView('login');
                  }
                }}
                className="w-[320px] h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-95 transition-all rounded-[20px] font-roboto font-bold text-[16px] text-[#3C2F2F] shadow-[0_6px_20px_rgba(255,225,0,0.3)] flex items-center justify-center cursor-pointer focus:outline-none"
              >
                {onboardingSlide === 2 ? 'Get Started' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* LOGIN VIEW */}
        {currentView === 'login' && (
          <div className="absolute inset-0 bg-white flex flex-col select-none z-[80] animate-fadeIn text-[#3C2F2F] p-8 overflow-y-auto scrollbar-hide">
            {/* Header */}
            <div className="flex flex-col items-center mt-8 mb-6 shrink-0">
              <img src="/assets/wolf_logo.png" alt="Wolfie Logo" className="w-[80px] h-auto object-contain" />
              <h1 className="font-lustria font-normal text-[28px] text-[#3C2F2F] tracking-wide mt-2">WOLFIE</h1>
              <p className="font-poppins font-medium text-[9px] text-[#EF2A39] tracking-widest uppercase mt-0.5">Gourmet Delivery</p>
            </div>

            <h2 className="font-poppins font-bold text-[24px] text-left mb-6 text-[#3C2F2F] shrink-0">Sign In</h2>

            {/* Form */}
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex flex-col gap-1 text-left">
                <label className="font-roboto font-bold text-[12px] text-[#A6A6A6] uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full h-[54px] bg-[#F9FAFB] border border-gray-100 rounded-[18px] px-4 font-roboto font-medium text-[15px] text-[#3C2F2F] outline-none focus:border-[#EF2A39]/30 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1 text-left">
                <div className="flex justify-between items-center">
                  <label className="font-roboto font-bold text-[12px] text-[#A6A6A6] uppercase tracking-wider">Password</label>
                  <button 
                    onClick={() => setCurrentView('forgot')}
                    className="font-roboto font-bold text-[12px] text-[#EF2A39] hover:underline focus:outline-none"
                  >
                    Forgot?
                  </button>
                </div>
                <input 
                  type="password" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-[54px] bg-[#F9FAFB] border border-gray-100 rounded-[18px] px-4 font-roboto font-medium text-[15px] text-[#3C2F2F] outline-none focus:border-[#EF2A39]/30 transition-all"
                />
              </div>

              <button 
                onClick={() => handleLogin()}
                className="w-full h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-95 transition-all rounded-[20px] font-roboto font-bold text-[16px] text-[#3C2F2F] shadow-[0_6px_20px_rgba(255,225,0,0.25)] flex items-center justify-center cursor-pointer focus:outline-none mt-4"
              >
                Sign In
              </button>

              <button 
                onClick={() => {
                  handleLogin(undefined, 'customer_demo@wolfie.delivery', 'password123');
                }}
                className="w-full h-[50px] bg-white border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all rounded-[20px] font-roboto font-bold text-[14px] text-[#3C2F2F] flex items-center justify-center cursor-pointer focus:outline-none"
              >
                Bypass (Test Mode)
              </button>
            </div>

            {/* Footer switcher */}
            <div className="mt-8 text-center shrink-0">
              <span className="font-roboto font-medium text-[14px] text-[#A6A6A6]">Don't have an account? </span>
              <button 
                onClick={() => setCurrentView('register')}
                className="font-roboto font-bold text-[14px] text-[#EF2A39] hover:underline focus:outline-none"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        {/* REGISTER VIEW */}
        {currentView === 'register' && (
          <div className="absolute inset-0 bg-white flex flex-col select-none z-[80] animate-fadeIn text-[#3C2F2F] p-8 overflow-y-auto scrollbar-hide">
            {/* Header */}
            <div className="flex flex-col items-center mt-4 mb-3 shrink-0">
              <img src="/assets/wolf_logo.png" alt="Wolfie Logo" className="w-[60px] h-auto object-contain" />
              <h1 className="font-lustria font-normal text-[24px] text-[#3C2F2F] tracking-wide mt-1">WOLFIE</h1>
              <p className="font-poppins font-medium text-[8px] text-[#EF2A39] tracking-widest uppercase mt-0.5">Gourmet Delivery</p>
            </div>

            <h2 className="font-poppins font-bold text-[22px] text-left mb-4 text-[#3C2F2F] shrink-0">Create Account</h2>

            {/* Form */}
            <div className="flex flex-col gap-3 flex-1">
              <div className="flex flex-col gap-0.5 text-left">
                <label className="font-roboto font-bold text-[11px] text-[#A6A6A6] uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  value={authFullName}
                  onChange={(e) => setAuthFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full h-[48px] bg-[#F9FAFB] border border-gray-100 rounded-[16px] px-4 font-roboto font-medium text-[14px] text-[#3C2F2F] outline-none focus:border-[#EF2A39]/30 transition-all"
                />
              </div>

              <div className="flex flex-col gap-0.5 text-left">
                <label className="font-roboto font-bold text-[11px] text-[#A6A6A6] uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full h-[48px] bg-[#F9FAFB] border border-gray-100 rounded-[16px] px-4 font-roboto font-medium text-[14px] text-[#3C2F2F] outline-none focus:border-[#EF2A39]/30 transition-all"
                />
              </div>

              <div className="flex flex-col gap-0.5 text-left">
                <label className="font-roboto font-bold text-[11px] text-[#A6A6A6] uppercase tracking-wider">Phone Number</label>
                <input 
                  type="tel" 
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full h-[48px] bg-[#F9FAFB] border border-gray-100 rounded-[16px] px-4 font-roboto font-medium text-[14px] text-[#3C2F2F] outline-none focus:border-[#EF2A39]/30 transition-all"
                />
              </div>

              <div className="flex flex-col gap-0.5 text-left">
                <label className="font-roboto font-bold text-[11px] text-[#A6A6A6] uppercase tracking-wider">Password</label>
                <input 
                  type="password" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-[48px] bg-[#F9FAFB] border border-gray-100 rounded-[16px] px-4 font-roboto font-medium text-[14px] text-[#3C2F2F] outline-none focus:border-[#EF2A39]/30 transition-all"
                />
              </div>

              <div className="flex flex-col gap-0.5 text-left">
                <label className="font-roboto font-bold text-[11px] text-[#A6A6A6] uppercase tracking-wider">Confirm Password</label>
                <input 
                  type="password" 
                  value={authConfirmPassword}
                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-[48px] bg-[#F9FAFB] border border-gray-100 rounded-[16px] px-4 font-roboto font-medium text-[14px] text-[#3C2F2F] outline-none focus:border-[#EF2A39]/30 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 mt-1 select-none shrink-0">
                <input type="checkbox" id="terms" className="accent-[#EF2A39]" defaultChecked />
                <label htmlFor="terms" className="font-roboto text-[12px] text-[#A6A6A6] text-left leading-tight">
                  I agree to the <span className="text-[#EF2A39] font-bold cursor-pointer hover:underline">Terms of Service</span> & <span className="text-[#EF2A39] font-bold cursor-pointer hover:underline">Privacy Policy</span>
                </label>
              </div>

              <button 
                onClick={handleRequestOtp}
                className="w-full h-[54px] bg-[#FFE100] hover:brightness-95 active:scale-95 transition-all rounded-[18px] font-roboto font-bold text-[15px] text-[#3C2F2F] shadow-[0_6px_20px_rgba(255,225,0,0.2)] flex items-center justify-center cursor-pointer focus:outline-none mt-2"
              >
                Sign Up
              </button>
            </div>

            {/* Footer switcher */}
            <div className="mt-6 text-center shrink-0">
              <span className="font-roboto font-medium text-[13px] text-[#A6A6A6]">Already have an account? </span>
              <button 
                onClick={() => setCurrentView('login')}
                className="font-roboto font-bold text-[13px] text-[#EF2A39] hover:underline focus:outline-none"
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* OTP VERIFICATION VIEW */}
        {currentView === 'otp' && (
          <div className="absolute inset-0 bg-white flex flex-col select-none z-[80] animate-fadeIn text-[#3C2F2F] p-8">
            {/* Back Button */}
            <button 
              onClick={() => setCurrentView(otpFlowContext === 'register' ? 'register' : 'forgot')}
              className="absolute left-[19px] top-[28px] w-[36px] h-[36px] bg-[#F9FAFB] rounded-full flex items-center justify-center border border-gray-100 active:scale-90 transition-transform focus:outline-none cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>

            <div className="flex flex-col items-center mt-24">
              <h2 className="font-poppins font-bold text-[24px] text-center mb-2 text-[#3C2F2F]">Verification Code</h2>
              <p className="font-roboto font-normal text-[15px] text-[#A6A6A6] text-center px-4 leading-relaxed mb-8">
                Please enter the 4-digit code sent to your credentials.
              </p>

              {/* 4 Inputs */}
              <div className="flex gap-4 justify-center mb-6">
                {[0, 1, 2, 3].map((idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={otpCode[idx]}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      const newCode = [...otpCode];
                      newCode[idx] = val;
                      setOtpCode(newCode);

                      // Auto focus next
                      if (val && idx < 3) {
                        const nextInput = document.getElementById(`otp-${idx + 1}`);
                        if (nextInput) nextInput.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      // Handle backspace back-focus
                      if (e.key === 'Backspace' && !otpCode[idx] && idx > 0) {
                        const prevInput = document.getElementById(`otp-${idx - 1}`);
                        if (prevInput) {
                          prevInput.focus();
                          const newCode = [...otpCode];
                          newCode[idx - 1] = '';
                          setOtpCode(newCode);
                        }
                      }
                    }}
                    className="w-[60px] h-[60px] bg-[#F9FAFB] border border-gray-150 rounded-[16px] text-center font-roboto font-bold text-[24px] text-[#3C2F2F] outline-none focus:border-[#EF2A39] transition-all"
                  />
                ))}
              </div>

              {/* Timer */}
              <div className="mb-8 font-roboto font-medium text-[14px]">
                {otpTimer > 0 ? (
                  <span className="text-[#A6A6A6]">Resend code in <strong className="text-[#EF2A39]">{otpTimer}s</strong></span>
                ) : (
                  <button 
                    onClick={() => {
                      setOtpTimer(60);
                      setOtpCode(['', '', '', '']);
                      alert('A new 4-digit verification code has been sent.');
                    }}
                    className="text-[#EF2A39] font-bold hover:underline focus:outline-none"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <button 
                onClick={() => {
                  if (otpFlowContext === 'register') {
                    handleVerifyOtpAndRegister();
                  } else {
                    const enteredCode = otpCode.join('');
                    if (enteredCode.length < 4) {
                      alert('Please enter the full 4-digit code.');
                      return;
                    }
                    setCurrentView('reset');
                  }
                }}
                className="w-[320px] h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-95 transition-all rounded-[20px] font-roboto font-bold text-[16px] text-[#3C2F2F] shadow-[0_6px_20px_rgba(255,225,0,0.25)] flex items-center justify-center cursor-pointer focus:outline-none"
              >
                Verify
              </button>
            </div>
          </div>
        )}

        {/* FORGOT PASSWORD VIEW */}
        {currentView === 'forgot' && (
          <div className="absolute inset-0 bg-white flex flex-col select-none z-[80] animate-fadeIn text-[#3C2F2F] p-8">
            {/* Back Button */}
            <button 
              onClick={() => setCurrentView('login')}
              className="absolute left-[19px] top-[28px] w-[36px] h-[36px] bg-[#F9FAFB] rounded-full flex items-center justify-center border border-gray-100 active:scale-90 transition-transform focus:outline-none cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>

            <div className="flex flex-col items-center mt-24">
              <h2 className="font-poppins font-bold text-[24px] text-center mb-2 text-[#3C2F2F]">Forgot Password</h2>
              <p className="font-roboto font-normal text-[15px] text-[#A6A6A6] text-center px-4 leading-relaxed mb-8">
                Enter your email address and we'll send you a code to reset your password.
              </p>

              <div className="w-full flex flex-col gap-1 text-left mb-6">
                <label className="font-roboto font-bold text-[12px] text-[#A6A6A6] uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full h-[54px] bg-[#F9FAFB] border border-gray-100 rounded-[18px] px-4 font-roboto font-medium text-[15px] text-[#3C2F2F] outline-none focus:border-[#EF2A39]/30 transition-all"
                />
              </div>

              <button 
                onClick={() => {
                  if (!authEmail) {
                    alert('Please enter your email address.');
                    return;
                  }
                  setOtpFlowContext('forgot');
                  setOtpTimer(60);
                  setOtpCode(['', '', '', '']);
                  setCurrentView('otp');
                }}
                className="w-full h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-95 transition-all rounded-[20px] font-roboto font-bold text-[16px] text-[#3C2F2F] shadow-[0_6px_20px_rgba(255,225,0,0.25)] flex items-center justify-center cursor-pointer focus:outline-none"
              >
                Send Code
              </button>
            </div>
          </div>
        )}

        {/* RESET PASSWORD VIEW */}
        {currentView === 'reset' && (
          <div className="absolute inset-0 bg-white flex flex-col select-none z-[80] animate-fadeIn text-[#3C2F2F] p-8">
            <div className="flex flex-col items-center mt-24">
              <h2 className="font-poppins font-bold text-[24px] text-center mb-2 text-[#3C2F2F]">Reset Password</h2>
              <p className="font-roboto font-normal text-[15px] text-[#A6A6A6] text-center px-4 leading-relaxed mb-8">
                Create a new strong password for your account.
              </p>

              <div className="w-full flex flex-col gap-4 text-left mb-6">
                <div className="flex flex-col gap-1">
                  <label className="font-roboto font-bold text-[12px] text-[#A6A6A6] uppercase tracking-wider">New Password</label>
                  <input 
                    type="password" 
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-[54px] bg-[#F9FAFB] border border-gray-100 rounded-[18px] px-4 font-roboto font-medium text-[15px] text-[#3C2F2F] outline-none focus:border-[#EF2A39]/30 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-roboto font-bold text-[12px] text-[#A6A6A6] uppercase tracking-wider">Confirm New Password</label>
                  <input 
                    type="password" 
                    value={authConfirmPassword}
                    onChange={(e) => setAuthConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-[54px] bg-[#F9FAFB] border border-gray-100 rounded-[18px] px-4 font-roboto font-medium text-[15px] text-[#3C2F2F] outline-none focus:border-[#EF2A39]/30 transition-all"
                  />
                </div>
              </div>

              <button 
                onClick={() => {
                  if (!authPassword || !authConfirmPassword) {
                    alert('Please enter both password fields.');
                    return;
                  }
                  if (authPassword !== authConfirmPassword) {
                    alert('Passwords do not match.');
                    return;
                  }
                  // Reset password success
                  setCurrentPassword(authPassword);
                  alert('Password successfully reset! Please sign in with your new password.');
                  setCurrentView('login');
                }}
                className="w-full h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-95 transition-all rounded-[20px] font-roboto font-bold text-[16px] text-[#3C2F2F] shadow-[0_6px_20px_rgba(255,225,0,0.25)] flex items-center justify-center cursor-pointer focus:outline-none"
              >
                Reset Password
              </button>
            </div>
          </div>
        )}

        {/* ADDRESS ENTRY VIEW */}
        {currentView === 'address_entry' && (
          <div className="absolute inset-0 bg-white flex flex-col select-none z-[80] animate-fadeIn text-[#3C2F2F] p-8">
            <h2 className="font-poppins font-bold text-[24px] text-left mt-12 mb-2 text-[#3C2F2F]">Delivery Address</h2>
            <p className="font-roboto font-normal text-[15px] text-[#A6A6A6] text-left leading-relaxed mb-6">
              Enter where you want your gourmet burgers and treats delivered.
            </p>

            <div className="flex flex-col gap-4">
              {/* GPS Button */}
              <button 
                onClick={() => {
                  setIsFetchingGPS(true);
                  fetchGPSAddress(
                    (address, name) => {
                      setIsFetchingGPS(false);
                      setAddressSearchInput(address);
                      setShowAddressSuggestions(false);
                    },
                    (errorMsg) => {
                      setIsFetchingGPS(false);
                      alert(`GPS failed: ${errorMsg}\nFalling back to simulated Madison Ave address.`);
                      setAddressSearchInput('550 Madison Ave, New York, NY 10022');
                      setShowAddressSuggestions(false);
                    }
                  );
                }}

                disabled={isFetchingGPS}
                className="w-full h-[58px] bg-[#EF2A39]/10 hover:bg-[#EF2A39]/15 active:scale-[0.98] transition-all rounded-[18px] border border-[#EF2A39]/20 font-roboto font-bold text-[15px] text-[#EF2A39] flex items-center justify-center gap-2 focus:outline-none cursor-pointer"
              >
                {isFetchingGPS ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-[#EF2A39]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Locating...</span>
                  </>
                ) : (
                  <>
                    <span className="text-[18px]">📍</span>
                    <span>Use Current GPS Location</span>
                  </>
                )}
              </button>

              <div className="relative flex flex-col gap-1 text-left">
                <label className="font-roboto font-bold text-[12px] text-[#A6A6A6] uppercase tracking-wider">Search Address</label>
                <input 
                  type="text" 
                  value={addressSearchInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAddressSearchInput(val);
                    setShowAddressSuggestions(val.length > 2);
                  }}
                  placeholder="Street address, city, zip code"
                  className="w-full h-[54px] bg-[#F9FAFB] border border-gray-100 rounded-[18px] px-4 font-roboto font-medium text-[15px] text-[#3C2F2F] outline-none focus:border-[#EF2A39]/30 transition-all"
                />

                {/* Autocomplete suggestions dropdown */}
                {showAddressSuggestions && (
                  <div className="absolute left-0 right-0 top-[80px] bg-white border border-gray-100 rounded-[18px] shadow-[0_10px_25px_rgba(0,0,0,0.08)] z-10 overflow-hidden">
                    {[
                      `${addressSearchInput}, Times Square, NY`,
                      `${addressSearchInput}, Madison Square Garden, NY`,
                      `${addressSearchInput}, Central Park, NY`
                    ].map((sug, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setAddressSearchInput(sug);
                          setShowAddressSuggestions(false);
                        }}
                        className="px-4 py-3 hover:bg-gray-50 font-roboto font-medium text-[13.5px] text-[#3C2F2F] border-b border-gray-50 last:border-b-0 cursor-pointer"
                      >
                        📍 {sug}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="font-roboto font-bold text-[12px] text-[#A6A6A6] uppercase tracking-wider">Save Address As</label>
                <div className="flex gap-2">
                  {['Home', 'Work', 'Gym', 'Other'].map((label) => {
                    const isSelected = addressSaveLabel === label;
                    return (
                      <button
                        key={label}
                        onClick={() => setAddressSaveLabel(label)}
                        className={`flex-1 h-[40px] rounded-[12px] font-roboto font-semibold text-[13px] transition-all cursor-pointer focus:outline-none ${
                          isSelected
                            ? 'bg-[#FFE100] text-[#3C2F2F] shadow-[0_4px_12px_rgba(255,225,0,0.2)]'
                            : 'bg-[#F9FAFB] border border-gray-100 text-[#A6A6A6]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button 
                onClick={async () => {
                  if (!addressSearchInput) {
                    alert('Please choose or enter a delivery address.');
                    return;
                  }
                  // Save location, add to saved list, set deliveryAddress
                  let locationId = `loc_${Date.now()}`;
                  if (getAuthToken()) {
                    const res = await apiRequest('/addresses', {
                      method: 'POST',
                      body: { label: addressSaveLabel, full_address: addressSearchInput },
                    });
                    if (res.success && res.data?.id) {
                      locationId = res.data.id;
                    }
                  }
                  const newLoc = { id: locationId, name: addressSaveLabel, address: addressSearchInput };
                  setDeliveryLocations(prev => [...prev, newLoc]);
                  setDeliveryAddress(`${addressSaveLabel}: ${addressSearchInput}`);
                  
                  // Complete onboarding/registration lifecycle!
                  setWelcomeAnimation('aboard');
                  setTimeout(() => {
                    setWelcomeAnimation(null);
                    setCurrentView('home');
                  }, 2500);
                }}
                className="w-full h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-95 transition-all rounded-[20px] font-roboto font-bold text-[16px] text-[#3C2F2F] shadow-[0_6px_20px_rgba(255,225,0,0.25)] flex items-center justify-center cursor-pointer focus:outline-none mt-4"
              >
                Confirm Address & Continue
              </button>
            </div>
          </div>
        )}

        {/* WELCOME TRANSITION ANIMATION OVERLAY */}
        {welcomeAnimation && (
          <div className="absolute inset-0 bg-[#F9FAFB] flex flex-col items-center justify-center select-none z-[150] animate-fadeIn text-[#3C2F2F] p-8">
            <div className="flex flex-col items-center text-center">
              {/* Logo with pulsating animation */}
              <div className="w-[140px] h-[140px] relative flex items-center justify-center animate-pulse mb-6">
                <img src="/assets/wolf_logo.png" alt="Wolfie Logo" className="max-h-full max-w-full object-contain" />
              </div>
              
              <h2 className="font-lustria font-normal text-[32px] text-[#3C2F2F] mt-2 mb-1 uppercase tracking-wide">
                WOLFIE
              </h2>
              
              <h3 className="font-poppins font-bold text-[24px] text-[#EF2A39] mb-4">
                {welcomeAnimation === 'aboard' ? 'Welcome Aboard! 🚀' : 'Welcome Back! 👋'}
              </h3>
              
              <p className="font-roboto font-medium text-[15px] text-[#3C2F2F] leading-relaxed max-w-[280px]">
                {welcomeAnimation === 'aboard' 
                  ? `Thrilled to have you, ${profileName}! Setting up your custom NYC food radar...`
                  : `Great to see you again, ${profileName}! Loading your favorite Manhattan kitchens...`
                }
              </p>

              {/* Circular Loading Spinner */}
              <div className="mt-8 flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-[#EF2A39]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
      {renderGlobalModals()}
    </div>
  );
}
