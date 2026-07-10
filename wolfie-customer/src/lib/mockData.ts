import { Restaurant, FoodItem } from '@/services/restaurantService';

export const mockRestaurants: Restaurant[] = [
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
    description: "Wendy's is known for its square hamburger patties, which are made from fresh, never-frozen beef. Try our signature Cheeseburger, Spicy Chicken Nuggets, or double stack burger, delivered hot and fresh directly to your door in NYC.",
    address: '123 Main St, New York, NY'
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
    description: "McDonald's is the classic American fast-food chain. Enjoy the legendary Big Mac, Cheeseburger, golden-crisp Fries, and the world-famous Chicken McNuggets delivered fast to your location.",
    address: '456 Broadway, New York, NY'
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
    description: "Shake Shack started as a hot dog cart in Madison Square Park and is now a global brand. Known for its 100% all-natural Angus beef ShackBurgers, flat-top dogs, crinkle-cut fries, and rich frozen custard shakes.",
    address: 'Madison Square Park, New York, NY'
  }
];

export const mockFoodItems: FoodItem[] = [
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
    deliveryTime: '12 mins',
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
