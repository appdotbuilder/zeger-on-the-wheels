
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, storesTable, productsTable, stockVerificationTable, inventoryTable } from '../db/schema';
import { type VerifyStockInput } from '../schema';
import { verifyStock } from '../handlers/verify_stock';
import { eq, and } from 'drizzle-orm';

describe('verifyStock', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let verifierUserId: number;
  let testStoreId: number;
  let testProductId: number;
  let testVerificationId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'rider@test.com',
          password_hash: 'hash123',
          first_name: 'Test',
          last_name: 'Rider',
          phone: '1234567890',
          role: 'rider_seller'
        },
        {
          email: 'verifier@test.com',
          password_hash: 'hash456',
          first_name: 'Test',
          last_name: 'Verifier',
          phone: '0987654321',
          role: 'store_staff'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    verifierUserId = users[1].id;

    // Create test store
    const stores = await db.insert(storesTable)
      .values({
        owner_id: verifierUserId,
        name: 'Test Store',
        address: '123 Test St',
        operating_hours: '{"monday": "9-17", "tuesday": "9-17"}'
      })
      .returning()
      .execute();

    testStoreId = stores[0].id;

    // Create test product
    const products = await db.insert(productsTable)
      .values({
        store_id: testStoreId,
        name: 'Test Product',
        price: '19.99',
        category: 'test'
      })
      .returning()
      .execute();

    testProductId = products[0].id;

    // Create test stock verification
    const verifications = await db.insert(stockVerificationTable)
      .values({
        rider_id: testUserId,
        store_id: testStoreId,
        verification_type: 'start_day',
        stock_data: JSON.stringify([{ product_id: testProductId, quantity: 50 }])
      })
      .returning()
      .execute();

    testVerificationId = verifications[0].id;
  });

  it('should verify stock and update status', async () => {
    const input: VerifyStockInput = {
      id: testVerificationId,
      status: 'confirmed',
      verified_by: verifierUserId,
      notes: 'Stock verified successfully'
    };

    const result = await verifyStock(input);

    expect(result.id).toEqual(testVerificationId);
    expect(result.status).toEqual('confirmed');
    expect(result.verified_by).toEqual(verifierUserId);
    expect(result.notes).toEqual('Stock verified successfully');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create new inventory record when confirming stock', async () => {
    const input: VerifyStockInput = {
      id: testVerificationId,
      status: 'confirmed',
      verified_by: verifierUserId,
      notes: null
    };

    await verifyStock(input);

    // Check that inventory record was created
    const inventory = await db.select()
      .from(inventoryTable)
      .where(and(
        eq(inventoryTable.product_id, testProductId),
        eq(inventoryTable.store_id, testStoreId),
        eq(inventoryTable.rider_id, testUserId)
      ))
      .execute();

    expect(inventory).toHaveLength(1);
    expect(inventory[0].stock_quantity).toEqual(50);
    expect(inventory[0].allocated_quantity).toEqual(0);
    expect(inventory[0].remaining_quantity).toEqual(50);
  });

  it('should update existing inventory when confirming restock', async () => {
    // First, create existing inventory
    await db.insert(inventoryTable)
      .values({
        product_id: testProductId,
        store_id: testStoreId,
        rider_id: testUserId,
        stock_quantity: 30,
        allocated_quantity: 10,
        remaining_quantity: 20,
        date: new Date()
      })
      .execute();

    // Create restock verification
    const restockVerification = await db.insert(stockVerificationTable)
      .values({
        rider_id: testUserId,
        store_id: testStoreId,
        verification_type: 'restock',
        stock_data: JSON.stringify([{ product_id: testProductId, quantity: 25 }])
      })
      .returning()
      .execute();

    const input: VerifyStockInput = {
      id: restockVerification[0].id,
      status: 'confirmed',
      verified_by: verifierUserId,
      notes: 'Restock confirmed'
    };

    await verifyStock(input);

    // Check that inventory was updated (30 + 25 = 55)
    const inventory = await db.select()
      .from(inventoryTable)
      .where(and(
        eq(inventoryTable.product_id, testProductId),
        eq(inventoryTable.store_id, testStoreId),
        eq(inventoryTable.rider_id, testUserId)
      ))
      .execute();

    expect(inventory).toHaveLength(1);
    expect(inventory[0].stock_quantity).toEqual(55);
    expect(inventory[0].allocated_quantity).toEqual(10); // Unchanged
    expect(inventory[0].remaining_quantity).toEqual(45); // 55 - 10
  });

  it('should reject stock verification without updating inventory', async () => {
    const input: VerifyStockInput = {
      id: testVerificationId,
      status: 'disputed',
      verified_by: verifierUserId,
      notes: 'Stock data inconsistent'
    };

    const result = await verifyStock(input);

    expect(result.status).toEqual('disputed');
    expect(result.notes).toEqual('Stock data inconsistent');

    // Check that no inventory record was created
    const inventory = await db.select()
      .from(inventoryTable)
      .where(and(
        eq(inventoryTable.product_id, testProductId),
        eq(inventoryTable.store_id, testStoreId),
        eq(inventoryTable.rider_id, testUserId)
      ))
      .execute();

    expect(inventory).toHaveLength(0);
  });

  it('should throw error for non-existent verification', async () => {
    const input: VerifyStockInput = {
      id: 999999,
      status: 'confirmed',
      verified_by: verifierUserId,
      notes: null
    };

    expect(verifyStock(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error when trying to verify already processed verification', async () => {
    // First verification
    const input: VerifyStockInput = {
      id: testVerificationId,
      status: 'confirmed',
      verified_by: verifierUserId,
      notes: 'First verification'
    };

    await verifyStock(input);

    // Try to verify again
    const secondInput: VerifyStockInput = {
      id: testVerificationId,
      status: 'disputed',
      verified_by: verifierUserId,
      notes: 'Second verification attempt'
    };

    expect(verifyStock(secondInput)).rejects.toThrow(/already been processed/i);
  });

  it('should handle multiple products in stock data', async () => {
    // Create second product
    const products = await db.insert(productsTable)
      .values({
        store_id: testStoreId,
        name: 'Second Product',
        price: '29.99',
        category: 'test'
      })
      .returning()
      .execute();

    const secondProductId = products[0].id;

    // Create verification with multiple products
    const verifications = await db.insert(stockVerificationTable)
      .values({
        rider_id: testUserId,
        store_id: testStoreId,
        verification_type: 'start_day',
        stock_data: JSON.stringify([
          { product_id: testProductId, quantity: 30 },
          { product_id: secondProductId, quantity: 40 }
        ])
      })
      .returning()
      .execute();

    const input: VerifyStockInput = {
      id: verifications[0].id,
      status: 'confirmed',
      verified_by: verifierUserId,
      notes: 'Multiple products verified'
    };

    await verifyStock(input);

    // Check inventory for both products
    const inventory = await db.select()
      .from(inventoryTable)
      .where(and(
        eq(inventoryTable.store_id, testStoreId),
        eq(inventoryTable.rider_id, testUserId)
      ))
      .execute();

    expect(inventory).toHaveLength(2);
    
    const firstProductInventory = inventory.find(i => i.product_id === testProductId);
    const secondProductInventory = inventory.find(i => i.product_id === secondProductId);
    
    expect(firstProductInventory?.stock_quantity).toEqual(30);
    expect(secondProductInventory?.stock_quantity).toEqual(40);
  });
});
