
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, storesTable, stockVerificationTable } from '../db/schema';
import { getStockVerifications } from '../handlers/get_stock_verifications';
import { eq } from 'drizzle-orm';

describe('getStockVerifications', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser1: any;
  let testUser2: any;
  let testStore1: any;
  let testStore2: any;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'rider1@test.com',
          password_hash: 'hash123',
          first_name: 'John',
          last_name: 'Rider',
          role: 'rider_seller'
        },
        {
          email: 'rider2@test.com',
          password_hash: 'hash456',
          first_name: 'Jane',
          last_name: 'Rider',
          role: 'rider_seller'
        }
      ])
      .returning()
      .execute();

    testUser1 = users[0];
    testUser2 = users[1];

    // Create test stores
    const stores = await db.insert(storesTable)
      .values([
        {
          owner_id: testUser1.id,
          name: 'Store 1',
          address: '123 Test St',
          operating_hours: '{"mon": "9-17"}'
        },
        {
          owner_id: testUser2.id,
          name: 'Store 2',
          address: '456 Test Ave',
          operating_hours: '{"tue": "10-18"}'
        }
      ])
      .returning()
      .execute();

    testStore1 = stores[0];
    testStore2 = stores[1];

    // Create test stock verifications
    await db.insert(stockVerificationTable)
      .values([
        {
          rider_id: testUser1.id,
          store_id: testStore1.id,
          verification_type: 'start_day',
          stock_data: '{"item1": 10, "item2": 5}',
          status: 'pending'
        },
        {
          rider_id: testUser1.id,
          store_id: testStore2.id,
          verification_type: 'end_day',
          stock_data: '{"item1": 8, "item2": 3}',
          status: 'confirmed'
        },
        {
          rider_id: testUser2.id,
          store_id: testStore1.id,
          verification_type: 'restock',
          stock_data: '{"item3": 15}',
          status: 'disputed'
        }
      ])
      .execute();
  });

  it('should return all stock verifications when no filters provided', async () => {
    const result = await getStockVerifications();

    expect(result).toHaveLength(3);
    expect(result[0].rider_id).toBeDefined();
    expect(result[0].store_id).toBeDefined();
    expect(result[0].verification_type).toBeDefined();
    expect(result[0].stock_data).toBeDefined();
    expect(result[0].status).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter by store ID', async () => {
    const result = await getStockVerifications(testStore1.id);

    expect(result).toHaveLength(2);
    result.forEach(verification => {
      expect(verification.store_id).toEqual(testStore1.id);
    });
  });

  it('should filter by rider ID', async () => {
    const result = await getStockVerifications(undefined, testUser1.id);

    expect(result).toHaveLength(2);
    result.forEach(verification => {
      expect(verification.rider_id).toEqual(testUser1.id);
    });
  });

  it('should filter by both store ID and rider ID', async () => {
    const result = await getStockVerifications(testStore1.id, testUser1.id);

    expect(result).toHaveLength(1);
    expect(result[0].store_id).toEqual(testStore1.id);
    expect(result[0].rider_id).toEqual(testUser1.id);
    expect(result[0].verification_type).toEqual('start_day');
  });

  it('should return empty array when no matches found', async () => {
    const result = await getStockVerifications(999, 999);

    expect(result).toHaveLength(0);
  });

  it('should save verifications to database correctly', async () => {
    await getStockVerifications();

    // Verify data in database
    const dbVerifications = await db.select()
      .from(stockVerificationTable)
      .where(eq(stockVerificationTable.rider_id, testUser1.id))
      .execute();

    expect(dbVerifications).toHaveLength(2);
    expect(dbVerifications[0].stock_data).toEqual('{"item1": 10, "item2": 5}');
    expect(dbVerifications[0].verification_type).toEqual('start_day');
    expect(dbVerifications[0].status).toEqual('pending');
  });
});
