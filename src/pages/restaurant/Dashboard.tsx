import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { useRestaurants } from '../../contexts/RestaurantContext';
import { mockMenuItems, cameroonianTowns } from '../../data/mockData';
import { UtensilsCrossed, ShoppingBag, DollarSign, Clock, TrendingUp, Plus, Eye, MapPin, Phone, X } from 'lucide-react';

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const { getOrdersByRestaurant } = useOrders();
  const { getRestaurantByOwner, createRestaurant } = useRestaurants();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    town: '',
    phone: '',
    address: '',
    deliveryTime: '',
    deliveryFee: '',
    minOrder: '',
    categories: [] as string[],
    image: ''
  });

  const restaurant = user ? getRestaurantByOwner(user.id) : undefined;
  const menuItems = restaurant ? mockMenuItems.filter(item => item.restaurantId === restaurant.id) : [];
  const orders = restaurant ? getOrdersByRestaurant(restaurant.id) : [];

  const todayOrders = orders.filter(order => {
    const today = new Date();
    const orderDate = new Date(order.createdAt);
    return orderDate.toDateString() === today.toDateString();
  });

  const totalRevenue = orders
    .filter(order => order.status === 'delivered')
    .reduce((sum, order) => sum + order.total, 0);

  const todayRevenue = todayOrders
    .filter(order => order.status === 'delivered')
    .reduce((sum, order) => sum + order.total, 0);

  const pendingOrders = orders.filter(order => 
    order.status === 'pending' || order.status === 'preparing'
  );

  const availableCategories = ['Traditional', 'African', 'French', 'Fine Dining', 'Chicken', 'Fast Food', 'Healthy', 'Salads', 'Seafood', 'Vegetarian', 'Beverages', 'Desserts'];

  const handleCreateRestaurant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const restaurantData = {
      name: formData.name,
      description: formData.description,
      image: formData.image || 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg',
      town: formData.town,
      deliveryTime: formData.deliveryTime,
      deliveryFee: parseInt(formData.deliveryFee),
      minOrder: parseInt(formData.minOrder),
      categories: formData.categories,
      ownerId: user.id,
      phone: formData.phone,
      address: formData.address
    };

    createRestaurant(restaurantData);
    setShowCreateForm(false);
    setFormData({
      name: '',
      description: '',
      town: '',
      phone: '',
      address: '',
      deliveryTime: '',
      deliveryFee: '',
      minOrder: '',
      categories: [],
      image: ''
    });
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  if (!restaurant) {
    return (
      <Layout title="Restaurant Dashboard">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-orange-100">
          <UtensilsCrossed className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Restaurant Profile</h2>
          <p className="text-gray-600 mb-6">
            Set up your restaurant profile to start receiving orders and managing your menu.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-orange-600 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-700 hover:to-green-700 transition-all duration-200 transform hover:scale-105"
          >
            Create Restaurant Profile
          </button>
        </div>

        {/* Create Restaurant Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Create Restaurant Profile</h3>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleCreateRestaurant} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Restaurant Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="e.g., Chez Mama Africa"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Town/City *
                      </label>
                      <select
                        required
                        value={formData.town}
                        onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="">Select your town</option>
                        {cameroonianTowns.map(town => (
                          <option key={town} value={town}>{town}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                      rows={3}
                      placeholder="Describe your restaurant and cuisine..."
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="+237 6XX XXX XXX"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address *
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="text"
                          required
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="Restaurant address"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Time *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.deliveryTime}
                        onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="e.g., 25-35 min"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Fee (XAF) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.deliveryFee}
                        onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Order (XAF) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.minOrder}
                        onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="2000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categories (Select at least one) *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableCategories.map(category => (
                        <label key={category} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.categories.includes(category)}
                            onChange={() => handleCategoryToggle(category)}
                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="text-sm text-gray-700">{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Restaurant Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="https://example.com/restaurant-image.jpg"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formData.categories.length === 0}
                      className="flex-1 bg-gradient-to-r from-orange-600 to-green-600 text-white py-2 px-4 rounded-lg font-medium hover:from-orange-700 hover:to-green-700 transition-all duration-200 disabled:opacity-50"
                    >
                      Create Restaurant
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </Layout>
    );
  }

  return (
    <Layout title={`${restaurant.name} Dashboard`}>
      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-600 text-white p-3 rounded-xl">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <span className="text-orange-600 text-sm font-medium">Today</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{todayOrders.length}</div>
          <div className="text-gray-600 text-sm">Orders Today</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-600 text-white p-3 rounded-xl">
              <DollarSign className="h-6 w-6" />
            </div>
            <span className="text-green-600 text-sm font-medium">Today</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {todayRevenue.toLocaleString()} XAF
          </div>
          <div className="text-gray-600 text-sm">Revenue Today</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-600 text-white p-3 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
            <span className="text-blue-600 text-sm font-medium">Active</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{pendingOrders.length}</div>
          <div className="text-gray-600 text-sm">Pending Orders</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-600 text-white p-3 rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </div>
            <span className="text-purple-600 text-sm font-medium">Total</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {totalRevenue.toLocaleString()} XAF
          </div>
          <div className="text-gray-600 text-sm">All Time Revenue</div>
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8 border border-orange-100">
        <div className="relative">
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="w-full h-40 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-4 left-6 text-white">
            <h2 className="text-2xl font-bold">{restaurant.name}</h2>
            <p className="text-orange-200">{restaurant.description}</p>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <span className="text-gray-500 text-sm">Location</span>
              <div className="font-medium">{restaurant.town}</div>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Rating</span>
              <div className="font-medium">{restaurant.rating} ⭐ (500+ reviews)</div>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Status</span>
              <div className="font-medium text-green-600">
                {restaurant.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
          <div className="space-y-4">
            <Link
              to="/manage-menu"
              className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200 hover:from-orange-100 hover:to-orange-200 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-orange-600 text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Manage Menu</div>
                  <div className="text-sm text-gray-600">{menuItems.length} items</div>
                </div>
              </div>
              <div className="text-orange-600">→</div>
            </Link>

            <Link
              to="/restaurant-orders"
              className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200 hover:from-green-100 hover:to-green-200 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-green-600 text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">View Orders</div>
                  <div className="text-sm text-gray-600">{pendingOrders.length} pending</div>
                </div>
              </div>
              <div className="text-green-600">→</div>
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Recent Orders</h3>
            <Link
              to="/restaurant-orders"
              className="text-orange-600 hover:text-orange-700 text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">#{order.id}</div>
                    <div className="text-sm text-gray-600">{order.customerName}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-orange-600">
                      {order.total.toLocaleString()} XAF
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                      order.status === 'preparing' ? 'bg-blue-100 text-blue-600' :
                      order.status === 'ready' ? 'bg-green-100 text-green-600' :
                      order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {order.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}