
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { eq } from 'drizzle-orm';

export const getProducts = async (storeId?: number): Promise<Product[]> => {
  try {
    let results;
    
    if (storeId !== undefined) {
      // Query with store filter
      results = await db.select()
        .from(productsTable)
        .where(eq(productsTable.store_id, storeId))
        .execute();
    } else {
      // Query without filter
      results = await db.select()
        .from(productsTable)
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Get products failed:', error);
    throw error;
  }
};
