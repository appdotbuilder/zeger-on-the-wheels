
import { db } from '../db';
import { inventoryTable, stockVerificationTable } from '../db/schema';
import { type Inventory } from '../schema';
import { eq, and, isNull } from 'drizzle-orm';

interface StockItem {
  product_id: number;
  quantity: number;
}

export const restockRider = async (storeId: number, riderId: number, stockData: string): Promise<Inventory[]> => {
  try {
    // Parse stock data JSON
    const stockItems: StockItem[] = JSON.parse(stockData);
    
    if (!Array.isArray(stockItems) || stockItems.length === 0) {
      throw new Error('Invalid stock data: must be non-empty array');
    }

    // Validate stock items structure
    for (const item of stockItems) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        throw new Error('Invalid stock item: must have product_id and positive quantity');
      }
    }

    const today = new Date();
    const createdInventory: Inventory[] = [];

    // Process each stock item
    for (const item of stockItems) {
      // Find store's current inventory for this product
      const storeInventory = await db.select()
        .from(inventoryTable)
        .where(
          and(
            eq(inventoryTable.store_id, storeId),
            eq(inventoryTable.product_id, item.product_id),
            isNull(inventoryTable.rider_id) // Store inventory has null rider_id
          )
        )
        .orderBy(inventoryTable.created_at)
        .limit(1)
        .execute();

      if (storeInventory.length === 0) {
        throw new Error(`No inventory found for product ${item.product_id} at store ${storeId}`);
      }

      const currentStoreInventory = storeInventory[0];
      
      // Check if store has sufficient remaining stock
      if (currentStoreInventory.remaining_quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.product_id}. Available: ${currentStoreInventory.remaining_quantity}, Requested: ${item.quantity}`);
      }

      // Update store inventory - reduce remaining quantity
      const newRemainingQuantity = currentStoreInventory.remaining_quantity - item.quantity;
      await db.update(inventoryTable)
        .set({
          remaining_quantity: newRemainingQuantity,
          updated_at: today
        })
        .where(eq(inventoryTable.id, currentStoreInventory.id))
        .execute();

      // Check if rider already has inventory for this product today
      const existingRiderInventory = await db.select()
        .from(inventoryTable)
        .where(
          and(
            eq(inventoryTable.store_id, storeId),
            eq(inventoryTable.product_id, item.product_id),
            eq(inventoryTable.rider_id, riderId)
          )
        )
        .orderBy(inventoryTable.created_at)
        .limit(1)
        .execute();

      let riderInventory: Inventory;

      if (existingRiderInventory.length > 0) {
        // Update existing rider inventory
        const existing = existingRiderInventory[0];
        const newStockQuantity = existing.stock_quantity + item.quantity;
        const newRemainingQuantity = existing.remaining_quantity + item.quantity;

        const updatedResult = await db.update(inventoryTable)
          .set({
            stock_quantity: newStockQuantity,
            remaining_quantity: newRemainingQuantity,
            updated_at: today
          })
          .where(eq(inventoryTable.id, existing.id))
          .returning()
          .execute();

        riderInventory = updatedResult[0];
      } else {
        // Create new rider inventory record
        const newInventoryResult = await db.insert(inventoryTable)
          .values({
            product_id: item.product_id,
            store_id: storeId,
            rider_id: riderId,
            stock_quantity: item.quantity,
            allocated_quantity: 0,
            remaining_quantity: item.quantity,
            date: today
          })
          .returning()
          .execute();

        riderInventory = newInventoryResult[0];
      }

      createdInventory.push(riderInventory);
    }

    // Create stock verification entry for rider to confirm
    await db.insert(stockVerificationTable)
      .values({
        rider_id: riderId,
        store_id: storeId,
        verification_type: 'restock',
        stock_data: stockData,
        photo_urls: null,
        cash_deposit_photo: null,
        notes: `Restock of ${stockItems.length} products`
      })
      .execute();

    return createdInventory;
  } catch (error) {
    console.error('Rider restock failed:', error);
    throw error;
  }
};
