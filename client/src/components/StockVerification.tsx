
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  AlertCircle, 
  Camera, 
  Clock, 
  User as UserIcon, 
  Search,
  Filter,
  Plus,
  Eye,
  DollarSign,
  Package
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  StockVerification as StockVerificationType, 
  CreateStockVerificationInput,
  VerifyStockInput,
  Store, 
  User,
  StockVerificationStatus
} from '../../../server/src/schema';

interface StockVerificationProps {
  stockVerifications: StockVerificationType[];
  stores: Store[];
  onVerificationUpdate: () => void;
  user: User;
}

interface StockItem {
  name: string;
  quantity: number;
}

export function StockVerification({ stockVerifications, stores, onVerificationUpdate, user }: StockVerificationProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<StockVerificationType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [formData, setFormData] = useState<CreateStockVerificationInput>({
    rider_id: 1, // This would come from context in real app
    store_id: stores.length > 0 ? stores[0].id : 0,
    verification_type: 'start_day',
    stock_data: '',
    photo_urls: null,
    cash_deposit_photo: null,
    notes: null
  });

  // Filter verifications
  const filteredVerifications = stockVerifications.filter((verification: StockVerificationType) => {
    const matchesSearch = 
      verification.id.toString().includes(searchTerm) ||
      verification.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || verification.status === statusFilter;
    const matchesType = typeFilter === 'all' || verification.verification_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Sort by created date (newest first)
  const sortedVerifications = filteredVerifications.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleCreateVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await trpc.createStockVerification.mutate(formData);
      setIsCreateDialogOpen(false);
      setFormData({
        rider_id: 1,
        store_id: stores.length > 0 ? stores[0].id : 0,
        verification_type: 'start_day',
        stock_data: '',
        photo_urls: null,
        cash_deposit_photo: null,
        notes: null
      });
      onVerificationUpdate();
    } catch (error) {
      console.error('Failed to create stock verification:', error);
      setError('Failed to create stock verification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyStock = async (verification: StockVerificationType, status: StockVerificationStatus, notes?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const verifyData: VerifyStockInput = {
        id: verification.id,
        status,
        verified_by: user.id,
        notes: notes || null
      };
      await trpc.verifyStock.mutate(verifyData);
      onVerificationUpdate();
    } catch (error) {
      console.error('Failed to verify stock:', error);
      setError('Failed to verify stock. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStoreName = (storeId: number) => {
    const store = stores.find(s => s.id === storeId);
    return store ? store.name : 'Unknown Store';
  };

  const getStatusIcon = (status: StockVerificationStatus) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'disputed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const parseStockData = (stockDataString: string): StockItem[] => {
    try {
      return JSON.parse(stockDataString) as StockItem[];
    } catch {
      return [];
    }
  };

  const parsePhotoUrls = (photoUrlsString: string | null): string[] => {
    if (!photoUrlsString) return [];
    try {
      return JSON.parse(photoUrlsString) as string[];
    } catch {
      return [];
    }
  };

  // Calculate statistics
  const stats = {
    total: stockVerifications.length,
    pending: stockVerifications.filter(sv => sv.status === 'pending').length,
    confirmed: stockVerifications.filter(sv => sv.status === 'confirmed').length,
    disputed: stockVerifications.filter(sv => sv.status === 'disputed').length,
    todaySubmissions: stockVerifications.filter(sv => 
      new Date(sv.created_at).toDateString() === new Date().toDateString()
    ).length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center">
            <CheckCircle className="mr-3 h-8 w-8 text-orange-600" />
            Stock Verification
          </h2>
          <p className="text-gray-600 mt-1">
            Monitor and verify stock submissions for fraud prevention 🛡️
          </p>
        </div>
        
        {user.role === 'rider_seller' && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Submit Verification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Submit Stock Verification</DialogTitle>
                <DialogDescription>
                  Submit your stock verification with photos and details
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateVerification} className="space-y-4">
                <StockVerificationForm 
                  formData={formData} 
                  setFormData={setFormData}
                  stores={stores}
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
                    {isLoading ? 'Submitting...' : 'Submit Verification'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              <p className="text-sm text-gray-600">Confirmed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.disputed}</p>
              <p className="text-sm text-gray-600">Disputed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.todaySubmissions}</p>
              <p className="text-sm text-gray-600">Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search verifications..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="start_day">Start Day</SelectItem>
            <SelectItem value="end_day">End Day</SelectItem>
            <SelectItem value="restock">Restock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {sortedVerifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {stockVerifications.length === 0 ? 'No verifications yet' : 'No verifications match your search'}
            </h3>
            <p className="text-gray-600 text-center">
              {stockVerifications.length === 0 
                ? 'Stock verifications will appear here when riders submit them! 📋'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedVerifications.map((verification: StockVerificationType) => {
            const stockData = parseStockData(verification.stock_data);
            const photoUrls = parsePhotoUrls(verification.photo_urls);
            
            return (
              <Card key={verification.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Package className="mr-2 h-5 w-5 text-orange-600" />
                        Verification #{verification.id}
                        {getStatusIcon(verification.status)}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {getStoreName(verification.store_id)} • {verification.created_at.toLocaleString()}
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="secondary"
                        className={
                          verification.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          verification.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }
                      >
                        {verification.status}
                      </Badge>
                      
                      <Badge variant="outline">
                        {verification.verification_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Stock Data Preview */}
                  {stockData.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Stock Items:</h4>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          {stockData.slice(0, 6).map((item: StockItem, index: number) => (
                            <div key={index} className="flex justify-between">
                              <span className="text-gray-700">{item.name}:</span>
                              <span className="font-medium">{item.quantity}</span>
                            </div>
                          ))}
                          {stockData.length > 6 && (
                            <div className="text-gray-500">
                              +{stockData.length - 6} more items
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Photos */}
                  <div className="flex items-center space-x-4">
                    {photoUrls.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <Camera className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {photoUrls.length} stock photo{photoUrls.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    
                    {verification.cash_deposit_photo && (
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-600">Cash deposit photo</span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {verification.notes && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">{verification.notes}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        Rider ID: {verification.rider_id}
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedVerification(verification);
                          setIsViewDialogOpen(true);
                        }}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View Details
                      </Button>
                      
                      {verification.status === 'pending' && (user.role === 'administrator' || user.role === 'store_staff') && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            onClick={() => handleVerifyStock(verification, 'confirmed')}
                            disabled={isLoading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerifyStock(verification, 'disputed')}
                            disabled={isLoading}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Dispute
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verification Details</DialogTitle>
            <DialogDescription>
              Complete information for verification #{selectedVerification?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedVerification && (
            <VerificationDetails verification={selectedVerification} stores={stores} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface StockVerificationFormProps {
  formData: CreateStockVerificationInput;
  setFormData: (data: CreateStockVerificationInput) => void;
  stores: Store[];
  error: string | null;
}

function StockVerificationForm({ formData, setFormData, stores, error }: StockVerificationFormProps) {
  return (
    <>
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Store *</label>
        <Select
          value={stores.length > 0 ? formData.store_id.toString() : ''}
          onValueChange={(value: string) =>
            setFormData({ ...formData, store_id: parseInt(value) })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a store" />
          </SelectTrigger>
          <SelectContent>
            {stores.map((store: Store) => (
              <SelectItem key={store.id} value={store.id.toString()}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Verification Type *</label>
        <Select
          value={formData.verification_type}
          onValueChange={(value: 'start_day' | 'end_day' | 'restock') =>
            setFormData({ ...formData, verification_type: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select verification type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="start_day">Start of Day</SelectItem>
            <SelectItem value="end_day">End of Day</SelectItem>
            <SelectItem value="restock">Restock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Stock Data (JSON) *</label>
        <Textarea
          placeholder='[{"name": "Coffee", "quantity": 50}, {"name": "Tea", "quantity": 30}]'
          value={formData.stock_data}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData({ ...formData, stock_data: e.target.value })
          }
          rows={4}
          required
        />
        <p className="text-xs text-gray-500">
          Enter stock data in JSON format with item names and quantities
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Photo URLs (JSON Array)</label>
        <Input
          placeholder='["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]'
          value={formData.photo_urls || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, photo_urls: e.target.value || null })
          }
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Cash Deposit Photo URL</label>
        <Input
          type="url"
          placeholder="https://example.com/cash-deposit.jpg"
          value={formData.cash_deposit_photo || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, cash_deposit_photo: e.target.value || null })
          }
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Notes</label>
        <Textarea
          placeholder="Additional notes or comments..."
          value={formData.notes || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData({ ...formData, notes: e.target.value || null })
          }
          rows={3}
        />
      </div>
    </>
  );
}

interface VerificationDetailsProps {
  verification: StockVerificationType;
  stores: Store[];
}

function VerificationDetails({ verification, stores }: VerificationDetailsProps) {
  const stockData = JSON.parse(verification.stock_data || '[]') as StockItem[];
  const photoUrls = verification.photo_urls ? JSON.parse(verification.photo_urls) as string[] : [];
  const storeName = stores.find(s => s.id === verification.store_id)?.name || 'Unknown Store';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-gray-900">Store</h4>
          <p className="text-gray-700">{storeName}</p>
        </div>
        <div>
          <h4 className="font-medium text-gray-900">Type</h4>
          <p className="text-gray-700 capitalize">{verification.verification_type.replace('_', ' ')}</p>
        </div>
        <div>
          <h4 className="font-medium text-gray-900">Status</h4>
          <Badge 
            className={
              verification.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              verification.status === 'confirmed' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }
          >
            {verification.status}
          </Badge>
        </div>
        <div>
          <h4 className="font-medium text-gray-900">Submitted</h4>
          <p className="text-gray-700">{verification.created_at.toLocaleString()}</p>
        </div>
      </div>

      <Separator />

      {stockData.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Stock Items</h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {stockData.map((item: StockItem, index: number) => (
                <div key={index} className="flex justify-between bg-white p-2 rounded">
                  <span className="text-gray-700">{item.name}</span>
                  <span className="font-medium">{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {photoUrls.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Stock Photos</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photoUrls.map((url: string, index: number) => (
              <img
                key={index}
                src={url}
                alt={`Stock photo ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NyA2NEw5MyA3MEwxMTMgNTBMMTMzIDcwVjc2SDY3VjcwTDg3IDY0WiIgZmlsbD0iI0Q1RDhEQyIvPgo8L3N2Zz4K';
                }}
              />
            ))}
          </div>
        </div>
      )}

      {verification.cash_deposit_photo && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Cash Deposit Photo</h4>
          <img
            src={verification.cash_deposit_photo}
            alt="Cash deposit"
            className="w-full max-w-md h-48 object-cover rounded-lg border"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NyA2NEw5MyA3MEwxMTMgNTBMMTMzIDcwVjc2SDY3VjcwTDg3IDY0WiIgZmlsbD0iI0Q1RDhEQyIvPgo8L3N2Zz4K';
            }}
          />
        </div>
      )}

      {verification.notes && (
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800">{verification.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
