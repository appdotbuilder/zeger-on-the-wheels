
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storesTable, usersTable } from '../db/schema';
import { type CreateStoreInput } from '../schema';
import { createStore } from '../handlers/create_store';
import { eq } from 'drizzle-orm';

// Create test user first
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      email: 'test@example.com',
      password_hash: 'hashedpassword123',
      first_name: 'Test',
      last_name: 'User',
      phone: '+1234567890',
      role: 'store_staff'
    })
    .returning()
    .execute();
  return result[0];
};

// Test input with all fields
const testInput: CreateStoreInput = {
  name: 'Test Store',
  description: 'A store for testing',
  address: '123 Test Street, Test City',
  latitude: 40.7128,
  longitude: -74.0060,
  phone: '+1234567890',
  operating_hours: '{"monday": "9:00-17:00", "tuesday": "9:00-17:00"}'
};

describe('createStore', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a store with all fields', async () => {
    const user = await createTestUser();
    const result = await createStore(testInput, user.id);

    // Basic field validation
    expect(result.name).toEqual('Test Store');
    expect(result.description).toEqual(testInput.description);
    expect(result.address).toEqual(testInput.address);
    expect(result.latitude).toEqual(40.7128);
    expect(result.longitude).toEqual(-74.0060);
    expect(result.phone).toEqual(testInput.phone);
    expect(result.operating_hours).toEqual(testInput.operating_hours);
    expect(result.owner_id).toEqual(user.id);
    expect(result.status).toEqual('pending_verification');
    expect(result.is_verified).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a store with null coordinates', async () => {
    const user = await createTestUser();
    const inputWithoutCoords = {
      ...testInput,
      latitude: null,
      longitude: null
    };

    const result = await createStore(inputWithoutCoords, user.id);

    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    expect(result.name).toEqual('Test Store');
    expect(result.address).toEqual(testInput.address);
  });

  it('should save store to database', async () => {
    const user = await createTestUser();
    const result = await createStore(testInput, user.id);

    // Query using proper drizzle syntax
    const stores = await db.select()
      .from(storesTable)
      .where(eq(storesTable.id, result.id))
      .execute();

    expect(stores).toHaveLength(1);
    expect(stores[0].name).toEqual('Test Store');
    expect(stores[0].description).toEqual(testInput.description);
    expect(stores[0].address).toEqual(testInput.address);
    expect(stores[0].owner_id).toEqual(user.id);
    expect(stores[0].status).toEqual('pending_verification');
    expect(stores[0].is_verified).toEqual(false);
    expect(parseFloat(stores[0].latitude!)).toEqual(40.7128);
    expect(parseFloat(stores[0].longitude!)).toEqual(-74.0060);
    expect(stores[0].created_at).toBeInstanceOf(Date);
    expect(stores[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create store with minimal required fields', async () => {
    const user = await createTestUser();
    const minimalInput: CreateStoreInput = {
      name: 'Minimal Store',
      description: null,
      address: '456 Minimal Street',
      latitude: null,
      longitude: null,
      phone: null,
      operating_hours: '{}'
    };

    const result = await createStore(minimalInput, user.id);

    expect(result.name).toEqual('Minimal Store');
    expect(result.description).toBeNull();
    expect(result.address).toEqual('456 Minimal Street');
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.operating_hours).toEqual('{}');
    expect(result.status).toEqual('pending_verification');
    expect(result.is_verified).toEqual(false);
  });

  it('should handle numeric conversion correctly', async () => {
    const user = await createTestUser();
    const result = await createStore(testInput, user.id);

    // Verify numeric types are correctly converted
    expect(typeof result.latitude).toBe('number');
    expect(typeof result.longitude).toBe('number');
    expect(result.latitude).toEqual(40.7128);
    expect(result.longitude).toEqual(-74.0060);
  });
});
