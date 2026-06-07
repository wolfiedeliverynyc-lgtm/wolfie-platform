import React from 'react';
import { RESTAURANTS } from '../lib/data';
import ExploreClientPage from '../features/restaurant/components/ExploreClientPage';

export const metadata = {
  title: 'Wolfie Delivery | NYC Gastronomy Platform',
  description: 'The premium neighborhood kitchen catalog delivering artisanal meals with dynamic transit tracking.',
};

export default function HomeExplorePage() {
  return (
    <ExploreClientPage 
      initialRestaurants={RESTAURANTS} 
    />
  );
}
