import React, { createContext, useContext, useState, useEffect } from 'react';

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isAvailable: boolean;
  prepTime: number;
}

interface MenuContextType {
  menuItems: MenuItem[];
  addMenuItem: (item: Omit<MenuItem, 'id'>) => string;
  updateMenuItem: (itemId: string, updates: Partial<MenuItem>) => void;
  deleteMenuItem: (itemId: string) => void;
  toggleAvailability: (itemId: string) => void;
  getMenuByRestaurant: (restaurantId: string) => MenuItem[];
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    // Load initial menu items from localStorage or set defaults
    const savedMenuItems = localStorage.getItem('smartbite_menu_items');
    if (savedMenuItems) {
      setMenuItems(JSON.parse(savedMenuItems));
    } else {
      // Initialize with mock data
      const initialMenuItems: MenuItem[] = [
        // Chez Mama Africa
        {
          id: '1',
          restaurantId: '1',
          name: 'Ndolé with Plantains',
          description: 'Traditional Cameroonian stew with groundnuts and bitter leaves',
          price: 2500,
          image: 'https://images.pexels.com/photos/725997/pexels-photo-725997.jpeg',
          category: 'Main Course',
          isAvailable: true,
          prepTime: 25
        },
        {
          id: '2',
          restaurantId: '1',
          name: 'Eru with Fufu',
          description: 'Delicious eru soup with pounded cassava',
          price: 2200,
          image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
          category: 'Main Course',
          isAvailable: true,
          prepTime: 20
        },
        {
          id: '3',
          restaurantId: '1',
          name: 'Grilled Tilapia',
          description: 'Fresh tilapia grilled with local spices',
          price: 3000,
          image: 'https://images.pexels.com/photos/725991/pexels-photo-725991.jpeg',
          category: 'Seafood',
          isAvailable: true,
          prepTime: 30
        },
        
        // Le Bistro Moderne
        {
          id: '4',
          restaurantId: '2',
          name: 'Coq au Vin Africain',
          description: 'French chicken braised with palm wine and local herbs',
          price: 4500,
          image: 'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg',
          category: 'Main Course',
          isAvailable: true,
          prepTime: 35
        },
        {
          id: '5',
          restaurantId: '2',
          name: 'Ratatouille Tropicale',
          description: 'French ratatouille with tropical vegetables',
          price: 3200,
          image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
          category: 'Vegetarian',
          isAvailable: true,
          prepTime: 25
        },
        {
          id: '6',
          restaurantId: '2',
          name: 'Crème Brûlée Coco',
          description: 'Classic French dessert with coconut flavor',
          price: 1800,
          image: 'https://images.pexels.com/photos/725997/pexels-photo-725997.jpeg',
          category: 'Dessert',
          isAvailable: true,
          prepTime: 15
        },
        
        // Spicy Wings Corner
        {
          id: '7',
          restaurantId: '3',
          name: 'Peri-Peri Wings',
          description: 'Spicy chicken wings with our special peri-peri sauce',
          price: 1800,
          image: 'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg',
          category: 'Wings',
          isAvailable: true,
          prepTime: 20
        },
        {
          id: '8',
          restaurantId: '3',
          name: 'Grilled Chicken Half',
          description: 'Half chicken marinated and grilled to perfection',
          price: 2500,
          image: 'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg',
          category: 'Chicken',
          isAvailable: true,
          prepTime: 25
        },
        
        // Fresh Salad Bar
        {
          id: '9',
          restaurantId: '4',
          name: 'Tropical Quinoa Bowl',
          description: 'Quinoa with mango, avocado, and mixed greens',
          price: 2800,
          image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
          category: 'Healthy',
          isAvailable: true,
          prepTime: 15
        },
        {
          id: '10',
          restaurantId: '4',
          name: 'Green Goddess Smoothie',
          description: 'Spinach, banana, mango, and coconut water blend',
          price: 1500,
          image: 'https://images.pexels.com/photos/616833/pexels-photo-616833.jpeg',
          category: 'Beverages',
          isAvailable: true,
          prepTime: 5
        }
      ];
      setMenuItems(initialMenuItems);
      localStorage.setItem('smartbite_menu_items', JSON.stringify(initialMenuItems));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('smartbite_menu_items', JSON.stringify(menuItems));
  }, [menuItems]);

  const addMenuItem = (itemData: Omit<MenuItem, 'id'>): string => {
    const itemId = Date.now().toString();
    const newItem: MenuItem = {
      ...itemData,
      id: itemId,
      image: itemData.image || 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg'
    };

    setMenuItems(prev => [...prev, newItem]);
    return itemId;
  };

  const updateMenuItem = (itemId: string, updates: Partial<MenuItem>) => {
    setMenuItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    );
  };

  const deleteMenuItem = (itemId: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== itemId));
  };

  const toggleAvailability = (itemId: string) => {
    setMenuItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, isAvailable: !item.isAvailable } : item
      )
    );
  };

  const getMenuByRestaurant = (restaurantId: string) => {
    return menuItems.filter(item => item.restaurantId === restaurantId);
  };

  return (
    <MenuContext.Provider value={{
      menuItems,
      addMenuItem,
      updateMenuItem,
      deleteMenuItem,
      toggleAvailability,
      getMenuByRestaurant
    }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}