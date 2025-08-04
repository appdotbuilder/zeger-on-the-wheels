
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ShoppingBag, 
  Store as StoreIcon, 
  Package, 
  TrendingUp, 
  Bell, 
  Menu,
  MapPin,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Smartphone
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { StoreManagement } from '@/components/StoreManagement';
import { ProductManagement } from '@/components/ProductManagement';
import { OrderManagement } from '@/components/OrderManagement';
import { StockVerification } from '@/components/StockVerification';
import { LoginForm } from '@/components/LoginForm';
import type { Store, Product, Order, User, StockVerification as StockVerificationType } from '../../server/src/schema';

interface DashboardData {
  stores: Store[];
  products: Product[];
  orders: Order[];
  stockVerifications: StockVerificationType[];
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    stores: [],
    products: [],
    orders: [],
    stockVerifications: []
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState<string[]>([]);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [stores, products, orders, stockVerifications] = await Promise.all([
        trpc.getStores.query(),
        trpc.getProducts.query(),
        trpc.getOrders.query(),
        trpc.getStockVerifications.query()
      ]);

      setDashboardData({
        stores,
        products,
        orders,
        stockVerifications
      });

      // Check for new orders and pending verifications for notifications
      const newOrders = orders.filter(order => order.status === 'new');
      const pendingVerifications = stockVerifications.filter(sv => sv.status === 'pending');
      
      const newNotifications: string[] = [];
      if (newOrders.length > 0) {
        newNotifications.push(`${newOrders.length} new order${newOrders.length > 1 ? 's' : ''} received! 🎉`);
      }
      if (pendingVerifications.length > 0) {
        newNotifications.push(`${pendingVerifications.length} stock verification${pendingVerifications.length > 1 ? 's' : ''} pending review 📋`);
      }
      
      setNotifications(newNotifications);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      // Refresh data every 30 seconds
      const interval = setInterval(loadDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [user, loadDashboardData]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
    setDashboardData({
      stores: [],
      products: [],
      orders: [],
      stockVerifications: []
    });
    setNotifications([]);
  };

  // Calculate dashboard statistics
  const stats = {
    totalSales: dashboardData.orders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + order.total_amount, 0),
    activeStores: dashboardData.stores.filter(store => store.status === 'open').length,
    todaysOrders: dashboardData.orders.filter(order => 
      new Date(order.created_at).toDateString() === new Date().toDateString()
    ).length,
    pendingVerifications: dashboardData.stockVerifications.filter(sv => sv.status === 'pending').length
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Smartphone className="h-12 w-12 text-orange-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Zeger On The Wheels</h1>
            </div>
            <p className="text-gray-600">Your Mobile Selling Business Hub 🚀</p>
          </div>
          <LoginForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 lg:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center ml-2 lg:ml-0">
            <Smartphone className="h-8 w-8 text-orange-600 mr-2" />
            <h1 className="text-xl font-bold text-gray-900 hidden sm:block">Zeger On The Wheels</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {notifications.length > 0 && (
            <div className="relative">
              <Bell className="h-5 w-5 text-orange-600" />
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1">
                {notifications.length}
              </Badge>
            </div>
          )}
          
