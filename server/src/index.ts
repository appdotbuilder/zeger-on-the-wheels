
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  registerUserInputSchema, 
  loginInputSchema,
  createStoreInputSchema,
  updateStoreInputSchema,
  createProductInputSchema,
  updateProductInputSchema,
  createOrderInputSchema,
  updateOrderStatusInputSchema,
  createStockVerificationInputSchema,
  verifyStockInputSchema,
  analyticsInputSchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { createStore } from './handlers/create_store';
import { getStores } from './handlers/get_stores';
import { updateStore } from './handlers/update_store';
import { createProduct } from './handlers/create_product';
import { getProducts } from './handlers/get_products';
import { updateProduct } from './handlers/update_product';
import { createOrder } from './handlers/create_order';
import { getOrders } from './handlers/get_orders';
import { updateOrderStatus } from './handlers/update_order_status';
import { createStockVerification } from './handlers/create_stock_verification';
import { verifyStock } from './handlers/verify_stock';
import { getStockVerifications } from './handlers/get_stock_verifications';
import { getAnalytics } from './handlers/get_analytics';
import { getInventory } from './handlers/get_inventory';
import { restockRider } from './handlers/restock_rider';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Define restock input schema
const restockRiderInputSchema = z.object({
  storeId: z.number(),
  riderId: z.number(),
  stockData: z.string()
});

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),
  
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Store management routes
  createStore: publicProcedure
    .input(createStoreInputSchema)
    .mutation(({ input }) => createStore(input, 1)), // TODO: Get userId from context
  
  getStores: publicProcedure
    .query(() => getStores()),
  
  updateStore: publicProcedure
    .input(updateStoreInputSchema)
    .mutation(({ input }) => updateStore(input)),

  // Product management routes
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),
  
  getProducts: publicProcedure
    .query(() => getProducts()),
  
  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),

  // Order management routes
  createOrder: publicProcedure
    .input(createOrderInputSchema)
    .mutation(({ input }) => createOrder(input)),
  
  getOrders: publicProcedure
    .query(() => getOrders()),
  
  updateOrderStatus: publicProcedure
    .input(updateOrderStatusInputSchema)
    .mutation(({ input }) => updateOrderStatus(input)),

  // Stock verification routes
  createStockVerification: publicProcedure
    .input(createStockVerificationInputSchema)
    .mutation(({ input }) => createStockVerification(input)),
  
  verifyStock: publicProcedure
    .input(verifyStockInputSchema)
    .mutation(({ input }) => verifyStock(input)),
  
  getStockVerifications: publicProcedure
    .query(() => getStockVerifications()),

  // Analytics and reporting
  getAnalytics: publicProcedure
    .input(analyticsInputSchema)
    .query(({ input }) => getAnalytics(input)),

  // Inventory management
  getInventory: publicProcedure
    .query(() => getInventory()),
  
  restockRider: publicProcedure
    .input(restockRiderInputSchema)
    .mutation(({ input }) => restockRider(input.storeId, input.riderId, input.stockData))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Zeger On The Wheels TRPC server listening at port: ${port}`);
}

start();
