import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RESTAURANTS } from '../../../lib/data'; // fallback static search for server metadata
import RestaurantClientPage from '../../../features/restaurant/components/RestaurantClientPage';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Fetch restaurant helper for server side metadata
async function getRestaurant(id: string) {
  // Try to load from static list
  const found = RESTAURANTS.find((r) => r.id === id);
  if (found) return found;

  // Since local storage is only client-side, we fallback or read
  return undefined;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { id } = await params;
  const restaurant = await getRestaurant(id);
  
  return {
    title: restaurant ? `${restaurant.name} | Wolfie Delivery` : 'Restaurant Details | Wolfie Delivery',
    description: restaurant?.description || 'Enjoy gourmet dining from premium Lower Manhattan kitchens.',
  };
}

export default async function RestaurantPage({ params }: RouteParams) {
  const { id } = await params;
  
  // To allow pre-rendering dynamic newly registered restaurants, we fetch on the client-side
  // but we can pass down the static details if they are in RESTAURANTS for immediate SSR hydration.
  const staticRestaurant = RESTAURANTS.find((r) => r.id === id);

  return (
    <RestaurantClientPage 
      id={id} 
      initialData={staticRestaurant} 
    />
  );
}
