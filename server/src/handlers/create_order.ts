
import { db } from '../db';
import { ordersTable, storesTable, productsTable } from '../db/schema';
import { type CreateOrderInput, type Order } from '../schema';
import { eq, and, inArray } from 'drizzle-orm';

interface OrderItem {
  product_id: number;
  quantity: number;
  price?: number; // Optional - will be fetched from product
}

export const createOrder = async (input: CreateOrderInput): Promise<Order> => {
  try {
    // Validate store exists and is open
    const stores = await db.select()
      .from(storesTable)
      .where(eq(storesTable.id, input.store_id))
      .execute();

    if (stores.length === 0) {
      throw new Error('Store not found');
    }

    const store = stores[0];
    if (store.status !== 'open') {
      throw new Error('Store is not currently open for orders');
    }

    // Parse order items
    let orderItems: OrderItem[];
    try {
      orderItems = JSON.parse(input.order_items);
    } catch (error) {
      throw new Error('Invalid order items format');
    }

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    // Validate order items structure
    for (const item of orderItems) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        throw new Error('Each order item must have valid product_id and quantity');
      }
    }

    // Get all product IDs from order items
    const productIds = orderItems.map(item => item.product_id);

    // Fetch products to validate they exist, belong to the store, and are available
    const products = await db.select()
      .from(productsTable)
      .where(
        and(
          inArray(productsTable.id, productIds),
          eq(productsTable.store_id, input.store_id)
        )
      )
      .execute();

    // Check that all products were found
    if (products.length !== productIds.length) {
      const foundProductIds = products.map(p => p.id);
      const missingProductIds = productIds.filter(id => !foundProductIds.includes(id));
      throw new Error(`Products not found or don't belong to this store: ${missingProductIds.join(', ')}`);
    }

    // Check that all products are available
    const unavailableProducts = products.filter(p => !p.is_available);
    if (unavailableProducts.length > 0) {
      const unavailableNames = unavailableProducts.map(p => p.name);
      throw new Error(`Products are currently unavailable: ${unavailableNames.join(', ')}`);
    }

    // Calculate total amount from current product prices
    let calculatedTotal = 0;
    const enrichedOrderItems = orderItems.map(item => {
      const product = products.find(p => p.id === item.product_id);
      if (!product) {
        throw new Error(`Product ${item.product_id} not found`);
      }
      
      const productPrice = parseFloat(product.price);
      const itemTotal = productPrice * item.quantity;
      calculatedTotal += itemTotal;

      return {
        ...item,
        price: productPrice
      };
    });

    // Create order with calculated total
    const result = await db.insert(ordersTable)
      .values({
        store_id: input.store_id,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        total_amount: calculatedTotal.toString(),
        order_items: JSON.stringify(enrichedOrderItems),
        status: 'new'
      })
      .returning()
      .execute();

    const order = result[0];
    return {
      ...order,
      total_amount: parseFloat(order.total_amount)
    };
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
};
