
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Package, 
  Edit, 
  DollarSign, 
  Tag, 
  ImageIcon, 
  Coffee, 
  AlertCircle,
  Search,
  Filter
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Product, CreateProductInput, UpdateProductInput, Store } from '../../../server/src/schema';

interface ProductManagementProps {
  products: Product[];
  stores: Store[];
  onProductUpdate: () => void;
}

export function ProductManagement({ products, stores, onProductUpdate }: ProductManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [formData, setFormData] = useState<CreateProductInput>({
    store_id: stores.length > 0 ? stores[0].id : 0,
    name: '',
    description: null,
    price: 0,
    category: '',
    image_url: null
  });

  // Get unique categories
  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

  // Filter products based on search and category
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await trpc.createProduct.mutate(formData);
      setIsCreateDialogOpen(false);
      setFormData({
        store_id: stores.length > 0 ? stores[0].id : 0,
        name: '',
        description: null,
        price: 0,
        category: '',
        image_url: null
      });
      onProductUpdate();
    } catch (error) {
      console.error('Failed to create product:', error);
      setError('Failed to create product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      store_id: product.store_id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      image_url: product.image_url
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsLoading(true);
    setError(null);

    try {
      const updateData: UpdateProductInput = {
        id: selectedProduct.id,
        name: formData.name,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        image_url: formData.image_url
      };

      await trpc.updateProduct.mutate(updateData);
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
      onProductUpdate();
    } catch (error) {
      console.error('Failed to update product:', error);
      setError('Failed to update product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAvailability = async (productId: number, isAvailable: boolean) => {
    setIsLoading(true);
    try {
      const updateData: UpdateProductInput = {
        id: productId,
        is_available: !isAvailable
      };
      await trpc.updateProduct.mutate(updateData);
      onProductUpdate();
    } catch (error) {
      console.error('Failed to update product availability:', error);
      setError('Failed to update product availability. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStoreName = (storeId: number) => {
    const store = stores.find(s => s.id === storeId);
    return store ? store.name : 'Unknown Store';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center">
            <Package className="mr-3 h-8 w-8 text-orange-600" />
            Menu & Products
          </h2>
          <p className="text-gray-600 mt-1">
            Manage your menu items and products ☕
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Add a new item to your menu or product catalog
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <ProductForm 
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
                  {isLoading ? 'Adding...' : 'Add Product'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
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

      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Coffee className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {products.length === 0 ? 'No products yet' : 'No products match your search'}
            </h3>
            <p className="text-gray-600 text-center mb-4">
              {products.length === 0 
                ? 'Start building your menu by adding your first product'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {products.length === 0 && (
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Product
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product: Product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {product.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-2">
                    <Switch
                      checked={product.is_available}
                      onCheckedChange={() => handleToggleAvailability(product.id, product.is_available)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {product.image_url ? (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden flex-col items-center text-gray-400">
                      <ImageIcon className="h-8 w-8 mb-2" />
                      <span className="text-sm">Image not available</span>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400">
                    <ImageIcon className="h-8 w-8 mb-2" />
                    <span className="text-sm">No image</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-lg font-bold text-green-600">
                      ${product.price.toFixed(2)}
                    </span>
                  </div>
                  
                  <Badge 
                    variant={product.is_available ? 'default' : 'secondary'}
                    className={
                      product.is_available 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {product.is_available ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>

                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{product.category}</span>
                </div>

                <div className="text-xs text-gray-500">
                  {getStoreName(product.store_id)}
                </div>

                <Separator />

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-gray-500">
                    Added {product.created_at.toLocaleDateString()}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditProduct(product)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update your product information
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateProduct} className="space-y-4">
            <ProductForm 
              formData={formData} 
              setFormData={setFormData}
              stores={stores}
              error={error}
              isEdit={true}
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
                {isLoading ? 'Updating...' : 'Update Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ProductFormProps {
  formData: CreateProductInput;
  setFormData: (data: CreateProductInput) => void;
  stores: Store[];
  error: string | null;
  isEdit?: boolean;
}

function ProductForm({ formData, setFormData, stores, error, isEdit = false }: ProductFormProps) {
  const commonCategories = [
    'Coffee & Espresso ☕',
    'Tea & Beverages 🫖',
    'Food & Snacks 🥪',
    'Desserts & Sweets 🍰',
    'Breakfast Items 🥐',
    'Lunch Specials 🍽️',
    'Healthy Options 🥗',
    'Other'
  ];

  return (
    <>
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {!isEdit && (
        <div className="space-y-2">
          <Label htmlFor="store-select">Store *</Label>
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
      )}

      <div className="space-y-2">
        <Label htmlFor="product-name">Product Name *</Label>
        <Input
          id="product-name"
          placeholder="Cappuccino"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, name: e.target.value })
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="product-description">Description</Label>
        <Textarea
          id="product-description"
          placeholder="Rich espresso with steamed milk and foam..."
          value={formData.description || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData({ ...formData, description: e.target.value || null })
          }
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="product-price">Price *</Label>
          <Input
            id="product-price"
            type="number"
            step="0.01"
            min="0"
            placeholder="4.99"
            value={formData.price || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-category">Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value: string) =>
              setFormData({ ...formData, category: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {commonCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="product-image">Image URL</Label>
        <Input
          id="product-image"
          type="url"
          placeholder="https://example.com/image.jpg"
          value={formData.image_url || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, image_url: e.target.value || null })
          }
        />
        <p className="text-xs text-gray-500">
          Optional: Add a URL for your product image
        </p>
      </div>
    </>
  );
}
