
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, storesTable, productsTable, ordersTable } from '../db/schema';
import { type CreateOrderInput } from '../schema';
import { createOrder } from '../handlers/create_order';
import { eq } from 'drizzle-orm';

describe('createOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let storeId: number;
  let product1Id: number;
  let product2Id: number;

  beforeEach(async () => {
    // Create test user (store owner)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Store',
        last_name: 'Owner',
        role: 'store_staff'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test store
    const storeResult = await db.insert(storesTable)
      .values({
        owner_id: userId,
        name: 'Test Store',
        address: '123 Test St',
        operating_hours: '{"monday": "9-17"}',
        status: 'open'
      })
      .returning()
      .execute();

    storeId = storeResult[0].id;

    // Create test products
    const product1Result = await db.insert(productsTable)
      .values({
        store_id: storeId,
        name: 'Product 1',
        price: '10.99',
        category: 'food',
        is_available: true
      })
      .returning()
      .execute();

    const product2Result = await db.insert(productsTable)
      .values({
        store_id: storeId,
        name: 'Product 2',
        price: '5.50',
        category: 'food',
        is_available: true
      })
      .returning()
      .execute();

    product1Id = product1Result[0].id;
    product2Id = product2Result[0].id;
  });

  it('should create an order with correct total calculation', async () => {
    const orderItems = [
      { product_id: product1Id, quantity: 2 },
      { product_id: product2Id, quantity: 1 }
    ];

    const input: CreateOrderInput = {
      store_id: storeId,
      customer_name: 'John Doe',
      customer_phone: '+1234567890',
      order_items: JSON.stringify(orderItems),
      total_amount: 100 // This should be ignored and recalculated
    };

    const result = await createOrder(input);

    // Verify order details
    expect(result.store_id).toEqual(storeId);
    expect(result.customer_name).toEqual('John Doe');
    expect(result.customer_phone).toEqual('+1234567890');
    expect(result.status).toEqual('new');
    expect(result.rider_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify total amount calculation: (10.99 * 2) + (5.50 * 1) = 27.48
    expect(result.total_amount).toEqual(27.48);
    expect(typeof result.total_amount).toBe('number');

    // Verify order items were enriched with prices
    const parsedOrderItems = JSON.parse(result.order_items);
    expect(parsedOrderItems).toHaveLength(2);
    expect(parsedOrderItems[0]).toMatchObject({
      product_id: product1Id,
      quantity: 2,
      price: 10.99
    });
    expect(parsedOrderItems[1]).toMatchObject({
      product_id: product2Id,
      quantity: 1,
      price: 5.50
    });
  });

  it('should save order to database', async () => {
    const orderItems = [{ product_id: product1Id, quantity: 1 }];

    const input: CreateOrderInput = {
      store_id: storeId,
      customer_name: 'Jane Smith',
      customer_phone: null,
      order_items: JSON.stringify(orderItems),
      total_amount: 50
    };

    const result = await createOrder(input);

    // Verify order was saved to database
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, result.id))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].customer_name).toEqual('Jane Smith');
    expect(orders[0].customer_phone).toBeNull();
    expect(parseFloat(orders[0].total_amount)).toEqual(10.99);
    expect(orders[0].status).toEqual('new');
  });

  it('should throw error for non-existent store', async () => {
    const input: CreateOrderInput = {
      store_id: 999,
      customer_name: 'John Doe',
      customer_phone: '+1234567890',
      order_items: JSON.stringify([{ product_id: product1Id, quantity: 1 }]),
      total_amount: 10
    };

    await expect(createOrder(input)).rejects.toThrow(/store not found/i);
  });

  it('should throw error for closed store', async () => {
    // Update store status to closed
    await db.update(storesTable)
      .set({ status: 'closed' })
      .where(eq(storesTable.id, storeId))
      .execute();

    const input: CreateOrderInput = {
      store_id: storeId,
      customer_name: 'John Doe',
      customer_phone: '+1234567890',
      order_items: JSON.stringify([{ product_id: product1Id, quantity: 1 }]),
      total_amount: 10
    };

    await expect(createOrder(input)).rejects.toThrow(/store is not currently open/i);
  });

  it('should throw error for invalid order items JSON', async () => {
    const input: CreateOrderInput = {
      store_id: storeId,
      customer_name: 'John Doe',
      customer_phone: '+1234567890',
      order_items: 'invalid json',
      total_amount: 10
    };

    await expect(createOrder(input)).rejects.toThrow(/invalid order items format/i);
  });

  it('should throw error for empty order items', async () => {
    const input: CreateOrderInput = {
      store_id: storeId,
      customer_name: 'John Doe',
      customer_phone: '+1234567890',
      order_items: JSON.stringify([]),
      total_amount: 10
    };

    await expect(createOrder(input)).rejects.toThrow(/order must contain at least one item/i);
  });

  it('should throw error for non-existent product', async () => {
    const orderItems = [{ product_id: 999, quantity: 1 }];

    const input: CreateOrderInput = {
      store_id: storeId,
      customer_name: 'John Doe',
      customer_phone: '+1234567890',
      order_items: JSON.stringify(orderItems),
      total_amount: 10
    };

    await expect(createOrder(input)).rejects.toThrow(/products not found/i);
  });

  it('should throw error for unavailable product', async () => {
    // Mark product as unavailable
    await db.update(productsTable)
      .set({ is_available: false })
      .where(eq(productsTable.id, product1Id))
      .execute();

    const orderItems = [{ product_id: product1Id, quantity: 1 }];

    const input: CreateOrderInput = {
      store_id: storeId,
      customer_name: 'John Doe',
      customer_phone: '+1234567890',
      order_items: JSON.stringify(orderItems),
      total_amount: 10
    };

    await expect(createOrder(input)).rejects.toThrow(/products are currently unavailable/i);
  });

  it('should throw error for product from different store', async () => {
    // Create another store with a product
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner2@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Store',
        last_name: 'Owner2',
        role: 'store_staff'
      })
      .returning()
      .execute();

    const store2Result = await db.insert(storesTable)
      .values({
        owner_id: userResult[0].id,
        name: 'Store 2',
        address: '456 Test Ave',
        operating_hours: '{"monday": "9-17"}',
        status: 'open'
      })
      .returning()
      .execute();

    const product3Result = await db.insert(productsTable)
      .values({
        store_id: store2Result[0].id,
        name: 'Product 3',
        price: '15.00',
        category: 'food',
        is_available: true
      })
      .returning()
      .execute();

    // Try to order product from different store
    const orderItems = [{ product_id: product3Result[0].id, quantity: 1 }];

    const input: CreateOrderInput = {
      store_id: storeId,
      customer_name: 'John Doe',
      customer_phone: '+1234567890',
      order_items: JSON.stringify(orderItems),
      total_amount: 15
    };

    await expect(createOrder(input)).rejects.toThrow(/products not found or don't belong to this store/i);
  });

  it('should throw error for invalid order item structure', async () => {
    const orderItems = [{ product_id: product1Id }]; // Missing quantity

    const input: CreateOrderInput = {
      store_id: storeId,
      customer_name: 'John Doe',
      customer_phone: '+1234567890',
      order_items: JSON.stringify(orderItems),
      total_amount: 10
    };

    await expect(createOrder(input)).rejects.toThrow(/each order item must have valid product_id and quantity/i);
  });
});
