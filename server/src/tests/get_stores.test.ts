
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, storesTable } from '../db/schema';
import { type RegisterUserInput, type CreateStoreInput } from '../schema';
import { getStores } from '../handlers/get_stores';

describe('getStores', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all stores when no userId provided', async () => {
    // Create test users
    const adminUser = await db.insert(usersTable).values({
      email: 'admin@test.com',
      password_hash: 'hashed_password',
      first_name: 'Admin',
      last_name: 'User',
      phone: null,
      role: 'administrator'
    }).returning().execute();

    const storeOwner = await db.insert(usersTable).values({
      email: 'owner@test.com',
      password_hash: 'hashed_password',
      first_name: 'Store',
      last_name: 'Owner',
      phone: null,
      role: 'store_staff'
    }).returning().execute();

    // Create test stores
    await db.insert(storesTable).values({
      owner_id: adminUser[0].id,
      name: 'Admin Store',
      description: 'Store owned by admin',
      address: '123 Admin St',
      latitude: '40.7128',
      longitude: '-74.0060',
      phone: '+1234567890',
      operating_hours: '{"monday":"9-17","tuesday":"9-17"}'
    }).execute();

    await db.insert(storesTable).values({
      owner_id: storeOwner[0].id,
      name: 'Staff Store',
      description: 'Store owned by staff',
      address: '456 Staff Ave',
      latitude: '40.7589',
      longitude: '-73.9851',
      phone: '+0987654321',
      operating_hours: '{"monday":"8-18","tuesday":"8-18"}'
    }).execute();

    const result = await getStores();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Admin Store');
    expect(result[1].name).toEqual('Staff Store');
    
    // Verify numeric conversions
    expect(typeof result[0].latitude).toBe('number');
    expect(typeof result[0].longitude).toBe('number');
    expect(result[0].latitude).toEqual(40.7128);
    expect(result[0].longitude).toEqual(-74.0060);
  });

  it('should return all stores for administrator user', async () => {
    // Create admin user
    const adminUser = await db.insert(usersTable).values({
      email: 'admin@test.com',
      password_hash: 'hashed_password',
      first_name: 'Admin',
      last_name: 'User',
      phone: null,
      role: 'administrator'
    }).returning().execute();

    // Create another user
    const storeOwner = await db.insert(usersTable).values({
      email: 'owner@test.com',
      password_hash: 'hashed_password',
      first_name: 'Store',
      last_name: 'Owner',
      phone: null,
      role: 'store_staff'
    }).returning().execute();

    // Create stores for both users
    await db.insert(storesTable).values({
      owner_id: adminUser[0].id,
      name: 'Admin Store',
      description: 'Store owned by admin',
      address: '123 Admin St',
      operating_hours: '{"monday":"9-17"}'
    }).execute();

    await db.insert(storesTable).values({
      owner_id: storeOwner[0].id,
      name: 'Owner Store',
      description: 'Store owned by owner',
      address: '456 Owner Ave',
      operating_hours: '{"monday":"8-18"}'
    }).execute();

    const result = await getStores(adminUser[0].id);

    expect(result).toHaveLength(2);
    expect(result.map(s => s.name)).toContain('Admin Store');
    expect(result.map(s => s.name)).toContain('Owner Store');
  });

  it('should return only owned stores for store_staff user', async () => {
    // Create store staff user
    const staffUser = await db.insert(usersTable).values({
      email: 'staff@test.com',
      password_hash: 'hashed_password',
      first_name: 'Staff',
      last_name: 'User',
      phone: null,
      role: 'store_staff'
    }).returning().execute();

    // Create another user
    const otherUser = await db.insert(usersTable).values({
      email: 'other@test.com',
      password_hash: 'hashed_password',
      first_name: 'Other',
      last_name: 'User',
      phone: null,
      role: 'store_staff'
    }).returning().execute();

    // Create stores for both users
    await db.insert(storesTable).values({
      owner_id: staffUser[0].id,
      name: 'Staff Store',
      description: 'Store owned by staff',
      address: '123 Staff St',
      operating_hours: '{"monday":"9-17"}'
    }).execute();

    await db.insert(storesTable).values({
      owner_id: otherUser[0].id,
      name: 'Other Store',
      description: 'Store owned by other user',
      address: '456 Other Ave',
      operating_hours: '{"monday":"8-18"}'
    }).execute();

    const result = await getStores(staffUser[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Staff Store');
    expect(result[0].owner_id).toEqual(staffUser[0].id);
  });

  it('should return all stores for rider_seller user', async () => {
    // Create rider user
    const riderUser = await db.insert(usersTable).values({
      email: 'rider@test.com',
      password_hash: 'hashed_password',
      first_name: 'Rider',
      last_name: 'User',
      phone: null,
      role: 'rider_seller'
    }).returning().execute();

    // Create store owner
    const storeOwner = await db.insert(usersTable).values({
      email: 'owner@test.com',
      password_hash: 'hashed_password',
      first_name: 'Store',
      last_name: 'Owner',
      phone: null,
      role: 'store_staff'
    }).returning().execute();

    // Create stores
    await db.insert(storesTable).values({
      owner_id: storeOwner[0].id,
      name: 'Store One',
      description: 'First store',
      address: '123 First St',
      operating_hours: '{"monday":"9-17"}'
    }).execute();

    await db.insert(storesTable).values({
      owner_id: storeOwner[0].id,
      name: 'Store Two',
      description: 'Second store',
      address: '456 Second Ave',
      operating_hours: '{"monday":"8-18"}'
    }).execute();

    const result = await getStores(riderUser[0].id);

    expect(result).toHaveLength(2);
    expect(result.map(s => s.name)).toContain('Store One');
    expect(result.map(s => s.name)).toContain('Store Two');
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 99999;

    await expect(getStores(nonExistentUserId)).rejects.toThrow(/user not found/i);
  });

  it('should handle stores with null coordinates', async () => {
    // Create test user
    const user = await db.insert(usersTable).values({
      email: 'user@test.com',
      password_hash: 'hashed_password',
      first_name: 'Test',
      last_name: 'User',
      phone: null,
      role: 'administrator'
    }).returning().execute();

    // Create store with null coordinates
    await db.insert(storesTable).values({
      owner_id: user[0].id,
      name: 'Store Without Coordinates',
      description: 'Store with no location data',
      address: '123 Unknown St',
      latitude: null,
      longitude: null,
      operating_hours: '{"monday":"9-17"}'
    }).execute();

    const result = await getStores(user[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].latitude).toBeNull();
    expect(result[0].longitude).toBeNull();
  });
});
