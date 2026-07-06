import { Order, OrderStatus, DriverStats, DailyEarning, LatLng, OrderItem } from './types';

// City Map grid definitions (800 x 600 area)
export const CITY_BOUNDS = { width: 800, height: 600 };

export const ROADS = {
  horizontal: [
    { y: 60, name: 'Broadway Ave' },
    { y: 160, name: 'Pine Street' },
    { y: 260, name: 'Market Street' },
    { y: 360, name: 'Maple Boulevard' },
    { y: 460, name: 'Garden Parkway' },
    { y: 540, name: 'Ocean Drive' }
  ],
  vertical: [
    { x: 80, name: '1st Avenue' },
    { x: 180, name: '3rd Avenue' },
    { x: 280, name: '5th Avenue' },
    { x: 380, name: '7th Avenue' },
    { x: 480, name: '9th Avenue' },
    { x: 580, name: '11th Avenue' },
    { x: 680, name: 'Park Avenue' },
    { x: 740, name: 'Lakeside Drive' }
  ]
};

// Restaurants list
export interface RestaurantTemplate {
  name: string;
  address: string;
  coords: LatLng;
  cuisine: string;
  logo: string; // Emoji
  menuItems: string[];
}

export const RESTAURANTS: RestaurantTemplate[] = [
  {
    name: 'Burger & Co.',
    address: '180 Broadway Ave',
    coords: { x: 180, y: 60 },
    cuisine: 'Burgers & Fries',
    logo: '🍔',
    menuItems: ['Double Bacon Cheeseburger', 'Truffle Garlic Fries', 'Salted Caramel Milkshake', 'Crispy Chicken Tenders', 'Diet Cola']
  },
  {
    name: 'Pizzeria Bella',
    address: '380 Maple Boulevard',
    coords: { x: 380, y: 360 },
    cuisine: 'Italian Pizza',
    logo: '🍕',
    menuItems: ['Large Pepperoni Pizza', 'Garlic Knots with Marinara', 'Classic Caesar Salad', 'Tiramisu Slice', 'Sparkling Italian Water']
  },
  {
    name: 'Taco Fiesta',
    address: '280 Garden Parkway',
    coords: { x: 280, y: 460 },
    cuisine: 'Mexican Street Food',
    logo: '🌮',
    menuItems: ['Birria Quesataco Trio', 'Chipotle Chicken Bowl', 'Chips & Guacamole Large', 'Horchata Grande', 'Churros with Dulce de Leche']
  },
  {
    name: 'Wok Master',
    address: '580 Pine Street',
    coords: { x: 580, y: 160 },
    cuisine: 'Asian Stir-fry',
    logo: '🥡',
    menuItems: ['Spicy General Tso Chicken', 'Shoyu Pork Belly Ramen', 'Pork Potstickers (6pc)', 'Thai Mango Sticky Rice', 'Iced Matcha Latte']
  },
  {
    name: 'Sushi Zen',
    address: '680 Market Street',
    coords: { x: 680, y: 260 },
    cuisine: 'Japanese Sushi',
    logo: '🍣',
    menuItems: ['Signature Dragon Roll', 'Salmon & Tuna Nigiri Combo', 'Steamed Edamame with Sea Salt', 'Miso Soup', 'Warm Green Tea']
  },
  {
    name: 'Green Oasis Salads',
    address: '480 Broadway Ave',
    coords: { x: 480, y: 60 },
    cuisine: 'Healthy Bowls',
    logo: '🥗',
    menuItems: ['Harvest Warm Bowl', 'Avocado Toast with Poached Egg', 'Superfood Berry Smoothie', 'Vegan Protein Cookie', 'Fresh Cold-Press Ginger Juice']
  }
];

// Customer Names and Addresses templates for random generation
export const CUSTOMER_NAMES = [
  'Michael Scott', 'Samantha Jones', 'David Beckham', 'Elena Rostova', 
  'Marcus Aurelius', 'Lisa Simpson', 'Peter Parker', 'Bruce Wayne',
  'Diana Prince', 'Sarah Connor', 'Tony Stark', 'Wanda Maximoff'
];

