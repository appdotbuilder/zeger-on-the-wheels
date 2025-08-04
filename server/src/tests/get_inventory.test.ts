
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, storesTable, productsTable, inventoryTable } from '../db/schema';
import { getInventory } from '../handlers/get_inventory';

describe('getInventory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all inventory when no filters provided', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hash',
        first_name: 'Owner',
        last_name: 'User',
        role: 'store_staff'
      })
      .returning()
      .execute();

    const storeResult = await db.insert(storesTable)
      .values({
        owner_id: userResult[0].id,
        name: 'Test Store',
        address: '123 Test St',
        operating_hours: '{"mon": "9-5"}'
      })
      .returning()
      .execute();

    const productResult = await db.insert(productsTable)
      .values({
        store_id: storeResult[0].id,
        name: 'Test Product',
        price: '19.99',
        category: 'test'
      })
      .returning()
      .execute();

    // Create inventory records
    await db.insert(inventoryTable)
      .values([
        {
          product_id: productResult[0].id,
          store_id: storeResult[0].id,
          stock_quantity: 100,
          allocated_quantity: 20,
          remaining_quantity: 80,
          date: new Date()
        },
        {
          product_id: productResult[0].id,
          store_id: storeResult[0].id,
          stock_quantity: 50,
          allocated_quantity: 10,
          remaining_quantity: 40,
          date: new Date()
        }
      ])
      .execute();

    const result = await getInventory();

    expect(result).toHaveLength(2);
    expect(result[0].stock_quantity).toEqual(100);
    expect(result[0].allocated_quantity).toEqual(20);
    expect(result[0].remaining_quantity).toEqual(80);
    expect(result[0].product_id).toEqual(productResult[0].id);
    expect(result[0].store_id).toEqual(storeResult[0].id);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].date).toBeInstanceOf(Date);
  });

  it('should filter inventory by store_id', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hash',
        first_name: 'Owner',
        last_name: 'User',
        role: 'store_staff'
      })
      .returning()
      .execute();

    const storeResults = await db.insert(storesTable)
      .values([
        {
          owner_id: userResult[0].id,
          name: 'Store 1',
          address: '123 Test St',
          operating_hours: '{"mon": "9-5"}'
        },
        {
          owner_id: userResult[0].id,
          name: 'Store 2',
          address: '456 Test Ave',
          operating_hours: '{"mon": "9-5"}'
        }
      ])
      .returning()
      .execute();

    const productResults = await db.insert(productsTable)
      .values([
        {
          store_id: storeResults[0].id,
          name: 'Product 1',
          price: '19.99',
          category: 'test'
        },
        {
          store_id: storeResults[1].id,
          name: 'Product 2',
          price: '29.99',
          category: 'test'
        }
      ])
      .returning()
      .execute();

    // Create inventory for both stores
    await db.insert(inventoryTable)
      .values([
        {
          product_id: productResults[0].id,
          store_id: storeResults[0].id,
          stock_quantity: 100,
          allocated_quantity: 0,
          remaining_quantity: 100,
          date: new Date()
        },
        {
          product_id: productResults[1].id,
          store_id: storeResults[1].id,
          stock_quantity: 200,
          allocated_quantity: 0,
          remaining_quantity: 200,
          date: new Date()
        }
      ])
      .execute();

    const result = await getInventory(storeResults[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].store_id).toEqual(storeResults[0].id);
    expect(result[0].stock_quantity).toEqual(100);
  });

  it('should filter inventory by rider_id', async () => {
    // Create prerequisite data
    const userResults = await db.insert(usersTable)
      .values([
        {
          email: 'owner@test.com',
          password_hash: 'hash',
          first_name: 'Owner',
          last_name: 'User',
          role: 'store_staff'
        },
        {
          email: 'rider@test.com',
          password_hash: 'hash',
          first_name: 'Rider',
          last_name: 'User',
          role: 'rider_seller'
        }
      ])
      .returning()
      .execute();

    const storeResult = await db.insert(storesTable)
      .values({
        owner_id: userResults[0].id,
        name: 'Test Store',
        address: '123 Test St',
        operating_hours: '{"mon": "9-5"}'
      })
      .returning()
      .execute();

    const productResult = await db.insert(productsTable)
      .values({
        store_id: storeResult[0].id,
        name: 'Test Product',
        price: '19.99',
        category: 'test'
      })
      .returning()
      .execute();

    // Create inventory records with different riders
    await db.insert(inventoryTable)
      .values([
        {
          product_id: productResult[0].id,
          store_id: storeResult[0].id,
          rider_id: userResults[1].id,
          stock_quantity: 50,
          allocated_quantity: 0,
          remaining_quantity: 50,
          date: new Date()
        },
        {
          product_id: productResult[0].id,
          store_id: storeResult[0].id,
          rider_id: null,
          stock_quantity: 75,
          allocated_quantity: 0,
          remaining_quantity: 75,
          date: new Date()
        }
      ])
      .execute();

    const result = await getInventory(undefined, userResults[1].id);

    expect(result).toHaveLength(1);
    expect(result[0].rider_id).toEqual(userResults[1].id);
    expect(result[0].stock_quantity).toEqual(50);
  });

  it('should filter by both store_id and rider_id', async () => {
    // Create prerequisite data
    const userResults = await db.insert(usersTable)
      .values([
        {
          email: 'owner@test.com',
          password_hash: 'hash',
          first_name: 'Owner',
          last_name: 'User',
          role: 'store_staff'
        },
        {
          email: 'rider1@test.com',
          password_hash: 'hash',
          first_name: 'Rider',
          last_name: 'One',
          role: 'rider_seller'
        },
        {
          email: 'rider2@test.com',
          password_hash: 'hash',
          first_name: 'Rider',
          last_name: 'Two',
          role: 'rider_seller'
        }
      ])
      .returning()
      .execute();

    const storeResults = await db.insert(storesTable)
      .values([
        {
          owner_id: userResults[0].id,
          name: 'Store 1',
          address: '123 Test St',
          operating_hours: '{"mon": "9-5"}'
        },
        {
          owner_id: userResults[0].id,
          name: 'Store 2',
          address: '456 Test Ave',
          operating_hours: '{"mon": "9-5"}'
        }
      ])
      .returning()
      .execute();

    const productResults = await db.insert(productsTable)
      .values([
        {
          store_id: storeResults[0].id,
          name: 'Product 1',
          price: '19.99',
          category: 'test'
        },
        {
          store_id: storeResults[1].id,
          name: 'Product 2',
          price: '29.99',
          category: 'test'
        }
      ])
      .returning()
      .execute();

    // Create multiple inventory records
    await db.insert(inventoryTable)
      .values([
        {
          product_id: productResults[0].id,
          store_id: storeResults[0].id,
          rider_id: userResults[1].id,
          stock_quantity: 30,
          allocated_quantity: 0,
          remaining_quantity: 30,
          date: new Date()
        },
        {
          product_id: productResults[0].id,
          store_id: storeResults[0].id,
          rider_id: userResults[2].id,
          stock_quantity: 40,
          allocated_quantity: 0,
          remaining_quantity: 40,
          date: new Date()
        },
        {
          product_id: productResults[1].id,
          store_id: storeResults[1].id,
          rider_id: userResults[1].id,
          stock_quantity: 60,
          allocated_quantity: 0,
          remaining_quantity: 60,
          date: new Date()
        }
      ])
      .execute();

    const result = await getInventory(storeResults[0].id, userResults[1].id);

    expect(result).toHaveLength(1);
    expect(result[0].store_id).toEqual(storeResults[0].id);
    expect(result[0].rider_id).toEqual(userResults[1].id);
    expect(result[0].stock_quantity).toEqual(30);
  });

  it('should return empty array when no matching inventory found', async () => {
    const result = await getInventory(999);

    expect(result).toHaveLength(0);
  });
});
