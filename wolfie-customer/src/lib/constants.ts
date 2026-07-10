export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1Ijoid29sZmllZGVsaXZlcnkiLCJhIjoiY21vcjV2YW41MXlrYTJxcGhocWtqOGRhayJ9.bDuoURrNHs2QoZQcMBQhCQ';

export interface CustomizerOption {
  id: string;
  name: string;
  price: number;
}

export const toppingOptions: CustomizerOption[] = [
  { id: 'top_cheddar', name: 'Cheddar Cheese', price: 0.50 },
  { id: 'top_bacon', name: 'Crispy Bacon', price: 0.80 },
  { id: 'top_onion', name: 'Grilled Onions', price: 0.30 },
  { id: 'top_egg', name: 'Fried Egg', price: 0.75 },
];

export const addonOptions: CustomizerOption[] = [
  { id: 'add_fries', name: 'French Fries', price: 1.50 },
  { id: 'add_rings', name: 'Onion Rings', price: 1.80 },
  { id: 'add_mozzarella', name: 'Mozzarella Sticks', price: 2.20 },
  { id: 'add_nuggets', name: 'Chicken Nuggets', price: 2.50 },
];

export const drinkOptions: CustomizerOption[] = [
  { id: 'drink_coke', name: 'Coca Cola', price: 1.00 },
  { id: 'drink_sprite', name: 'Sprite', price: 1.00 },
  { id: 'drink_orange', name: 'Orange Juice', price: 1.50 },
  { id: 'drink_water', name: 'Mineral Water', price: 0.80 },
];

