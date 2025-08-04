
import { db } from '../db';
import { stockVerificationTable, inventoryTable } from '../db/schema';
import { type VerifyStockInput, type StockVerification } from '../schema';
import { eq, and, SQL } from 'drizzle-orm';

export const verifyStock = async (input: VerifyStockInput): Promise<StockVerification> => {
  try {
    // First, get the existing stock verification record
    const existingVerification = await db.select()
      .from(stockVerificationTable)
      .where(eq(stockVerificationTable.id, input.id))
      .execute();

    if (existingVerification.length === 0) {
      throw new Error('Stock verification not found');
    }

    const verification = existingVerification[0];

    // Check if already verified
    if (verification.status !== 'pending') {
      throw new Error('Stock verification has already been processed');
    }

    // Update the verification status
    const updatedVerification = await db.update(stockVerificationTable)
      .set({
        status: input.status,
        verified_by: input.verified_by,
        notes: input.notes,
        updated_at: new Date()
      })
      .where(eq(stockVerificationTable.id, input.id))
      .returning()
      .execute();

    // If verification is confirmed, update inventory levels
    if (input.status === 'confirmed') {
      const stockData = JSON.parse(verification.stock_data);
      
      // Update inventory for each product in the stock data
      for (const item of stockData) {
        const { product_id, quantity } = item;
        
        // Find existing inventory record for this product, store, and rider
        const existingInventory = await db.select()
          .from(inventoryTable)
          .where(and(
            eq(inventoryTable.product_id, product_id),
            eq(inventoryTable.store_id, verification.store_id),
            eq(inventoryTable.rider_id, verification.rider_id)
          ))
          .execute();

        if (existingInventory.length > 0) {
          // Update existing inventory record
          const current = existingInventory[0];
          const newStockQuantity = verification.verification_type === 'restock' 
            ? current.stock_quantity + quantity
            : quantity;
          
          await db.update(inventoryTable)
            .set({
              stock_quantity: newStockQuantity,
              remaining_quantity: newStockQuantity - current.allocated_quantity,
              updated_at: new Date()
            })
            .where(eq(inventoryTable.id, current.id))
            .execute();
        } else {
          // Create new inventory record
          await db.insert(inventoryTable)
            .values({
              product_id: product_id,
              store_id: verification.store_id,
              rider_id: verification.rider_id,
              stock_quantity: quantity,
              allocated_quantity: 0,
              remaining_quantity: quantity,
              date: new Date()
            })
            .execute();
        }
      }
    }

    return {
      ...updatedVerification[0],
      verified_by: updatedVerification[0].verified_by
    };
  } catch (error) {
    console.error('Stock verification failed:', error);
    throw error;
  }
};
