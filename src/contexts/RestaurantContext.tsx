import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockRestaurants, type Restaurant } from '../data/mockData';

interface RestaurantContextType {
  restaurants: Restaurant[];
  createRestaurant: (restaurantData: Omit<Restaurant, 'id' | 'rating' | 'isActive'>) => string;
  updateRestaurant: (restaurantId: string, updates: Partial<Restaurant>) => void;
  getRestaurantByOwner: (ownerId: string) => Restaurant | undefined;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    // Load initial restaurants from mockData and localStorage
    const savedRestaurants = localStorage.getItem('smartbite_restaurants');
    if (savedRestaurants) {
      setRestaurants(JSON.parse(savedRestaurants));
    } else {
      // Initialize with mock data
      setRestaurants(mockRestaurants);
      localStorage.setItem('smartbite_restaurants', JSON.stringify(mockRestaurants));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('smartbite_restaurants', JSON.stringify(restaurants));
  }, [restaurants]);

  const createRestaurant = (restaurantData: Omit<Restaurant, 'id' | 'rating' | 'isActive'>): string => {
    const restaurantId = Date.now().toString();
    const newRestaurant: Restaurant = {
      ...restaurantData,
      id: restaurantId,
      rating: 0,
      isActive: true // Auto-approve for demo purposes
    };

    setRestaurants(prev => [...prev, newRestaurant]);
    return restaurantId;
  };

  const updateRestaurant = (restaurantId: string, updates: Partial<Restaurant>) => {
    setRestaurants(prev =>
      prev.map(restaurant =>
        restaurant.id === restaurantId
          ? { ...restaurant, ...updates }
          : restaurant
      )
    );
  };

  const getRestaurantByOwner = (ownerId: string) => {
    return restaurants.find(restaurant => restaurant.ownerId === ownerId);
  };

  return (
    <RestaurantContext.Provider value={{
      restaurants,
      createRestaurant,
      updateRestaurant,
      getRestaurantByOwner
    }}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurants() {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurants must be used within a RestaurantProvider');
  }
  return context;
}