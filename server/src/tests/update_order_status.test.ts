
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, storesTable, usersTable } from '../db/schema';
import { type UpdateOrderStatusInput, type CreateStoreInput, type RegisterUserInput } from '../schema';
import { updateOrderStatus } from '../handlers/update_order_status';
import { eq } from 'drizzle-orm';

describe('updateOrderStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testStoreId: number;
  let testRiderId: number;
  let testOrderId: number;

  beforeEach(async () => {
    // Create a test user (store owner)
    const ownerInput: RegisterUserInput = {
      email: 'owner@test.com',
      password: 'password123',
      first_name: 'Store',
      last_name: 'Owner',
      phone: '+1234567890',
      role: 'store_staff'
    };

    const [owner] = await db.insert(usersTable)
      .values({
        email: ownerInput.email,
        password_hash: 'hashed_password',
        first_name: ownerInput.first_name,
        last_name: ownerInput.last_name,
        phone: ownerInput.phone,
        role: ownerInput.role
      })
      .returning()
      .execute();

    // Create a test rider
    const riderInput: RegisterUserInput = {
      email: 'rider@test.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'Rider',
      phone: '+0987654321',
      role: 'rider_seller'
    };

    const [rider] = await db.insert(usersTable)
      .values({
        email: riderInput.email,
        password_hash: 'hashed_password',
        first_name: riderInput.first_name,
        last_name: riderInput.last_name,
        phone: riderInput.phone,
        role: riderInput.role
      })
      .returning()
      .execute();

    testRiderId = rider.id;

    // Create a test store
    const storeInput: CreateStoreInput = {
      name: 'Test Store',
      description: 'A test store',
      address: '123 Test St',
      latitude: null,
      longitude: null,
      phone: '+1234567890',
      operating_hours: '{"monday": "9:00-17:00"}'
    };

    const [store] = await db.insert(storesTable)
      .values({
        owner_id: owner.id,
        name: storeInput.name,
        description: storeInput.description,
        address: storeInput.address,
        latitude: storeInput.latitude?.toString(),
        longitude: storeInput.longitude?.toString(),
        phone: storeInput.phone,
        operating_hours: storeInput.operating_hours
      })
      .returning()
      .execute();

    testStoreId = store.id;

    // Create a test order
    const [order] = await db.insert(ordersTable)
      .values({
        store_id: testStoreId,
        rider_id: null,
        customer_name: 'John Customer',
        customer_phone: '+1234567890',
        total_amount: '25.50',
        status: 'new',
        order_items: JSON.stringify([
          { product_id: 1, quantity: 2, price: 12.75 }
        ])
      })
      .returning()
      .execute();

    testOrderId = order.id;
  });

  it('should update order status without assigning rider', async () => {
    const input: UpdateOrderStatusInput = {
      id: testOrderId,
      status: 'in_progress'
    };

    const result = await updateOrderStatus(input);

    expect(result.id).toEqual(testOrderId);
    expect(result.status).toEqual('in_progress');
    expect(result.store_id).toEqual(testStoreId);
    expect(result.rider_id).toBeNull();
    expect(result.customer_name).toEqual('John Customer');
    expect(result.customer_phone).toEqual('+1234567890');
    expect(result.total_amount).toEqual(25.50);
    expect(typeof result.total_amount).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update order status and assign rider', async () => {
    const input: UpdateOrderStatusInput = {
      id: testOrderId,
      status: 'in_progress',
      rider_id: testRiderId
    };

    const result = await updateOrderStatus(input);

    expect(result.id).toEqual(testOrderId);
    expect(result.status).toEqual('in_progress');
    expect(result.rider_id).toEqual(testRiderId);
    expect(result.store_id).toEqual(testStoreId);
    expect(result.total_amount).toEqual(25.50);
    expect(typeof result.total_amount).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update order status and unassign rider', async () => {
    // First assign a rider
    await db.update(ordersTable)
      .set({ rider_id: testRiderId })
      .where(eq(ordersTable.id, testOrderId))
      .execute();

    const input: UpdateOrderStatusInput = {
      id: testOrderId,
      status: 'cancelled',
      rider_id: null
    };

    const result = await updateOrderStatus(input);

    expect(result.id).toEqual(testOrderId);
    expect(result.status).toEqual('cancelled');
    expect(result.rider_id).toBeNull();
    expect(result.total_amount).toEqual(25.50);
    expect(typeof result.total_amount).toBe('number');
  });

  it('should save updated order to database', async () => {
    const input: UpdateOrderStatusInput = {
      id: testOrderId,
      status: 'completed',
      rider_id: testRiderId
    };

    await updateOrderStatus(input);

    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, testOrderId))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].status).toEqual('completed');
    expect(orders[0].rider_id).toEqual(testRiderId);
    expect(parseFloat(orders[0].total_amount)).toEqual(25.50);
    expect(orders[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent order', async () => {
    const input: UpdateOrderStatusInput = {
      id: 99999,
      status: 'completed'
    };

    expect(updateOrderStatus(input)).rejects.toThrow(/order with id 99999 not found/i);
  });

  it('should handle all valid status transitions', async () => {
    const statuses = ['new', 'in_progress', 'completed', 'cancelled'] as const;

    for (const status of statuses) {
      const input: UpdateOrderStatusInput = {
        id: testOrderId,
        status: status
      };

      const result = await updateOrderStatus(input);
      expect(result.status).toEqual(status);

      // Verify in database
      const orders = await db.select()
        .from(ordersTable)
        .where(eq(ordersTable.id, testOrderId))
        .execute();

      expect(orders[0].status).toEqual(status);
    }
  });
});
