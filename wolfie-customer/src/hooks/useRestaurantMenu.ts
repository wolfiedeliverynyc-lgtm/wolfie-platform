import { useQuery } from '@tanstack/react-query';
import { restaurantService, FoodItem } from '@/services/restaurantService';

const getStaticMenu = (restaurantId: string, restaurantName: string): FoodItem[] => [
  { id: `${restaurantId}_1`, name: 'Classic Burger', brand: restaurantName, price: 8.24, image: '/assets/hamburger_1.png', category: 'Burgers', description: 'Our signature beef patty with lettuce, tomato, cheese and special sauce.', rating: 4.8, deliveryTime: '20 mins' },
  { id: `${restaurantId}_2`, name: 'Veggie Deluxe Burger', brand: restaurantName, price: 7.49, image: '/assets/hamburger_2.png', category: 'Burgers', description: 'Delicious plant-based patty with fresh vegetables, cheese, and pickles.', rating: 4.8, deliveryTime: '20 mins' },
  { id: `${restaurantId}_3`, name: 'Spicy Crispy Chicken', brand: restaurantName, price: 8.49, image: '/assets/hamburger_3.png', category: 'Burgers', description: 'Crispy fried chicken breast, spicy seasoning, lettuce and mayo.', rating: 4.8, deliveryTime: '20 mins' },
  { id: `${restaurantId}_4`, name: 'Double Stack Burger', brand: restaurantName, price: 9.99, image: '/assets/hamburger_4.png', category: 'Burgers', description: 'Double beef patties, double cheese, and fresh pickles on a toasted bun.', rating: 4.8, deliveryTime: '20 mins' },
  { id: `${restaurantId}_5`, name: 'Chicken Nuggets (6 pcs)', brand: restaurantName, price: 5.49, image: '/assets/hamburger_details.png', category: 'Chicken', description: 'Tender all-white meat chicken nuggets fried to a perfect golden crisp.', rating: 4.8, deliveryTime: '20 mins' }
];

export function useRestaurantMenu(restaurantId: string, restaurantName: string) {
  const { data: menuItems = [], isLoading, error } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const items = await restaurantService.getMenu(restaurantId);
      return items.length > 0 ? items : getStaticMenu(restaurantId, restaurantName);
    },
    enabled: !!restaurantId,
  });

  return {
    menuItems,
    isLoading,
    error,
  };
}
