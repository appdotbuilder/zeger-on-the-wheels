
import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['administrator', 'store_staff', 'rider_seller']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string().nullable(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Store/Outlet schema
export const storeStatusSchema = z.enum(['open', 'closed', 'pending_verification', 'suspended']);
export type StoreStatus = z.infer<typeof storeStatusSchema>;

export const storeSchema = z.object({
  id: z.number(),
  owner_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  address: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  phone: z.string().nullable(),
  operating_hours: z.string(), // JSON string with daily hours
  status: storeStatusSchema,
  is_verified: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Store = z.infer<typeof storeSchema>;

// Product/Menu Item schema
export const productSchema = z.object({
  id: z.number(),
  store_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  category: z.string(),
  image_url: z.string().nullable(),
  is_available: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

// Order status enum
export const orderStatusSchema = z.enum(['new', 'in_progress', 'completed', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Order schema
export const orderSchema = z.object({
  id: z.number(),
  store_id: z.number(),
  rider_id: z.number().nullable(),
  customer_name: z.string().nullable(),
  customer_phone: z.string().nullable(),
  total_amount: z.number(),
  status: orderStatusSchema,
  order_items: z.string(), // JSON string with order items
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Order = z.infer<typeof orderSchema>;

// Inventory schema
export const inventorySchema = z.object({
  id: z.number(),
  product_id: z.number(),
  store_id: z.number(),
  rider_id: z.number().nullable(),
  stock_quantity: z.number().int(),
  allocated_quantity: z.number().int(),
  remaining_quantity: z.number().int(),
  date: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Inventory = z.infer<typeof inventorySchema>;

// Stock verification schema
export const stockVerificationStatusSchema = z.enum(['pending', 'confirmed', 'disputed']);
export type StockVerificationStatus = z.infer<typeof stockVerificationStatusSchema>;

export const stockVerificationSchema = z.object({
  id: z.number(),
  rider_id: z.number(),
  store_id: z.number(),
  verification_type: z.enum(['start_day', 'end_day', 'restock']),
  stock_data: z.string(), // JSON string with stock items and quantities
  photo_urls: z.string().nullable(), // JSON array of photo URLs
  cash_deposit_photo: z.string().nullable(),
  status: stockVerificationStatusSchema,
  verified_by: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type StockVerification = z.infer<typeof stockVerificationSchema>;

// Sales transaction schema
export const salesTransactionSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  store_id: z.number(),
  rider_id: z.number().nullable(),
  amount: z.number(),
  payment_method: z.string(),
  transaction_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type SalesTransaction = z.infer<typeof salesTransactionSchema>;

// Input schemas for user operations
export const registerUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: z.string().nullable(),
  role: userRoleSchema
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Input schemas for store operations
export const createStoreInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  address: z.string().min(1),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  phone: z.string().nullable(),
  operating_hours: z.string() // JSON string
});

export type CreateStoreInput = z.infer<typeof createStoreInputSchema>;

export const updateStoreInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  address: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  phone: z.string().nullable().optional(),
  operating_hours: z.string().optional(),
  status: storeStatusSchema.optional()
});

export type UpdateStoreInput = z.infer<typeof updateStoreInputSchema>;

// Input schemas for product operations
export const createProductInputSchema = z.object({
  store_id: z.number(),
  name: z.string().min(1),
  description: z.string().nullable(),
  price: z.number().positive(),
  category: z.string().min(1),
  image_url: z.string().nullable()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  category: z.string().optional(),
  image_url: z.string().nullable().optional(),
  is_available: z.boolean().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Input schemas for order operations
export const createOrderInputSchema = z.object({
  store_id: z.number(),
  customer_name: z.string().nullable(),
  customer_phone: z.string().nullable(),
  order_items: z.string(), // JSON string with order items
  total_amount: z.number().positive()
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const updateOrderStatusInputSchema = z.object({
  id: z.number(),
  status: orderStatusSchema,
  rider_id: z.number().nullable().optional()
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

// Input schemas for stock verification
export const createStockVerificationInputSchema = z.object({
  rider_id: z.number(),
  store_id: z.number(),
  verification_type: z.enum(['start_day', 'end_day', 'restock']),
  stock_data: z.string(), // JSON string
  photo_urls: z.string().nullable(),
  cash_deposit_photo: z.string().nullable(),
  notes: z.string().nullable()
});

export type CreateStockVerificationInput = z.infer<typeof createStockVerificationInputSchema>;

export const verifyStockInputSchema = z.object({
  id: z.number(),
  status: stockVerificationStatusSchema,
  verified_by: z.number(),
  notes: z.string().nullable()
});

export type VerifyStockInput = z.infer<typeof verifyStockInputSchema>;

// Analytics input schema
export const analyticsInputSchema = z.object({
  store_id: z.number(),
  start_date: z.string(), // ISO date string
  end_date: z.string()     // ISO date string
});

export type AnalyticsInput = z.infer<typeof analyticsInputSchema>;
