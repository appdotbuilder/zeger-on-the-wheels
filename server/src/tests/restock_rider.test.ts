
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, storesTable, productsTable, inventoryTable, stockVerificationTable } from '../db/schema';
import { restockRider } from '../handlers/restock_rider';
import { eq, and, isNull } from 'drizzle-orm';

describe('restockRider', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let storeOwnerId: number;
  let storeId: number;
  let riderId: number;
  let productId1: number;
  let productId2: number;

  beforeEach(async () => {
    // Create store owner
    const ownerResult = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hashed_password',
        first_name: 'Store',
        last_name: 'Owner',
        phone: '+1234567890',
        role: 'store_staff'
      })
      .returning()
      .execute();
    storeOwnerId = ownerResult[0].id;

    // Create rider
    const riderResult = await db.insert(usersTable)
      .values({
        email: 'rider@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Rider',
        phone: '+1234567891',
        role: 'rider_seller'
      })
      .returning()
      .execute();
    riderId = riderResult[0].id;

    // Create store
    const storeResult = await db.insert(storesTable)
      .values({
        owner_id: storeOwnerId,
        name: 'Test Store',
        description: 'A test store',
        address: '123 Test St',
        operating_hours: '{"monday": "9-17", "tuesday": "9-17"}'
      })
      .returning()
      .execute();
    storeId = storeResult[0].id;

    // Create products
    const product1Result = await db.insert(productsTable)
      .values({
        store_id: storeId,
        name: 'Product 1',
        description: 'Test product 1',
        price: '19.99',
        category: 'food'
      })
      .returning()
      .execute();
    productId1 = product1Result[0].id;

    const product2Result = await db.insert(productsTable)
      .values({
        store_id: storeId,
        name: 'Product 2',
        description: 'Test product 2',
        price: '29.99',
        category: 'beverages'
      })
      .returning()
      .execute();
    productId2 = product2Result[0].id;

    // Create store inventory
    await db.insert(inventoryTable)
      .values({
        product_id: productId1,
        store_id: storeId,
        rider_id: null, // Store inventory
        stock_quantity: 100,
        allocated_quantity: 0,
        remaining_quantity: 100,
        date: new Date()
      })
      .execute();

    await db.insert(inventoryTable)
      .values({
        product_id: productId2,
        store_id: storeId,
        rider_id: null, // Store inventory
        stock_quantity: 50,
        allocated_quantity: 0,
        remaining_quantity: 50,
        date: new Date()
      })
      .execute();
  });

  it('should successfully restock rider with valid stock data', async () => {
    const stockData = JSON.stringify([
      { product_id: productId1, quantity: 10 },
      { product_id: productId2, quantity: 5 }
    ]);

    const result = await restockRider(storeId, riderId, stockData);

    expect(result).toHaveLength(2);
    
    // Check first product inventory
    expect(result[0].product_id).toBe(productId1);
    expect(result[0].rider_id).toBe(riderId);
    expect(result[0].stock_quantity).toBe(10);
    expect(result[0].remaining_quantity).toBe(10);
    expect(result[0].allocated_quantity).toBe(0);

    // Check second product inventory
    expect(result[1].product_id).toBe(productId2);
    expect(result[1].rider_id).toBe(riderId);
    expect(result[1].stock_quantity).toBe(5);
    expect(result[1].remaining_quantity).toBe(5);
    expect(result[1].allocated_quantity).toBe(0);
  });

  it('should update store inventory correctly', async () => {
    const stockData = JSON.stringify([
      { product_id: productId1, quantity: 10 }
    ]);

    await restockRider(storeId, riderId, stockData);

    // Check store inventory was reduced
    const storeInventory = await db.select()
      .from(inventoryTable)
      .where(
        and(
          eq(inventoryTable.store_id, storeId),
          eq(inventoryTable.product_id, productId1),
          isNull(inventoryTable.rider_id)
        )
      )
      .execute();

    expect(storeInventory).toHaveLength(1);
    expect(storeInventory[0].remaining_quantity).toBe(90); // 100 - 10
  });

  it('should create stock verification entry', async () => {
    const stockData = JSON.stringify([
      { product_id: productId1, quantity: 10 }
    ]);

    await restockRider(storeId, riderId, stockData);

    // Check stock verification was created
    const verification = await db.select()
      .from(stockVerificationTable)
      .where(
        and(
          eq(stockVerificationTable.rider_id, riderId),
          eq(stockVerificationTable.store_id, storeId),
          eq(stockVerificationTable.verification_type, 'restock')
        )
      )
      .execute();

    expect(verification).toHaveLength(1);
    expect(verification[0].stock_data).toBe(stockData);
    expect(verification[0].status).toBe('pending');
    expect(verification[0].notes).toBe('Restock of 1 products');
  });

  it('should handle existing rider inventory by updating quantities', async () => {
    // Create existing rider inventory
    await db.insert(inventoryTable)
      .values({
        product_id: productId1,
        store_id: storeId,
        rider_id: riderId,
        stock_quantity: 5,
        allocated_quantity: 0,
        remaining_quantity: 5,
        date: new Date()
      })
      .execute();

    const stockData = JSON.stringify([
      { product_id: productId1, quantity: 10 }
    ]);

    const result = await restockRider(storeId, riderId, stockData);

    expect(result).toHaveLength(1);
    expect(result[0].stock_quantity).toBe(15); // 5 + 10
    expect(result[0].remaining_quantity).toBe(15); // 5 + 10
  });

  it('should throw error for insufficient store stock', async () => {
    const stockData = JSON.stringify([
      { product_id: productId1, quantity: 150 } // More than available (100)
    ]);

    await expect(restockRider(storeId, riderId, stockData))
      .rejects.toThrow(/insufficient stock/i);
  });

  it('should throw error for invalid stock data JSON', async () => {
    const invalidStockData = 'invalid json';

    await expect(restockRider(storeId, riderId, invalidStockData))
      .rejects.toThrow();
  });

  it('should throw error for empty stock data array', async () => {
    const stockData = JSON.stringify([]);

    await expect(restockRider(storeId, riderId, stockData))
      .rejects.toThrow(/invalid stock data/i);
  });

  it('should throw error for non-existent product', async () => {
    const stockData = JSON.stringify([
      { product_id: 999999, quantity: 10 }
    ]);

    await expect(restockRider(storeId, riderId, stockData))
      .rejects.toThrow(/no inventory found/i);
  });

  it('should throw error for invalid stock item structure', async () => {
    const stockData = JSON.stringify([
      { product_id: productId1, quantity: 0 }, // Invalid quantity
      { quantity: 5 } // Missing product_id
    ]);

    await expect(restockRider(storeId, riderId, stockData))
      .rejects.toThrow(/invalid stock item/i);
  });
});
