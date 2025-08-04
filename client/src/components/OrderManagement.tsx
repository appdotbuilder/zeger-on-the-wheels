
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ShoppingBag, 
  DollarSign, 
  User, 
  Phone, 
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Play,
  X
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Order, UpdateOrderStatusInput, Store, OrderStatus } from '../../../server/src/schema';

interface OrderManagementProps {
  orders: Order[];
  stores: Store[];
  onOrderUpdate: () => void;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export function OrderManagement({ orders, stores, onOrderUpdate }: OrderManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');

  // Filter orders based on search, status, and store
  const filteredOrders = orders.filter((order: Order) => {
    const matchesSearch = 
      order.id.toString().includes(searchTerm) ||
      (order.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer_phone || '').includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesStore = storeFilter === 'all' || order.store_id.toString() === storeFilter;
    
    return matchesSearch && matchesStatus && matchesStore;
  });

  // Sort orders by created date (newest first)
  const sortedOrders = filteredOrders.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleStatusUpdate = async (orderId: number, newStatus: OrderStatus) => {
    setIsLoading(true);
    setError(null);

    try {
      const updateData: UpdateOrderStatusInput = {
        id: orderId,
        status: newStatus
      };
      await trpc.updateOrderStatus.mutate(updateData);
      onOrderUpdate();
    } catch (error) {
      console.error('Failed to update order status:', error);
      setError('Failed to update order status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStoreName = (storeId: number) => {
    const store = stores.find(s => s.id === storeId);
    return store ? store.name : 'Unknown Store';
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const parseOrderItems = (itemsString: string): OrderItem[] => {
    try {
      return JSON.parse(itemsString) as OrderItem[];
    } catch {
      return [];
    }
  };

  // Calculate order statistics
  const stats = {
    total: orders.length,
    new: orders.filter(o => o.status === 'new').length,
    inProgress: orders.filter(o => o.status === 'in_progress').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    todayRevenue: orders
      .filter(o => o.status === 'completed' && 
        new Date(o.created_at).toDateString() === new Date().toDateString())
      .reduce((sum, o) => sum + o.total_amount, 0)
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center">
            <ShoppingBag className="mr-3 h-8 w-8 text-orange-600" />
            Order Management
          </h2>
          <p className="text-gray-600 mt-1">
            Track and manage all your orders 📦
          </p>
        </div>
      </div>

      {/* Order Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Orders</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.new}</p>
              <p className="text-sm text-gray-600">New</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              <p className="text-sm text-gray-600">Cancelled</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">${stats.todayRevenue.toFixed(2)}</p>
              <p className="text-sm text-gray-600">Today's Revenue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search orders by ID, customer name, or phone..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Stores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            {stores.map((store: Store) => (
              <SelectItem key={store.id} value={store.id.toString()}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {sortedOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {orders.length === 0 ? 'No orders yet' : 'No orders match your search'}
            </h3>
            <p className="text-gray-600 text-center">
              {orders.length === 0 
                ? 'Orders will appear here when customers start placing them! 🚀'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedOrders.map((order: Order) => {
            const orderItems = parseOrderItems(order.order_items);
            
            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <ShoppingBag className="mr-2 h-5 w-5 text-orange-600" />
                        Order #{order.id}
                        {getStatusIcon(order.status)}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {getStoreName(order.store_id)} • {order.created_at.toLocaleString()}
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="secondary"
                        className={
                          order.status === 'new' ? 'bg-orange-100 text-orange-800' :
                          order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }
                      >
                        {order.status.replace('_', ' ')}
                      </Badge>
                      
                      <Select
                        value={order.status}
                        onValueChange={(value: OrderStatus) => handleStatusUpdate(order.id, value)}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Customer Information */}
                  {(order.customer_name || order.customer_phone) && (
                    <div className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                      <User className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        {order.customer_name && (
                          <p className="font-medium text-gray-900">{order.customer_name}</p>
                        )}
                        {order.customer_phone && (
                          <div className="flex items-center mt-1">
                            <Phone className="h-3 w-3 text-gray-400 mr-1" />
                            <p className="text-sm text-gray-600">{order.customer_phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  {orderItems.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Order Items:</h4>
                      <div className="space-y-1">
                        {orderItems.map((item: OrderItem, index: number) => (
                          <div key={index} className="flex justify-between items-center py-1">
                            <span className="text-sm text-gray-700">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="text-sm font-medium">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Order Total and Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="text-lg font-bold text-green-600">
                        ${order.total_amount.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {order.created_at.toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {order.status === 'new' && (
                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, 'in_progress')}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Start Order
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                        disabled={isLoading}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Cancel
                      </Button>
                    </div>
                  )}

                  {order.status === 'in_progress' && (
                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, 'completed')}
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Mark Complete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
