import { apiClient } from '@/lib/axios';
import { sanitizeImageUrl } from '@/utils/image';

export interface Restaurant {
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

export interface FoodItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  category: string;
  description: string;
  rating: number;
  deliveryTime: string;
}

export const restaurantService = {
  getRestaurants: async (): Promise<Restaurant[]> => {
    const res = await apiClient.get('/restaurants/');
    if (res.data && res.data.restaurants) {
      return res.data.restaurants.map((r: any) => ({
        id: r.id,
        name: r.restaurant_name,
        logo: sanitizeImageUrl(r.logo_image, '/assets/restaurant_logo_wendys.png'),
        cover: sanitizeImageUrl(r.hero_image, '/assets/restaurant_cover_wendys.png'),
        rating: 4.8,
        reviewsCount: '1.2K',
        deliveryTime: `${r.delivery_time_min || 25} mins`,
        deliveryFee: r.delivery_fee || 0.99,
        minOrder: 10.00,
        tags: r.category ? [r.category] : ['Fast Food'],
        distance: 0.4,
        isBestSeller: true,
        description: r.bio || r.story || '',
        address: r.address || '123 Main St, New York, NY'
      }));
    }
    return [];
  },

  getMenu: async (restaurantId: string): Promise<FoodItem[]> => {
    const res = await apiClient.get(`/restaurants/${restaurantId}/menu`);
    if (res.data && res.data.menu) {
      return res.data.menu.map((d: any) => ({
        id: d.id,
        name: d.name,
        brand: d.restaurant_name || '',
        price: Number(d.price) || 8.00,
        image: sanitizeImageUrl(d.image_url, '/assets/hamburger_1.png'),
        category: d.category || 'Burgers',
        description: d.description || '',
        rating: 4.8,
        deliveryTime: '20 mins'
      }));
    }
    return [];
  }
};