export const CLIENT_LOCATIONS: { address: string; coords: LatLng }[] = [
  { address: '120 1st Avenue Apt 4B', coords: { x: 80, y: 160 } },
  { address: '305 3rd Avenue Floor 2', coords: { x: 180, y: 260 } },
  { address: '542 5th Avenue', coords: { x: 280, y: 160 } },
  { address: '915 9th Avenue Apt 12C', coords: { x: 480, y: 260 } },
  { address: '220 Park Avenue House', coords: { x: 680, y: 360 } },
  { address: '78 Lakeside Drive Estates', coords: { x: 740, y: 460 } },
  { address: '105 Maple Boulevard Apt 1A', coords: { x: 80, y: 360 } },
  { address: '425 Garden Parkway', coords: { x: 380, y: 460 } },
  { address: '610 Ocean Drive Flat 10', coords: { x: 580, y: 540 } },
  { address: '712 Lakeside Drive Overlook', coords: { x: 740, y: 60 } },
  { address: '333 Broadway Ave', coords: { x: 280, y: 60 } }
];

// Initial Stats
export const INITIAL_STATS: DriverStats = {
  rating: 4.96,
  acceptanceRate: 94,
  completionRate: 99,
  onTimeRate: 97,
  lifetimeDeliveries: 312
};

// Initial Earnings
export const INITIAL_WEEKLY_EARNINGS: DailyEarning[] = [
  { date: 'Mon', amount: 114.50, deliveries: 12 },
  { date: 'Tue', amount: 142.20, deliveries: 14 },
  { date: 'Wed', amount: 98.00, deliveries: 9 },
  { date: 'Thu', amount: 165.80, deliveries: 17 },
  { date: 'Fri', amount: 210.40, deliveries: 21 },
  { date: 'Sat', amount: 245.10, deliveries: 23 },
  { date: 'Sun', amount: 185.30, deliveries: 18 }
];

export const INITIAL_ORDER_HISTORY: Order[] = [
  {
    id: 'TRIP-9302',
    storeName: 'Burger & Co.',
    storeAddress: '180 Broadway Ave',
    storeCoords: { x: 180, y: 60 },
    customerName: 'Marcus Aurelius',
    customerAddress: '120 1st Avenue Apt 4B',
    customerCoords: { x: 80, y: 160 },
    distance: 2.1,
    estimatedTime: 12,
    basePay: 4.50,
    tipPay: 5.00,
    promoPay: 2.00,
    totalPay: 11.50,
    items: [
      { id: '1', name: 'Double Bacon Cheeseburger', checked: true },
      { id: '2', name: 'Truffle Garlic Fries', checked: true }
    ],
    instructions: 'Ring doorbell and leave on porch table.',
    status: 'DELIVERED',
    offerExpiresAt: 0,
    createdAt: '12:15 PM',
    completedAt: '12:31 PM',
    orderNumber: '839210'
  },
  {
    id: 'TRIP-9301',
    storeName: 'Sushi Zen',
    storeAddress: '680 Market Street',
    storeCoords: { x: 680, y: 260 },
    customerName: 'Tony Stark',
    customerAddress: '220 Park Avenue House',
    customerCoords: { x: 680, y: 360 },
    distance: 1.4,
    estimatedTime: 8,
    basePay: 3.50,
    tipPay: 15.00,
    promoPay: 0,
    totalPay: 18.50,
    items: [
      { id: '1', name: 'Signature Dragon Roll', checked: true },
      { id: '2', name: 'Miso Soup', checked: true }
    ],
    instructions: 'Hand to me. Gate code is #1002.',
    status: 'DELIVERED',
    offerExpiresAt: 0,
    createdAt: '11:22 AM',
    completedAt: '11:35 AM',
    orderNumber: '293810'
  },
  {
    id: 'TRIP-9300',
    storeName: 'Taco Fiesta',
    storeAddress: '280 Garden Parkway',
    storeCoords: { x: 280, y: 460 },
    customerName: 'Lisa Simpson',
    customerAddress: '425 Garden Parkway',
    customerCoords: { x: 380, y: 460 },
    distance: 0.9,
    estimatedTime: 6,
    basePay: 2.75,
    tipPay: 3.00,
    promoPay: 1.00,
    totalPay: 6.75,
    items: [
      { id: '1', name: 'Chipotle Chicken Bowl', checked: true },
      { id: '2', name: 'Horchata Grande', checked: true }
    ],
    instructions: 'Leave at customer service desk.',
    status: 'DELIVERED',
    offerExpiresAt: 0,
    createdAt: '09:40 AM',
    completedAt: '09:51 AM',
    orderNumber: '401928'
  }
];

