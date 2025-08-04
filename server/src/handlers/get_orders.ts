
import { db } from '../db';
import { ordersTable } from '../db/schema';
import { type Order } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getOrders = async (storeId?: number, riderId?: number): Promise<Order[]> => {
  try {
    // Build query conditions
    const conditions = [];

    if (storeId !== undefined) {
      conditions.push(eq(ordersTable.store_id, storeId));
    }

    if (riderId !== undefined) {
      conditions.push(eq(ordersTable.rider_id, riderId));
    }

    // Execute query with proper conditional where clause
    const results = conditions.length === 0
      ? await db.select().from(ordersTable).execute()
      : conditions.length === 1
      ? await db.select().from(ordersTable).where(conditions[0]).execute()
      : await db.select().from(ordersTable).where(and(...conditions)).execute();

    return results.map(order => ({
      ...order,
      total_amount: parseFloat(order.total_amount) // Convert numeric field to number
    }));
  } catch (error) {
    console.error('Get orders failed:', error);
    throw error;
  }
};
