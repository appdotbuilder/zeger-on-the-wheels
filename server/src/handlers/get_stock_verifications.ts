
import { db } from '../db';
import { stockVerificationTable } from '../db/schema';
import { type StockVerification } from '../schema';
import { eq, and } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

export const getStockVerifications = async (storeId?: number, riderId?: number): Promise<StockVerification[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    if (storeId !== undefined) {
      conditions.push(eq(stockVerificationTable.store_id, storeId));
    }

    if (riderId !== undefined) {
      conditions.push(eq(stockVerificationTable.rider_id, riderId));
    }

    // Build query conditionally
    const results = conditions.length === 0
      ? await db.select().from(stockVerificationTable).execute()
      : conditions.length === 1
      ? await db.select().from(stockVerificationTable).where(conditions[0]).execute()
      : await db.select().from(stockVerificationTable).where(and(...conditions)).execute();

    return results.map(verification => ({
      ...verification,
      // No numeric conversions needed - all fields are already proper types
    }));
  } catch (error) {
    console.error('Stock verifications fetch failed:', error);
    throw error;
  }
};