          <Avatar className="h-8 w-8">
            <AvatarImage src="" />
            <AvatarFallback className="bg-orange-100 text-orange-800">
              {user.first_name[0]}{user.last_name[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
          
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-screen">
          <DesktopNavigation activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="mb-6 space-y-2">
              {notifications.map((notification, index) => (
                <Alert key={index} className="border-orange-200 bg-orange-50">
                  <Bell className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    {notification}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="dashboard">
              <DashboardOverview 
                stats={stats} 
                stores={dashboardData.stores}
                orders={dashboardData.orders}
                user={user}
                isLoading={isLoading}
              />
            </TabsContent>
            
            <TabsContent value="stores">
              <StoreManagement 
                stores={dashboardData.stores} 
                onStoreUpdate={loadDashboardData}
                user={user}
              />
            </TabsContent>
            
            <TabsContent value="products">
              <ProductManagement 
                products={dashboardData.products}
                stores={dashboardData.stores}
                onProductUpdate={loadDashboardData}
              />
            </TabsContent>
            
            <TabsContent value="orders">
              <OrderManagement 
                orders={dashboardData.orders}
                stores={dashboardData.stores}
                onOrderUpdate={loadDashboardData}
              />
            </TabsContent>
            
            <TabsContent value="stock">
              <StockVerification 
                stockVerifications={dashboardData.stockVerifications}
                stores={dashboardData.stores}
                onVerificationUpdate={loadDashboardData}
                user={user}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
}

function DesktopNavigation({ activeTab, setActiveTab, user }: NavigationProps) {
  const navItems = getNavItems(user.role);
  
  return (
    <nav className="p-4">
      <div className="space-y-2">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "default" : "ghost"}
            className={`w-full justify-start ${
              activeTab === item.id 
                ? "bg-orange-600 hover:bg-orange-700 text-white" 
                : "hover:bg-orange-50 hover:text-orange-900"
            }`}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon className="mr-3 h-4 w-4" />
            {item.label}
          </Button>
        ))}
      </div>
    </nav>
  );
}

function MobileNavigation({ activeTab, setActiveTab, user }: NavigationProps) {
  const navItems = getNavItems(user.role);
  
  return (
    <div className="py-6">
      <div className="px-6 mb-6">
        <div className="flex items-center">
          <Smartphone className="h-8 w-8 text-orange-600 mr-2" />
          <h2 className="text-lg font-semibold">Zeger On The Wheels</h2>
        </div>
      </div>
      
      <nav className="space-y-1 px-3">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "default" : "ghost"}
            className={`w-full justify-start ${
              activeTab === item.id 
                ? "bg-orange-600 hover:bg-orange-700 text-white" 
                : "hover:bg-orange-50 hover:text-orange-900"
            }`}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon className="mr-3 h-4 w-4" />
            {item.label}
          </Button>
        ))}
      </nav>
    </div>
  );
}

function getNavItems(role: string) {
  const baseItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'stores', label: 'Store Management', icon: StoreIcon },
    { id: 'products', label: 'Menu/Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
  ];

  if (role === 'administrator' || role === 'store_staff') {
    baseItems.push({ id: 'stock', label: 'Stock Verification', icon: CheckCircle });
  }

  return baseItems;
}

interface DashboardOverviewProps {
  stats: {
    totalSales: number;
    activeStores: number;
    todaysOrders: number;
    pendingVerifications: number;
  };
  stores: Store[];
  orders: Order[];
  user: User;
  isLoading: boolean;
}

function DashboardOverview({ stats, stores, orders, user, isLoading }: DashboardOverviewProps) {
  const recentOrders = orders
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.first_name}! 👋
          </h2>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your business today
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.totalSales.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center">
              <StoreIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Stores</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeStores}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todaysOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingVerifications}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingBag className="mr-2 h-5 w-5 text-orange-600" />
              Recent Orders
            </CardTitle>
            <CardDescription>Latest orders from your stores</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No orders yet. Start selling to see orders here! 🚀
              </p>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order: Order) => (
                  <div key={order.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">Order #{order.id}</p>
                      <p className="text-sm text-gray-600">
                        {order.customer_name || 'Anonymous Customer'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${order.total_amount.toFixed(2)}</p>
                      <Badge 
                        variant={order.status === 'completed' ? 'default' : 'secondary'}
                        className={
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'new' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }
                      >
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <StoreIcon className="mr-2 h-5 w-5 text-blue-600" />
              Store Status
            </CardTitle>
            <CardDescription>Current status of your outlets</CardDescription>
          </CardHeader>
          <CardContent>
            {stores.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No stores yet. Add your first store to get started! 🏪
              </p>
            ) : (
              <div className="space-y-4">
                {stores.slice(0, 3).map((store: Store) => (
                  <div key={store.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="font-medium">{store.name}</p>
                        <p className="text-sm text-gray-600">{store.address}</p>
                      </div>
                    </div>
                    <Badge 
                      variant={store.status === 'open' ? 'default' : 'secondary'}
                      className={
                        store.status === 'open' ? 'bg-green-100 text-green-800' :
                        store.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {store.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
