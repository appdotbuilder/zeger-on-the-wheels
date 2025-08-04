
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  MapPin, 
  Clock, 
  Phone, 
  Edit, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Store as StoreIcon
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Store, CreateStoreInput, UpdateStoreInput, User, StoreStatus } from '../../../server/src/schema';

interface StoreManagementProps {
  stores: Store[];
  onStoreUpdate: () => void;
  user: User;
}

interface OperatingHours {
  [key: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

export function StoreManagement({ stores, onStoreUpdate, user }: StoreManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateStoreInput>({
    name: '',
    description: null,
    address: '',
    latitude: null,
    longitude: null,
    phone: null,
    operating_hours: JSON.stringify({
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '10:00', close: '16:00', closed: false },
      sunday: { open: '10:00', close: '16:00', closed: true }
    })
  });

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await trpc.createStore.mutate(formData);
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        description: null,
        address: '',
        latitude: null,
        longitude: null,
        phone: null,
        operating_hours: JSON.stringify({
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '10:00', close: '16:00', closed: false },
          sunday: { open: '10:00', close: '16:00', closed: true }
        })
      });
      onStoreUpdate();
    } catch (error) {
      console.error('Failed to create store:', error);
      setError('Failed to create store. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStore = (store: Store) => {
    setSelectedStore(store);
    setFormData({
      name: store.name,
      description: store.description,
      address: store.address,
      latitude: store.latitude,
      longitude: store.longitude,
      phone: store.phone,
      operating_hours: store.operating_hours
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;

    setIsLoading(true);
    setError(null);

    try {
      const updateData: UpdateStoreInput = {
        id: selectedStore.id,
        name: formData.name,
        description: formData.description,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        phone: formData.phone,
        operating_hours: formData.operating_hours
      };

      await trpc.updateStore.mutate(updateData);
      setIsEditDialogOpen(false);
      setSelectedStore(null);
      onStoreUpdate();
    } catch (error) {
      console.error('Failed to update store:', error);
      setError('Failed to update store. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (storeId: number, newStatus: StoreStatus) => {
    setIsLoading(true);
    try {
      const updateData: UpdateStoreInput = {
        id: storeId,
        status: newStatus
      };
      await trpc.updateStore.mutate(updateData);
      onStoreUpdate();
    } catch (error) {
      console.error('Failed to update store status:', error);
      setError('Failed to update store status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: StoreStatus) => {
    switch (status) {
      case 'open':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending_verification':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'suspended':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const parseOperatingHours = (hoursString: string): OperatingHours => {
    try {
      return JSON.parse(hoursString) as OperatingHours;
    } catch {
      return {};
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center">
            <StoreIcon className="mr-3 h-8 w-8 text-orange-600" />
            Store Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage your outlet locations and settings 🏪
          </p>
        </div>
        
        {(user.role === 'administrator' || user.role === 'store_staff') && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add New Store
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Store</DialogTitle>
                <DialogDescription>
                  Create a new outlet location for your business
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateStore} className="space-y-4">
                <StoreForm 
                  formData={formData} 
                  setFormData={setFormData}
                  error={error}
                />
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isLoading ? 'Creating...' : 'Create Store'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {stores.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <StoreIcon className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No stores yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Get started by adding your first store location
            </p>
            {(user.role === 'administrator' || user.role === 'store_staff') && (
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Store
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store: Store) => (
            <Card key={store.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center">
                      {store.name}
                      {store.is_verified && (
                        <CheckCircle className="ml-2 h-4 w-4 text-green-600" />
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {store.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(store.status)}
                    <Badge 
                      variant={store.status === 'open' ? 'default' : 'secondary'}
                      className={
                        store.status === 'open' ? 'bg-green-100 text-green-800' :
                        store.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                        store.status === 'pending_verification' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }
                    >
                      {store.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{store.address}</p>
                </div>

                {store.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <p className="text-sm text-gray-700">{store.phone}</p>
                  </div>
                )}

                <div className="flex items-start space-x-2">
                  <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <OperatingHoursDisplay hours={parseOperatingHours(store.operating_hours)} />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-gray-500">
                    Created {store.created_at.toLocaleDateString()}
                  </div>
                  <div className="flex space-x-2">
                    {user.role === 'administrator' && (
                      <Select
                        value={store.status}
                        onValueChange={(value: StoreStatus) => handleStatusChange(store.id, value)}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="pending_verification">Pending</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    
                    {(user.role === 'administrator' || user.role === 'store_staff') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditStore(store)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Store Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Store</DialogTitle>
            <DialogDescription>
              Update your store information and settings
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateStore} className="space-y-4">
            <StoreForm 
              formData={formData} 
              setFormData={setFormData}
              error={error}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isLoading ? 'Updating...' : 'Update Store'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface StoreFormProps {
  formData: CreateStoreInput;
  setFormData: (data: CreateStoreInput) => void;
  error: string | null;
}

function StoreForm({ formData, setFormData, error }: StoreFormProps) {
  return (
    <>
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="store-name">Store Name *</Label>
          <Input
            id="store-name"
            placeholder="My Coffee Shop"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, name: e.target.value })
            }
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="store-phone">Phone</Label>
          <Input
            id="store-phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={formData.phone || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, phone: e.target.value || null })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="store-description">Description</Label>
        <Textarea
          id="store-description"
          placeholder="Tell customers about your store..."
          value={formData.description || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData({ ...formData, description: e.target.value || null })
          }
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="store-address">Address *</Label>
        <Textarea
          id="store-address"
          placeholder="123 Main St, City, State 12345"
          value={formData.address}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData({ ...formData, address: e.target.value })
          }
          required
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            placeholder="40.7128"
            value={formData.latitude || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, latitude: parseFloat(e.target.value) || null })
            }
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            placeholder="-74.0060"
            value={formData.longitude || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, longitude: parseFloat(e.target.value) || null })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Operating Hours</Label>
        <div className="p-4 border rounded-lg bg-gray-50">
          <p className="text-sm text-gray-600 mb-2">
            Default hours set to 9 AM - 6 PM (Mon-Fri), 10 AM - 4 PM (Sat), Closed (Sun)
          </p>
          <p className="text-xs text-gray-500">
            Advanced hour customization coming soon! 🚀
          </p>
        </div>
      </div>
    </>
  );
}

function OperatingHoursDisplay({ hours }: { hours: OperatingHours }) {
  if (!hours || typeof hours !== 'object') {
    return <span>Hours not set</span>;
  }

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = daysOfWeek[new Date().getDay()];
  
  const todayHours = hours[currentDay];
  
  if (!todayHours) {
    return <span>Hours not available</span>;
  }

  if (todayHours.closed) {
    return <span className="text-red-600">Closed today</span>;
  }

  return (
    <span className="text-green-600">
      Open {todayHours.open} - {todayHours.close}
    </span>
  );
}
