/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Restaurant, Address, PaymentMethod } from './types';

export const INITIAL_ADDRESSES: Address[] = [
  {
    id: 'addr_1',
    label: 'Home 🏠',
    street: '124 West 22nd St, Apt 4B',
    city: 'New York',
    state: 'NY',
    zip: '10011',
    isDefault: true,
  },
  {
    id: 'addr_2',
    label: 'Work 💼',
    street: '550 Madison Avenue, 18th Floor',
    city: 'New York',
    state: 'NY',
    zip: '10022',
    isDefault: false,
  },
  {
    id: 'addr_3',
    label: 'Gym 💪',
    street: '23 East 42nd St',
    city: 'New York',
    state: 'NY',
    zip: '10017',
    isDefault: false,
  }
];

export const INITIAL_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pay_1',
    type: 'card',
    label: 'Personal Debit',
    cardType: 'visa',
    lastFour: '4242',
    expiry: '09/28',
    isDefault: true,
  },
  {
    id: 'pay_2',
    type: 'card',
    label: 'Corporate Expense Card',
    cardType: 'mastercard',
    lastFour: '8812',
    expiry: '12/29',
    isDefault: false,
  },
  {
    id: 'pay_3',
    type: 'gpay',
    label: 'Google Pay',
    isDefault: false,
  }
];

