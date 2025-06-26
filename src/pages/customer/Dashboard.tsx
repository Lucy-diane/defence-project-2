import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useCart } from '../../contexts/CartContext';
import { useRestaurants } from '../../contexts/RestaurantContext';
import { useMenu } from '../../contexts/MenuContext';
import { cameroonianTowns } from '../../data/mockData';
import { Search, Filter, Star, Clock, Truck, Plus, ShoppingCart } from 'lucide-react';

export default function CustomerDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { addItem, items, total } = useCart();
  const { restaurants } = useRestaurants();
  const { getMenuByRestaurant } = useMenu();

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         restaurant.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTown = !selectedTown || restaurant.town === selectedTown;
    const matchesCategory = !selectedCategory || restaurant.categories.includes(selectedCategory);
    
    return matchesSearch && matchesTown && matchesCategory && restaurant.isActive;
  });

  const allCategories = [...new Set(restaurants.flatMap(r => r.categories))];

  const getRestaurantMenuCount = (restaurantId: string) => {
    return getMenuByRestaurant(restaurantId).filter(item => item.isAvailable).length;
  };

  return (
    <Layout title="Browse Restaurants">
      {/* Cart Summary */}
      {items.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-gradient-to-r from-orange-600 to-green-600 text-white p-4 rounded-2xl shadow-2xl animate-bounce">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="h-6 w-6" />
              <div>
                <div className="font-semibold">{items.length} items</div>
                <div className="text-sm">{total.toLocaleString()} XAF</div>
              </div>
              <Link
                to="/my-orders"
                className="bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors"
              >
                View Cart
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-orange-100">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search restaurants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            />
          </div>
          
          <select
            value={selectedTown}
            onChange={(e) => setSelectedTown(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
          >
            <option value="">All Towns</option>
            {cameroonianTowns.map(town => (
              <option key={town} value={town}>{town}</option>
            ))}
          </select>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
          >
            <option value="">All Categories</option>
            {allCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <div className="flex items-center justify-center">
            <Filter className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-gray-600 font-medium">
              {filteredRestaurants.length} restaurants
            </span>
          </div>
        </div>
      </div>

      {/* Featured Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🔥 Popular This Week</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {filteredRestaurants.slice(0, 3).map((restaurant) => (
            <div key={restaurant.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-orange-100">
              <div className="relative">
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 right-4 bg-white bg-opacity-90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">{restaurant.rating}</span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{restaurant.name}</h3>
                <p className="text-gray-600 mb-4 text-sm">{restaurant.description}</p>
                
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center text-gray-500 text-sm">
                    <Clock className="h-4 w-4 mr-1" />
                    {restaurant.deliveryTime}
                  </div>
                  <div className="flex items-center text-gray-500 text-sm">
                    <Truck className="h-4 w-4 mr-1" />
                    {restaurant.deliveryFee} XAF
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {getRestaurantMenuCount(restaurant.id)} dishes • {restaurant.town}
                  </div>
                  <Link
                    to={`/restaurant/${restaurant.id}`}
                    className="bg-gradient-to-r from-orange-600 to-green-600 text-white px-6 py-2 rounded-lg font-medium hover:from-orange-700 hover:to-green-700 transition-all duration-200 transform hover:scale-105"
                  >
                    Order Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Restaurants */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">All Restaurants</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRestaurants.map((restaurant) => (
            <div key={restaurant.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-100">
              <div className="relative">
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute top-3 right-3 bg-white bg-opacity-90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center space-x-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <span className="text-xs font-medium">{restaurant.rating}</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{restaurant.name}</h3>
                <p className="text-gray-600 mb-3 text-sm line-clamp-2">{restaurant.description}</p>
                
                <div className="flex justify-between items-center mb-3 text-xs text-gray-500">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {restaurant.deliveryTime}
                  </div>
                  <div className="flex items-center">
                    <Truck className="h-3 w-3 mr-1" />
                    {restaurant.deliveryFee} XAF
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {restaurant.categories.slice(0, 2).map(category => (
                    <span key={category} className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-full">
                      {category}
                    </span>
                  ))}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {getRestaurantMenuCount(restaurant.id)} dishes • {restaurant.town}
                  </div>
                  <Link
                    to={`/restaurant/${restaurant.id}`}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
                  >
                    View Menu
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredRestaurants.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No restaurants found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or browse all restaurants.</p>
        </div>
      )}
    </Layout>
  );
}