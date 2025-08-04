
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, storesTable, ordersTable } from '../db/schema';
import { type RegisterUserInput, type CreateStoreInput, type CreateOrderInput } from '../schema';
import { getOrders } from '../handlers/get_orders';

// Test data setup
const testUser: RegisterUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User',
  phone: '1234567890',
  role: 'store_staff'
};

const testRider: RegisterUserInput = {
  email: 'rider@example.com',
  password: 'password123',
  first_name: 'Test',
  last_name: 'Rider',
  phone: '0987654321',
  role: 'rider_seller'
};

const testStore: CreateStoreInput = {
  name: 'Test Store',
  description: 'A test store',
  address: '123 Main St',
  latitude: null,
  longitude: null,
  phone: '5551234567',
  operating_hours: '{"monday": "9-17", "tuesday": "9-17"}'
};

const testOrder: CreateOrderInput = {
  store_id: 0, // Will be set after store creation
  customer_name: 'John Customer',
  customer_phone: '5555555555',
  order_items: '[{"id": 1, "name": "Product 1", "quantity": 2, "price": 10.50}]',
  total_amount: 21.00
};

describe('getOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all orders when no filters provided', async () => {
    // Create user and store
    const userResult = await db.insert(usersTable)
      .values({
        ...testUser,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const storeResult = await db.insert(storesTable)
      .values({
        ...testStore,
        owner_id: userResult[0].id,
        latitude: testStore.latitude?.toString() || null,
        longitude: testStore.longitude?.toString() || null
      })
      .returning()
      .execute();

    // Create multiple orders
    await db.insert(ordersTable)
      .values([
        {
          ...testOrder,
          store_id: storeResult[0].id,
          total_amount: testOrder.total_amount.toString()
        },
        {
          ...testOrder,
          store_id: storeResult[0].id,
          customer_name: 'Jane Customer',
          total_amount: '15.75'
        }
      ])
      .execute();

    const orders = await getOrders();

    expect(orders).toHaveLength(2);
    expect(orders[0].customer_name).toEqual('John Customer');
    expect(orders[1].customer_name).toEqual('Jane Customer');
    expect(typeof orders[0].total_amount).toBe('number');
    expect(orders[0].total_amount).toEqual(21.00);
    expect(orders[1].total_amount).toEqual(15.75);
  });

  it('should filter orders by store_id', async () => {
    // Create user and stores
    const userResult = await db.insert(usersTable)
      .values({
        ...testUser,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const storeResults = await db.insert(storesTable)
      .values([
        {
          ...testStore,
          owner_id: userResult[0].id,
          name: 'Store 1',
          latitude: testStore.latitude?.toString() || null,
          longitude: testStore.longitude?.toString() || null
        },
        {
          ...testStore,
          owner_id: userResult[0].id,
          name: 'Store 2',
          latitude: testStore.latitude?.toString() || null,
          longitude: testStore.longitude?.toString() || null
        }
      ])
      .returning()
      .execute();

    // Create orders for different stores
    await db.insert(ordersTable)
      .values([
        {
          ...testOrder,
          store_id: storeResults[0].id,
          total_amount: testOrder.total_amount.toString()
        },
        {
          ...testOrder,
          store_id: storeResults[1].id,
          customer_name: 'Jane Customer',
          total_amount: '25.50'
        }
      ])
      .execute();

    const orders = await getOrders(storeResults[0].id);

    expect(orders).toHaveLength(1);
    expect(orders[0].store_id).toEqual(storeResults[0].id);
    expect(orders[0].customer_name).toEqual('John Customer');
    expect(orders[0].total_amount).toEqual(21.00);
  });

  it('should filter orders by rider_id', async () => {
    // Create user, rider, and store
    const userResult = await db.insert(usersTable)
      .values({
        ...testUser,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const riderResult = await db.insert(usersTable)
      .values({
        ...testRider,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const storeResult = await db.insert(storesTable)
      .values({
        ...testStore,
        owner_id: userResult[0].id,
        latitude: testStore.latitude?.toString() || null,
        longitude: testStore.longitude?.toString() || null
      })
      .returning()
      .execute();

    // Create orders with and without rider assignment
    await db.insert(ordersTable)
      .values([
        {
          ...testOrder,
          store_id: storeResult[0].id,
          rider_id: riderResult[0].id,
          total_amount: testOrder.total_amount.toString()
        },
        {
          ...testOrder,
          store_id: storeResult[0].id,
          rider_id: null,
          customer_name: 'Jane Customer',
          total_amount: '25.50'
        }
      ])
      .execute();

    const orders = await getOrders(undefined, riderResult[0].id);

    expect(orders).toHaveLength(1);
    expect(orders[0].rider_id).toEqual(riderResult[0].id);
    expect(orders[0].customer_name).toEqual('John Customer');
    expect(orders[0].total_amount).toEqual(21.00);
  });

  it('should filter orders by both store_id and rider_id', async () => {
    // Create user, rider, and stores
    const userResult = await db.insert(usersTable)
      .values({
        ...testUser,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const riderResult = await db.insert(usersTable)
      .values({
        ...testRider,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const storeResults = await db.insert(storesTable)
      .values([
        {
          ...testStore,
          owner_id: userResult[0].id,
          name: 'Store 1',
          latitude: testStore.latitude?.toString() || null,
          longitude: testStore.longitude?.toString() || null
        },
        {
          ...testStore,
          owner_id: userResult[0].id,
          name: 'Store 2',
          latitude: testStore.latitude?.toString() || null,
          longitude: testStore.longitude?.toString() || null
        }
      ])
      .returning()
      .execute();

    // Create orders with different combinations
    await db.insert(ordersTable)
      .values([
        {
          ...testOrder,
          store_id: storeResults[0].id,
          rider_id: riderResult[0].id,
          customer_name: 'Match Customer',
          total_amount: testOrder.total_amount.toString()
        },
        {
          ...testOrder,
          store_id: storeResults[1].id,
          rider_id: riderResult[0].id,
          customer_name: 'Wrong Store',
          total_amount: '25.50'
        },
        {
          ...testOrder,
          store_id: storeResults[0].id,
          rider_id: null,
          customer_name: 'No Rider',
          total_amount: '30.00'
        }
      ])
      .execute();

    const orders = await getOrders(storeResults[0].id, riderResult[0].id);

    expect(orders).toHaveLength(1);
    expect(orders[0].store_id).toEqual(storeResults[0].id);
    expect(orders[0].rider_id).toEqual(riderResult[0].id);
    expect(orders[0].customer_name).toEqual('Match Customer');
    expect(orders[0].total_amount).toEqual(21.00);
  });

  it('should return empty array when no orders match filters', async () => {
    // Create user and store
    const userResult = await db.insert(usersTable)
      .values({
        ...testUser,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const storeResult = await db.insert(storesTable)
      .values({
        ...testStore,
        owner_id: userResult[0].id,
        latitude: testStore.latitude?.toString() || null,
        longitude: testStore.longitude?.toString() || null
      })
      .returning()
      .execute();

    // Create an order
    await db.insert(ordersTable)
      .values({
        ...testOrder,
        store_id: storeResult[0].id,
        total_amount: testOrder.total_amount.toString()
      })
      .execute();

    // Filter by non-existent store
    const orders = await getOrders(999);

    expect(orders).toHaveLength(0);
  });

  it('should handle orders with all fields populated', async () => {
    // Create user, rider, and store
    const userResult = await db.insert(usersTable)
      .values({
        ...testUser,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const riderResult = await db.insert(usersTable)
      .values({
        ...testRider,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const storeResult = await db.insert(storesTable)
      .values({
        ...testStore,
        owner_id: userResult[0].id,
        latitude: testStore.latitude?.toString() || null,
        longitude: testStore.longitude?.toString() || null
      })
      .returning()
      .execute();

    // Create order with all fields
    await db.insert(ordersTable)
      .values({
        store_id: storeResult[0].id,
        rider_id: riderResult[0].id,
        customer_name: 'Full Customer',
        customer_phone: '1234567890',
        total_amount: '99.99',
        status: 'in_progress',
        order_items: '[{"id":1,"name":"Item","quantity":1,"price":99.99}]'
      })
      .execute();

    const orders = await getOrders();

    expect(orders).toHaveLength(1);
    expect(orders[0].store_id).toEqual(storeResult[0].id);
    expect(orders[0].rider_id).toEqual(riderResult[0].id);
    expect(orders[0].customer_name).toEqual('Full Customer');
    expect(orders[0].customer_phone).toEqual('1234567890');
    expect(orders[0].total_amount).toEqual(99.99);
    expect(orders[0].status).toEqual('in_progress');
    expect(orders[0].order_items).toEqual('[{"id":1,"name":"Item","quantity":1,"price":99.99}]');
    expect(orders[0].id).toBeDefined();
    expect(orders[0].created_at).toBeInstanceOf(Date);
    expect(orders[0].updated_at).toBeInstanceOf(Date);
  });
});
