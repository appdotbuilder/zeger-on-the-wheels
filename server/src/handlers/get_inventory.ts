
import { db } from '../db';
import { inventoryTable } from '../db/schema';
import { type Inventory } from '../schema';
import { eq, and, SQL } from 'drizzle-orm';

export const getInventory = async (storeId?: number, riderId?: number): Promise<Inventory[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (storeId !== undefined) {
      conditions.push(eq(inventoryTable.store_id, storeId));
    }

    if (riderId !== undefined) {
      conditions.push(eq(inventoryTable.rider_id, riderId));
    }

    // Build query with conditional where clause
    const results = conditions.length > 0
      ? await db.select()
          .from(inventoryTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute()
      : await db.select()
          .from(inventoryTable)
          .execute();

    // Return results directly - all fields are already the correct types
    return results;
  } catch (error) {
    console.error('Get inventory failed:', error);
    throw error;
  }
};