// Generates a path sticking exactly to our city streets (Manhattan routing)
// returns turn-by-turn routing coordinates
export function calculateRoutingPath(start: LatLng, end: LatLng): LatLng[] {
  const path: LatLng[] = [{ x: start.x, y: start.y }];
  
  // We want to navigate horizontally first, then vertically (or visa-versa)
  // But let's verify if there is a nearby road we should align to
  // Since roads are exactly at specific horizontal (Y) and vertical (X) coordinates:
  // We can find the closest roads.
  const closestH = ROADS.horizontal.reduce((prev, curr) => 
    Math.abs(curr.y - start.y) < Math.abs(prev.y - start.y) ? curr : prev
  );
  const closestVEnd = ROADS.vertical.reduce((prev, curr) => 
    Math.abs(curr.x - end.x) < Math.abs(prev.x - end.x) ? curr : prev
  );

  // Stop 1: Move from current position to closest vertical/horizontal intersection
  // To keep it simple and clean, we'll go:
  // 1. Move to the target X along current Y
  // 2. Move to the target Y along target X
  // If the origin is slightly off-road, we first align to road, but our landmarks are pre-aligned to intersections!
  
  // If we move along X first:
  path.push({ x: end.x, y: start.y });
  // Then along Y:
  path.push({ x: end.x, y: end.y });

  return path;
}

// Generate a random high-quality order offer
export function generateRandomOrder(): Order {
  const restaurant = RESTAURANTS[Math.floor(Math.random() * RESTAURANTS.length)];
  const customerLoc = CLIENT_LOCATIONS[Math.floor(Math.random() * CLIENT_LOCATIONS.length)];
  const customerName = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
  
  // Distance: Euclidean distance roughly mapped to realistic miles
  const dx = Math.abs(restaurant.coords.x - customerLoc.coords.x);
  const dy = Math.abs(restaurant.coords.y - customerLoc.coords.y);
  const distUnits = Math.sqrt(dx * dx + dy * dy);
  const distance = Math.max(0.5, parseFloat((distUnits / 120).toFixed(1))); // 120px = ~1 mile
  const estimatedTime = Math.round(distance * 4.5 + 4); // ~4.5 min per mile + 4 min prep/fudge factor

  // Generate 2-4 random items
  const menuItems = [...restaurant.menuItems];
  const items: OrderItem[] = [];
  const itemCount = Math.floor(Math.random() * 3) + 2; // 2-4 items
  for (let i = 0; i < itemCount; i++) {
    const idx = Math.floor(Math.random() * menuItems.length);
    const item = menuItems.splice(idx, 1)[0];
    items.push({
      id: `${i + 1}`,
      name: item,
      checked: false
    });
  }

  // Payments
  const basePay = parseFloat((2.00 + distance * 0.75).toFixed(2));
  const tipChance = Math.random();
  const tipPay = tipChance > 0.1 ? parseFloat((2.00 + Math.random() * 8.00).toFixed(2)) : 0.00;
  const promoChance = Math.random();
  const promoPay = promoChance > 0.6 ? (Math.random() > 0.5 ? 2.50 : 1.50) : 0.00;
  const totalPay = parseFloat((basePay + tipPay + promoPay).toFixed(2));

  const instructionsList = [
    'Leave at my front door, do NOT ring doorbell (baby sleeping).',
    'Hand to me, code for gate is #4290.',
    'Leave in the parcel delivery box behind the plant pot.',
    'Ring bell, door is on the side of the house.',
    'Please call when outside. Elevator is broken, will meet in lobby.',
    'Please verify order items carefully! Thanks.'
  ];
  const instructions = instructionsList[Math.floor(Math.random() * instructionsList.length)];
  const randomId = Math.floor(Math.random() * 9000) + 1000;
  const orderNumber = String(Math.floor(Math.random() * 900000) + 100000);

  // Offer expires 45 seconds from now
  const offerDuration = 45 * 1000;
  
  // Human readable current time
  const now = new Date();
  const hours = now.getHours();
  const mins = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHrs = hours % 12 || 12;
  const displayMins = mins < 10 ? `0${mins}` : mins;
  const createdAt = `${displayHrs}:${displayMins} ${ampm}`;

  return {
    id: `TRIP-${randomId}`,
    storeName: restaurant.name,
    storeAddress: restaurant.address,
    storeCoords: restaurant.coords,
    customerName,
    customerAddress: customerLoc.address,
    customerCoords: customerLoc.coords,
    distance,
    estimatedTime,
    basePay,
    tipPay,
    promoPay,
    totalPay,
    items,
    instructions,
    status: 'PENDING_OFFER',
    offerExpiresAt: Date.now() + offerDuration,
    createdAt,
    orderNumber
  };
}
