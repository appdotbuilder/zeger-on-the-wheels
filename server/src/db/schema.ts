
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['administrator', 'store_staff', 'rider_seller']);
export const storeStatusEnum = pgEnum('store_status', ['open', 'closed', 'pending_verification', 'suspended']);
export const orderStatusEnum = pgEnum('order_status', ['new', 'in_progress', 'completed', 'cancelled']);
export const stockVerificationStatusEnum = pgEnum('stock_verification_status', ['pending', 'confirmed', 'disputed']);
export const verificationTypeEnum = pgEnum('verification_type', ['start_day', 'end_day', 'restock']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  phone: text('phone'),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Stores/Outlets table
export const storesTable = pgTable('stores', {
  id: serial('id').primaryKey(),
  owner_id: integer('owner_id').notNull().references(() => usersTable.id),
  name: text('name').notNull(),
  description: text('description'),
  address: text('address').notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 8 }),
  longitude: numeric('longitude', { precision: 11, scale: 8 }),
  phone: text('phone'),
  operating_hours: text('operating_hours').notNull(), // JSON string
  status: storeStatusEnum('status').notNull().default('pending_verification'),
  is_verified: boolean('is_verified').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Products/Menu Items table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  store_id: integer('store_id').notNull().references(() => storesTable.id),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  category: text('category').notNull(),
  image_url: text('image_url'),
  is_available: boolean('is_available').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Orders table
export const ordersTable = pgTable('orders', {
  id: serial('id').primaryKey(),
  store_id: integer('store_id').notNull().references(() => storesTable.id),
  rider_id: integer('rider_id').references(() => usersTable.id),
  customer_name: text('customer_name'),
  customer_phone: text('customer_phone'),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum('status').notNull().default('new'),
  order_items: text('order_items').notNull(), // JSON string
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Inventory table
export const inventoryTable = pgTable('inventory', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').notNull().references(() => productsTable.id),
  store_id: integer('store_id').notNull().references(() => storesTable.id),
  rider_id: integer('rider_id').references(() => usersTable.id),
  stock_quantity: integer('stock_quantity').notNull(),
  allocated_quantity: integer('allocated_quantity').notNull().default(0),
  remaining_quantity: integer('remaining_quantity').notNull(),
  date: timestamp('date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Stock Verification table
export const stockVerificationTable = pgTable('stock_verification', {
  id: serial('id').primaryKey(),
  rider_id: integer('rider_id').notNull().references(() => usersTable.id),
  store_id: integer('store_id').notNull().references(() => storesTable.id),
  verification_type: verificationTypeEnum('verification_type').notNull(),
  stock_data: text('stock_data').notNull(), // JSON string
  photo_urls: text('photo_urls'), // JSON array of URLs
  cash_deposit_photo: text('cash_deposit_photo'),
  status: stockVerificationStatusEnum('status').notNull().default('pending'),
  verified_by: integer('verified_by').references(() => usersTable.id),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Sales Transactions table
export const salesTransactionsTable = pgTable('sales_transactions', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').notNull().references(() => ordersTable.id),
  store_id: integer('store_id').notNull().references(() => storesTable.id),
  rider_id: integer('rider_id').references(() => usersTable.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  payment_method: text('payment_method').notNull(),
  transaction_date: timestamp('transaction_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  stores: many(storesTable),
  orders: many(ordersTable),
  stockVerifications: many(stockVerificationTable),
  salesTransactions: many(salesTransactionsTable)
}));

export const storesRelations = relations(storesTable, ({ one, many }) => ({
  owner: one(usersTable, {
    fields: [storesTable.owner_id],
    references: [usersTable.id]
  }),
  products: many(productsTable),
  orders: many(ordersTable),
  inventory: many(inventoryTable),
  stockVerifications: many(stockVerificationTable),
  salesTransactions: many(salesTransactionsTable)
}));

export const productsRelations = relations(productsTable, ({ one, many }) => ({
  store: one(storesTable, {
    fields: [productsTable.store_id],
    references: [storesTable.id]
  }),
  inventory: many(inventoryTable)
}));

export const ordersRelations = relations(ordersTable, ({ one }) => ({
  store: one(storesTable, {
    fields: [ordersTable.store_id],
    references: [storesTable.id]
  }),
  rider: one(usersTable, {
    fields: [ordersTable.rider_id],
    references: [usersTable.id]
  }),
  salesTransaction: one(salesTransactionsTable)
}));

export const inventoryRelations = relations(inventoryTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [inventoryTable.product_id],
    references: [productsTable.id]
  }),
  store: one(storesTable, {
    fields: [inventoryTable.store_id],
    references: [storesTable.id]
  }),
  rider: one(usersTable, {
    fields: [inventoryTable.rider_id],
    references: [usersTable.id]
  })
}));

export const stockVerificationRelations = relations(stockVerificationTable, ({ one }) => ({
  rider: one(usersTable, {
    fields: [stockVerificationTable.rider_id],
    references: [usersTable.id]
  }),
  store: one(storesTable, {
    fields: [stockVerificationTable.store_id],
    references: [storesTable.id]
  }),
  verifiedBy: one(usersTable, {
    fields: [stockVerificationTable.verified_by],
    references: [usersTable.id]
  })
}));

export const salesTransactionsRelations = relations(salesTransactionsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [salesTransactionsTable.order_id],
    references: [ordersTable.id]
  }),
  store: one(storesTable, {
    fields: [salesTransactionsTable.store_id],
    references: [storesTable.id]
  }),
  rider: one(usersTable, {
    fields: [salesTransactionsTable.rider_id],
    references: [usersTable.id]
  })
}));

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  stores: storesTable,
  products: productsTable,
  orders: ordersTable,
  inventory: inventoryTable,
  stockVerification: stockVerificationTable,
  salesTransactions: salesTransactionsTable
};
