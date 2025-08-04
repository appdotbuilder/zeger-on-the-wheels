
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storesTable, usersTable } from '../db/schema';
import { type UpdateStoreInput } from '../schema';
import { updateStore } from '../handlers/update_store';
import { eq } from 'drizzle-orm';

describe('updateStore', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testStoreId: number;

  beforeEach(async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Store',
        last_name: 'Owner',
        phone: '+1234567890',
        role: 'store_staff'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;

    // Create test store
    const storeResult = await db.insert(storesTable)
      .values({
        owner_id: testUserId,
        name: 'Original Store',
        description: 'Original description',
        address: 'Original Address',
        latitude: '40.7128',
        longitude: '-74.0060',
        phone: '+1111111111',
        operating_hours: JSON.stringify({ mon: '9-17', tue: '9-17' }),
        status: 'open'
      })
      .returning()
      .execute();

    testStoreId = storeResult[0].id;
  });

  it('should update store with all fields', async () => {
    const updateInput: UpdateStoreInput = {
      id: testStoreId,
      name: 'Updated Store Name',
      description: 'Updated description',
      address: 'Updated Address',
      latitude: 41.8781,
      longitude: -87.6298,
      phone: '+2222222222',
      operating_hours: JSON.stringify({ mon: '8-18', tue: '8-18' }),
      status: 'closed'
    };

    const result = await updateStore(updateInput);

    expect(result.id).toEqual(testStoreId);
    expect(result.name).toEqual('Updated Store Name');
    expect(result.description).toEqual('Updated description');
    expect(result.address).toEqual('Updated Address');
    expect(result.latitude).toEqual(41.8781);
    expect(result.longitude).toEqual(-87.6298);
    expect(result.phone).toEqual('+2222222222');
    expect(result.operating_hours).toEqual(JSON.stringify({ mon: '8-18', tue: '8-18' }));
    expect(result.status).toEqual('closed');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update store with partial fields', async () => {
    const updateInput: UpdateStoreInput = {
      id: testStoreId,
      name: 'Partially Updated Store',
      status: 'suspended'
    };

    const result = await updateStore(updateInput);

    expect(result.id).toEqual(testStoreId);
    expect(result.name).toEqual('Partially Updated Store');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.address).toEqual('Original Address'); // Should remain unchanged
    expect(result.status).toEqual('suspended');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update store in database', async () => {
    const updateInput: UpdateStoreInput = {
      id: testStoreId,
      name: 'Database Updated Store',
      latitude: 34.0522,
      longitude: -118.2437
    };

    await updateStore(updateInput);

    const stores = await db.select()
      .from(storesTable)
      .where(eq(storesTable.id, testStoreId))
      .execute();

    expect(stores).toHaveLength(1);
    expect(stores[0].name).toEqual('Database Updated Store');
    expect(parseFloat(stores[0].latitude!)).toEqual(34.0522);
    expect(parseFloat(stores[0].longitude!)).toEqual(-118.2437);
    expect(stores[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null coordinate values', async () => {
    const updateInput: UpdateStoreInput = {
      id: testStoreId,
      latitude: null,
      longitude: null,
      description: null
    };

    const result = await updateStore(updateInput);

    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    expect(result.description).toBeNull();
    
    // Verify in database as well
    const stores = await db.select()
      .from(storesTable)
      .where(eq(storesTable.id, testStoreId))
      .execute();
    
    expect(stores[0].latitude).toBeNull();
    expect(stores[0].longitude).toBeNull();
    expect(stores[0].description).toBeNull();
  });

  it('should throw error for non-existent store', async () => {
    const updateInput: UpdateStoreInput = {
      id: 999999,
      name: 'Non-existent Store'
    };

    expect(updateStore(updateInput)).rejects.toThrow(/store with id 999999 not found/i);
  });

  it('should preserve unchanged fields', async () => {
    const updateInput: UpdateStoreInput = {
      id: testStoreId,
      phone: '+3333333333'
    };

    const result = await updateStore(updateInput);

    // Check that other fields remain unchanged
    expect(result.name).toEqual('Original Store');
    expect(result.description).toEqual('Original description');
    expect(result.address).toEqual('Original Address');
    expect(result.phone).toEqual('+3333333333'); // Only this should change
    expect(result.status).toEqual('open');
  });
});
