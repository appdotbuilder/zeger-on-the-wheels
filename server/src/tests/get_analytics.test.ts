
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, storesTable, ordersTable, salesTransactionsTable } from '../db/schema';
import { type AnalyticsInput } from '../schema';
import { getAnalytics } from '../handlers/get_analytics';

describe('getAnalytics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return analytics for a store with no data', async () => {
    // Create user and store
    const user = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hash',
        first_name: 'Store',
        last_name: 'Owner',
        role: 'store_staff'
      })
      .returning()
      .execute();

    const store = await db.insert(storesTable)
      .values({
        owner_id: user[0].id,
        name: 'Test Store',
        address: '123 Test St',
        operating_hours: '{"monday": "9-17"}'
      })
      .returning()
      .execute();

    const input: AnalyticsInput = {
      store_id: store[0].id,
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getAnalytics(input);

    expect(result.totalSales).toEqual(0);
    expect(result.totalOrders).toEqual(0);
    expect(result.averageOrderValue).toEqual(0);
    expect(result.bestSellingItems).toEqual([]);
    expect(result.salesByDay).toEqual([]);
    expect(result.revenueByRider).toEqual([]);
    expect(result.inventoryTurnover).toEqual([]);
  });

  it('should calculate analytics with sales data', async () => {
    // Create user, store, rider
    const owner = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hash',
        first_name: 'Store',
        last_name: 'Owner',
        role: 'store_staff'
      })
      .returning()
      .execute();

    const rider = await db.insert(usersTable)
      .values({
        email: 'rider@test.com',
        password_hash: 'hash',
        first_name: 'Test',
        last_name: 'Rider',
        role: 'rider_seller'
      })
      .returning()
      .execute();

    const store = await db.insert(storesTable)
      .values({
        owner_id: owner[0].id,
        name: 'Test Store',
        address: '123 Test St',
        operating_hours: '{"monday": "9-17"}'
      })
      .returning()
      .execute();

    // Create orders
    const order1 = await db.insert(ordersTable)
      .values({
        store_id: store[0].id,
        rider_id: rider[0].id,
        customer_name: 'Customer 1',
        total_amount: '50.00',
        order_items: JSON.stringify([
          { product_name: 'Product A', quantity: 2, price: 15.00 },
          { product_name: 'Product B', quantity: 1, price: 20.00 }
        ]),
        status: 'completed'
      })
      .returning()
      .execute();

    const order2 = await db.insert(ordersTable)
      .values({
        store_id: store[0].id,
        rider_id: rider[0].id,
        customer_name: 'Customer 2',
        total_amount: '30.00',
        order_items: JSON.stringify([
          { product_name: 'Product A', quantity: 1, price: 15.00 },
          { product_name: 'Product C', quantity: 1, price: 15.00 }
        ]),
        status: 'completed'
      })
      .returning()
      .execute();

    // Create sales transactions
    const transactionDate = new Date('2024-01-15');
    
    await db.insert(salesTransactionsTable)
      .values({
        order_id: order1[0].id,
        store_id: store[0].id,
        rider_id: rider[0].id,
        amount: '50.00',
        payment_method: 'cash',
        transaction_date: transactionDate
      })
      .execute();

    await db.insert(salesTransactionsTable)
      .values({
        order_id: order2[0].id,
        store_id: store[0].id,
        rider_id: rider[0].id,
        amount: '30.00',
        payment_method: 'cash',
        transaction_date: transactionDate
      })
      .execute();

    const input: AnalyticsInput = {
      store_id: store[0].id,
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getAnalytics(input);

    // Basic calculations
    expect(result.totalSales).toEqual(80);
    expect(result.totalOrders).toEqual(2);
    expect(result.averageOrderValue).toEqual(40);

    // Best selling items
    expect(result.bestSellingItems).toHaveLength(3);
    expect(result.bestSellingItems[0].product_name).toEqual('Product A');
    expect(result.bestSellingItems[0].total_quantity).toEqual(3);
    expect(result.bestSellingItems[0].total_revenue).toEqual(45);

    // Sales by day
    expect(result.salesByDay).toHaveLength(1);
    expect(result.salesByDay[0].total_sales).toEqual(80);
    expect(result.salesByDay[0].order_count).toEqual(2);

    // Revenue by rider
    expect(result.revenueByRider).toHaveLength(1);
    expect(result.revenueByRider[0].rider_name).toEqual('Test Rider');
    expect(result.revenueByRider[0].total_revenue).toEqual(80);
    expect(result.revenueByRider[0].order_count).toEqual(2);

    // Inventory turnover
    expect(result.inventoryTurnover).toHaveLength(3);
    expect(result.inventoryTurnover[0].product_name).toEqual('Product A');
    expect(result.inventoryTurnover[0].turnover_rate).toEqual(3);
  });

  it('should filter by date range correctly', async () => {
    // Create user, store, rider
    const owner = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hash',
        first_name: 'Store',
        last_name: 'Owner',
        role: 'store_staff'
      })
      .returning()
      .execute();

    const rider = await db.insert(usersTable)
      .values({
        email: 'rider@test.com',
        password_hash: 'hash',
        first_name: 'Test',
        last_name: 'Rider',
        role: 'rider_seller'
      })
      .returning()
      .execute();

    const store = await db.insert(storesTable)
      .values({
        owner_id: owner[0].id,
        name: 'Test Store',
        address: '123 Test St',
        operating_hours: '{"monday": "9-17"}'
      })
      .returning()
      .execute();

    // Create orders - one in range, one out of range
    const order1 = await db.insert(ordersTable)
      .values({
        store_id: store[0].id,
        rider_id: rider[0].id,
        customer_name: 'Customer 1',
        total_amount: '50.00',
        order_items: JSON.stringify([{ product_name: 'Product A', quantity: 1, price: 50.00 }]),
        status: 'completed'
      })
      .returning()
      .execute();

    const order2 = await db.insert(ordersTable)
      .values({
        store_id: store[0].id,
        rider_id: rider[0].id,
        customer_name: 'Customer 2',
        total_amount: '30.00',
        order_items: JSON.stringify([{ product_name: 'Product B', quantity: 1, price: 30.00 }]),
        status: 'completed'
      })
      .returning()
      .execute();

    // Create transactions - one in January, one in February
    await db.insert(salesTransactionsTable)
      .values({
        order_id: order1[0].id,
        store_id: store[0].id,
        rider_id: rider[0].id,
        amount: '50.00',
        payment_method: 'cash',
        transaction_date: new Date('2024-01-15')
      })
      .execute();

    await db.insert(salesTransactionsTable)
      .values({
        order_id: order2[0].id,
        store_id: store[0].id,
        rider_id: rider[0].id,
        amount: '30.00',
        payment_method: 'cash',
        transaction_date: new Date('2024-02-15')
      })
      .execute();

    // Query only January data
    const input: AnalyticsInput = {
      store_id: store[0].id,
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getAnalytics(input);

    // Should only include January transaction
    expect(result.totalSales).toEqual(50);
    expect(result.totalOrders).toEqual(1);
    expect(result.revenueByRider[0].total_revenue).toEqual(50);
    expect(result.bestSellingItems).toHaveLength(1);
    expect(result.bestSellingItems[0].product_name).toEqual('Product A');
  });

  it('should throw error for non-existent store', async () => {
    const input: AnalyticsInput = {
      store_id: 999,
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    expect(getAnalytics(input)).rejects.toThrow(/store not found/i);
  });
});
