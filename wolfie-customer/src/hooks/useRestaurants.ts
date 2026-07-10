import { useQuery } from '@tanstack/react-query';
import { restaurantService } from '@/services/restaurantService';

export function useRestaurants() {
  const { data: restaurants = [], isLoading, error, refetch } = useQuery({
    queryKey: ['restaurants'],
    queryFn: restaurantService.getRestaurants,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });

  return {
    restaurants,
    isLoading,
    error,
    refetch
  };
}
