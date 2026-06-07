/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isPopular?: boolean;
  isVegetarian?: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  ratingCount: number;
  deliveryTimeMin: number;
  deliveryFee: number;
  priceLevel: '$' | '$$' | '$$$' | '$$$$';
  status?: string;
  story: string;
  bio: string;
  chefName: string;
  chefBio: string;
  chefImage: string;
  heroImage: string;
  logoImage: string;
  address: string;
  coordinates: { lat: number; lng: number };
  menu: MenuItem[];
}

export interface MenuItemCustomization {
  size: { name: string; price: number };
  side: { name: string; price: number };
  addons: { name: string; price: number }[];
}

export interface CartItem {
  cartItemId?: string; // unique ID for customized line item
  menuItem: MenuItem;
  quantity: number;
  restaurantId: string;
  customization?: MenuItemCustomization;
}

export interface Address {
  id: string;
  label: string; // e.g. "Home", "Work", "Gym"
  street: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'gpay' | 'applepay';
  label: string;
  cardType?: 'visa' | 'mastercard' | 'amex';
  lastFour?: string;
  expiry?: string;
  isDefault: boolean;
}

export type OrderStatus = 'placed' | 'preparing' | 'cooking' | 'riding' | 'arriving' | 'delivered';

export interface Order {
  id: string;
  restaurant: Restaurant;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  grandTotal: number;
  address: Address;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
  notes?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'rider';
  text: string;
  timestamp: string;
}
