
import { db } from '../db';
import { stockVerificationTable, usersTable, storesTable } from '../db/schema';
import { type CreateStockVerificationInput, type StockVerification } from '../schema';
import { eq } from 'drizzle-orm';

export const createStockVerification = async (input: CreateStockVerificationInput): Promise<StockVerification> => {
  try {
    // Verify that the rider exists and has rider_seller role
    const rider = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.rider_id))
      .execute();

    if (rider.length === 0) {
      throw new Error('Rider not found');
    }

    if (rider[0].role !== 'rider_seller') {
      throw new Error('User is not a rider');
    }

    // Verify that the store exists
    const store = await db.select()
      .from(storesTable)
      .where(eq(storesTable.id, input.store_id))
      .execute();

    if (store.length === 0) {
      throw new Error('Store not found');
    }

    // Insert stock verification record
    const result = await db.insert(stockVerificationTable)
      .values({
        rider_id: input.rider_id,
        store_id: input.store_id,
        verification_type: input.verification_type,
        stock_data: input.stock_data,
        photo_urls: input.photo_urls,
        cash_deposit_photo: input.cash_deposit_photo,
        notes: input.notes,
        status: 'pending' // Default status
      })
      .returning()
      .execute();

    const stockVerification = result[0];
    return {
      ...stockVerification,
      // All other fields are already correct types (no numeric conversions needed)
    };
  } catch (error) {
    console.error('Stock verification creation failed:', error);
    throw error;
  }
};