export const RESTAURANTS: Restaurant[] = [
  {
    id: 'rest_1',
    name: 'Neo-Tokyo Ramen & Grill',
    description: 'Elevated artisanal ramen, flame-finished chashu pork, and authentic street snacks.',
    category: 'Japanese / Ramen',
    rating: 4.8,
    ratingCount: 1240,
    deliveryTimeMin: 25,
    deliveryFee: 1.99,
    priceLevel: '$$',
    status: 'open',
    address: '28 Orchard Street, New York, NY 10002',
    coordinates: { lat: 40.7183, lng: -73.9904 },
    heroImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&h=600&q=80',
    logoImage: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=150&h=150&q=80',
    story: 'Founded in the heart of Shibuya and brought to New York, Neo-Tokyo brings our signature 18-hour slow-simmered Tonkotsu broth directly to your table. Every bowl is made on-demand with hand-pulled noodles and flamed-grilled premium chashu cooked using volcanic binchotan coal.',
    bio: 'Pioneering experimental broth science paired with high-quality heirloom flour. Rooted in authentic Edo period techniques with a modern synthwave culinary space.',
    chefName: 'Chef Kenji Takahashi',
    chefBio: 'Kenji spent 15 years perfecting broth chemistry in Yokohama before launching Neo-Tokyo. He believes ramen is not just food; it is a sacred warmth designed to heal and comfort.',
    chefImage: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=300&h=300&q=80',
    menu: [
      {
        id: 'r_m1',
        name: 'Signature Tonkotsu Special',
        description: 'Rich 18-hour pork bone broth, soft-cooked egg, nori, bamboo shoots, flame-seared chashu pork belly, and sweet black garlic mayu.',
        price: 18.50,
        category: 'Ramen Bowls',
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&h=300&q=80',
        isPopular: true
      },
      {
        id: 'r_m2',
        name: 'Black Garlic Spicy Miso',
        description: 'Blended creamy red & white miso, spicy minced pork, wood-ear mushrooms, roasted garlic paste, and fresh scallions.',
        price: 19.00,
        category: 'Ramen Bowls',
        image: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=400&h=300&q=80',
        isPopular: true
      },
      {
        id: 'r_m3',
        name: 'Pork Gyoza (5 pcs)',
        description: 'Pan-fried handmade dumplings stuffed with Berkshire pork, fresh garlic, cabbage, and ginger. Served with a tangy dipping sauce.',
        price: 8.50,
        category: 'Izakaya Bites',
        image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=400&h=300&q=80'
      },
      {
        id: 'r_m4',
        name: 'Truffle-Salt Edamame',
        description: 'Steamed young soybeans tossed in fragrant white truffle oil, sea salt, and toasted sesame seeds.',
        price: 7.00,
        category: 'Izakaya Bites',
        image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=400&h=300&q=80',
        isVegetarian: true
      },
      {
        id: 'r_m5',
        name: 'Premium Hojicha Iced Tea',
        description: 'Slow-brewed roasted organic green tea, unsweetened, with clean stone fruits notes.',
        price: 4.50,
        category: 'Beverages',
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&h=300&q=80',
        isVegetarian: true
      }
    ]
  },
  {
    id: 'rest_2',
    name: 'The Truffle Grove',
    description: 'Michelin-starred Italian culinary art, handmade truffled pasta, and premium natural wines.',
    category: 'Fine Dining / Italian',
    rating: 4.9,
    ratingCount: 840,
    deliveryTimeMin: 35,
    deliveryFee: 4.99,
    priceLevel: '$$$$',
    status: 'open',
    address: '422 West Broadway, New York, NY 10012',
    coordinates: { lat: 40.7246, lng: -74.0018 },
    heroImage: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=1200&h=600&q=80',
    logoImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=150&h=150&q=80',
    story: 'Born from a lifelong obsession with the Umbrian woodlands, The Truffle Grove delivers ultra-luxurious, freshly prepared pasta tossed in fine French butter, custom wild mushrooms, and shaved winter truffles. Each dish is served with artisan warm brioche and finished with cold-pressed olive oils directly imported from our family olive orchards in Tuscany.',
    bio: 'An immersive fine dining sensory experience focusing on earthy, organic woodland ingredients, house-milled organic grains, and absolute culinary perfection.',
    chefName: 'Chef Isabella Bartolini',
    chefBio: 'Isabella trained under three-star chefs in Florence and Rome. She hand-rolls her pastas each morning, stating that perfect dough is a conversation between the wheat, the hands, and room humidity.',
    chefImage: 'https://images.unsplash.com/photo-1581299818989-cdd37117df56?auto=format&fit=crop&w=300&h=300&q=80',
    menu: [
      {
        id: 't_m1',
        name: 'Truffle Tagliolini d\'Oro',
        description: 'House-milled egg pasta, cultured French butter sauce, aged Parmigiano-Reggiano, and 5g of freshly shaved black winter truffles.',
        price: 36.00,
        category: 'House Pastas',
        image: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=400&h=300&q=80',
        isPopular: true
      },
      {
        id: 't_m2',
        name: 'Wild Mushroom Gnocchi',
        description: 'Pillowy potato gnocchi with caramelized porcini and chanterelle mushrooms, finished with sweet sage butter and hazelnut crumble.',
        price: 28.00,
        category: 'House Pastas',
        image: 'https://images.unsplash.com/photo-1621996346565-e3bb64e0be91?auto=format&fit=crop&w=400&h=300&q=80',
        isVegetarian: true,
        isPopular: true
      },
      {
        id: 't_m3',
        name: 'Heirloom Caprese Burrata',
        description: 'Vibrant local organic tomatoes, fresh creamy burrata pugliese, pressed gold-grade balsamic glaze, and fresh hand-torn sweet basil.',
        price: 19.50,
        category: 'Antipasti',
        image: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&w=400&h=300&q=80',
        isVegetarian: true
      },
      {
        id: 't_m4',
        name: 'Tuscan Artisanal Rosemary Focaccia',
        description: 'Warm house-baked sea-salt rosemary focaccia, served with a dish of premium cold-pressed olive oil & balsamic vinegar.',
        price: 8.00,
        category: 'Antipasti',
        image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=400&h=300&q=80',
        isVegetarian: true
      },
      {
        id: 't_m5',
        name: 'Tiramisu Leggero',
        description: 'Layers of espresso-soaked ladyfingers, whipped light sweet mascarpone shell, and high-fat organic dark cacao dust.',
        price: 12.00,
        category: 'Dolci',
        image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=400&h=300&q=80'
      }
    ]
  },
  {
    id: 'rest_3',
    name: 'Green Garden Bistro',
    description: 'Vibrant organic grain bowls, fresh plant-powered wellness plates, and cold-pressed juices.',
    category: 'Healthy / Vegan',
    rating: 4.7,
    ratingCount: 610,
    deliveryTimeMin: 20,
    deliveryFee: 0.99,
    priceLevel: '$$',
    status: 'open',
    address: '159 Prince Street, New York, NY 10012',
    coordinates: { lat: 40.7259, lng: -74.0011 },
    heroImage: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&h=600&q=80',
    logoImage: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=150&h=150&q=80',
    story: 'Simple, raw, and full of life. At Green Garden Bistro, we believe that real nutrition comes directly from clean topsoils, pure clean water, and loving care. We partner with biodynamic upstate farms to bring crisp heirloom greens, ancient grains, and energy-dense superfoods from the dirt straight to your delivery box within 24 hours of harvest.',
    bio: '100% compostable packaging, non-GMO ingredients, and carbon-neutral deliveries designed to uplift both body and planet.',
    chefName: 'Chef Daniel Young',
    chefBio: 'Daniel is an advocate for holistic nutrition and raw gastronomy. After working in plant-focused kitchens in Vancouver and Portland, he is excited to prove that veggie-forward dishes can be incredibly delicious, deep, and satisfying.',
    chefImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&h=300&q=80',
    menu: [
      {
        id: 'g_m1',
        name: 'Harvest Bliss Superfood Bowl',
        description: 'Crispian organic baby kale, warm bio-dynamic brown rice, maple-roasted sweet potato cubes, avocado slices, sprouted edamame, and tahini dressing.',
        price: 15.50,
        category: 'Bowls & Mains',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&h=300&q=80',
        isVegetarian: true,
        isPopular: true
      },
      {
        id: 'g_m2',
        name: 'Spiced Avocado & Citrus Salad',
        description: 'Shaved raw fennel, grapefruit segments, rich avocado wheels, crisp cucumber, watermelon radishes, mint leaves, and lime vinaigrette.',
        price: 14.00,
        category: 'Bowls & Mains',
        image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&h=300&q=80',
        isVegetarian: true
      },
      {
        id: 'g_m3',
        name: 'Sweet Potato Hummus Toast',
        description: 'Thick organic country sourdough bread lightly toasted, slathered in baked sweet potato hummus, topped with spiced pumpkin seeds and micro cilantro.',
        price: 11.50,
        category: 'Bites & Sides',
        image: 'https://images.unsplash.com/photo-1603046891744-1f76eb10aec1?auto=format&fit=crop&w=400&h=300&q=80',
        isVegetarian: true,
        isPopular: true
      },
      {
        id: 'g_m4',
        name: 'Charcoal Superfood Lemonade',
        description: 'Fresh-squeezed alkaline water lemonade infused with premium coconut activated charcoal, raw wildflower honey, and fresh mint.',
        price: 6.50,
        category: 'Elixirs',
        image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&h=300&q=80',
        isVegetarian: true
      },
      {
        id: 'g_m5',
        name: 'Cold-Pressed Green Zing',
        description: 'Vitamins dense blend of fresh organic celery, cucumber, green apple, ginger slice, and squeezed lemon zest.',
        price: 7.99,
        category: 'Elixirs',
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&h=300&q=80',
        isVegetarian: true
      }
    ]
  },
  {
    id: 'rest_4',
    name: 'Dolce Velvet Gelateria',
    description: 'Artisanal Italian gelato, gourmet bubble waffles, and warm organic pastry delicacies.',
    category: 'Dessert / Sweet',
    rating: 4.95,
    ratingCount: 380,
    deliveryTimeMin: 15,
    deliveryFee: 1.50,
    priceLevel: '$',
    status: 'open',
    address: '94 Lafayette St, New York, NY 10013',
    coordinates: { lat: 40.7180, lng: -74.0015 },
    heroImage: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=1200&h=600&q=80',
    logoImage: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=150&h=150&q=80',
    story: 'Satisfying the sweetest cravings with uncompromising luxury. Dolce Velvet specializes in high-density Italian gelato churned daily in micro-batches with organic cream, natural stabilizers, and premium ingredients like Bronte pistachios, organic Madagascar vanilla beans, and high-fat dark Belgian chocolate chips.',
    bio: 'Velvety smooth, ultra-rich, decadent desserts prepared using thermal-insulated packaging containing dry ice cells to ensure zero melting during transit.',
    chefName: 'Chef Pierre L\'Etoile',
    chefBio: 'Pierre learned the secret of velvety pastry shell emulsion in Paris before completing gelato training near Bologna. He believes dessert is the exclamation point of a perfect evening.',
    chefImage: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=300&h=300&q=80',
    menu: [
      {
        id: 'd_m1',
        name: 'Belgian Fudge Bubble Waffle',
        description: 'Warm, bubble-shaped golden sweet waffle, drizzled with deep warm Belgian dark chocolate sauce, topped with powdered sugar and premium crushed toasted hazelnuts.',
        price: 13.50,
        category: 'Luxury Waffles',
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=400&h=300&q=80',
        isPopular: true
      },
      {
        id: 'd_m2',
        name: 'Madagascar Golden Gelato Pint (16oz)',
        description: 'Premium creamy double-churned gelato infused with slow-extracted Madagascar vanilla orchids and local organic honeycomb shards.',
        price: 14.50,
        category: 'Gelato Pints',
        image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=400&h=300&q=80',
        isPopular: true
      },
      {
        id: 'd_m3',
        name: 'Bronte Pistachio Gelato Pint (16oz)',
        description: 'Rich roasted Sicilian pistachio paste emulsified into high-fat organic sweet milk gelato. Authentic, nutty, extremely deep flavor profile.',
        price: 15.50,
        category: 'Gelato Pints',
        image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=400&h=300&q=80'
      },
      {
        id: 'd_m4',
        name: 'Gourmet French Macarons (6 pcs)',
        description: 'An assortment of delicate, airy almond dust cookies filled with chocolate ganache, raspberry compote, orange blossom cream, and custom salted caramel.',
        price: 16.00,
        category: 'Gourmet Pastries',
        image: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?auto=format&fit=crop&w=400&h=300&q=80'
      },
      {
        id: 'd_m5',
        name: 'Salted Caramel Affogato Cup',
        description: 'A scoop of organic fior di latte gelato resting under a warm double shot of single-origin espresso, finished with artisanal sea-salt caramel syrup.',
        price: 8.50,
        category: 'Gourmet Pastries',
        image: 'https://images.unsplash.com/photo-1594911774802-8822a707c9f3?auto=format&fit=crop&w=400&h=300&q=80'
      }
    ]
  },
  {
    id: 'rest_5',
    name: 'Vesuvius Fire & Smashed',
    description: 'Crisp stone-hearth woodfired pizzas and double-patty plancha-smashed angus burgers.',
    category: 'Burgers & Pizza',
    rating: 4.9,
    ratingCount: 1530,
    deliveryTimeMin: 22,
    deliveryFee: 1.99,
    priceLevel: '$$',
    status: 'open',
    address: '112 Lafayette St, New York, NY 10013',
    coordinates: { lat: 40.7198, lng: -74.0001 },
    heroImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&h=600&q=80',
    logoImage: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=150&h=150&q=80',
    story: 'Where Neapolitan oven physics meets NYC plancha grease dynamics. Our pizzas are stone-hearth baked at 800° for exactly 90 seconds. Our burgers are smashed to a perfect laced crust in aged cast-iron skillets under massive continuous weights, locking in moisture alongside direct flame.',
    bio: 'Naturally hydrated poolish sourdough, premium aged cheddar shields, and direct flame metallurgy.',
    chefName: 'Chef Giovanni Russo',
    chefBio: 'Giovanni trained under third-generation pizzaiolos in Naples before perfecting the plancha smash in Lower Manhattan. He believes salt, high temperatures, and timing are the holy trinity.',
    chefImage: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=300&h=300&q=80',
    menu: [
      {
        id: 'p_m1',
        name: 'The Antigravity Gold-Label Smash Burger',
        description: 'Double flame-finished certified angus brisket patties, thick melted vintage cheddar, caramelized onions, sweet house pickles, and Antigravity secret sauce on toasted rich seed brioche.',
        price: 16.50,
        category: 'Gourmet Burgers',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&h=300&q=80',
        isPopular: true
      },
      {
        id: 'p_m2',
        name: 'Artisanal Double Bacon Smashed',
        description: 'Double dry-aged beef blend, applewood crispy bacon strips, sweet roasted shallots, sharp cheddar cheese shield, and chipotle maple hickory sauce.',
        price: 17.50,
        category: 'Gourmet Burgers',
        image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&h=300&q=80',
        isPopular: false
      },
      {
        id: 'p_m3',
        name: 'Hot Honey Serrano Sourdough Pizza',
        description: 'Blistered sourdough base, sweet San Marzano tomato spread, creamed fior di latte, hot serrano pepperoni cups, serrano chillies, and organic spicy hot honey drizzle.',
        price: 18.00,
        category: 'Handcrafted Pizzas',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&h=300&q=80',
        isPopular: true
      },
      {
        id: 'p_m4',
        name: 'White Truffle Crema & Wild Mushroom',
        description: 'Pecorino cream base, caramelised wild woodland oyster & chanterelle mushrooms, premium whole milk mozzarella, fresh thyme, and white truffle splash.',
        price: 19.50,
        category: 'Handcrafted Pizzas',
        image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=400&h=300&q=80',
        isVegetarian: true,
        isPopular: false
      }
    ]
  }
];
