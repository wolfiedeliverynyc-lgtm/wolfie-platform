import { Restaurant } from '../lib/types';
import { RESTAURANTS } from '../lib/data';

// Helper to check if running in browser
const isBrowser = typeof window !== 'undefined';

// Load restaurants from localStorage or use defaults
const getStoredRestaurants = (): Restaurant[] => {
  if (!isBrowser) return RESTAURANTS;
  const stored = localStorage.getItem('wolfie-registered-restaurants');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored restaurants, resetting', e);
    }
  }
  localStorage.setItem('wolfie-registered-restaurants', JSON.stringify(RESTAURANTS));
  return RESTAURANTS;
};

// Save restaurants
const saveRestaurants = (list: Restaurant[]) => {
  if (!isBrowser) return;
  localStorage.setItem('wolfie-registered-restaurants', JSON.stringify(list));
};

// Simulated network latency helper
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const restaurantApi = {
  getRestaurants: async (): Promise<Restaurant[]> => {
    await delay(300); // simulate network lag
    return getStoredRestaurants();
  },

  getRestaurantById: async (id: string): Promise<Restaurant | undefined> => {
    await delay(200);
    const list = getStoredRestaurants();
    return list.find((r) => r.id === id);
  },

  registerRestaurant: async (restaurant: Restaurant): Promise<Restaurant> => {
    await delay(500);
    const list = getStoredRestaurants();
    
    // Add or overwrite
    const filtered = list.filter((r) => r.id !== restaurant.id);
    const updatedList = [...filtered, restaurant];
    
    saveRestaurants(updatedList);
    return restaurant;
  }
};
