
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stockVerificationTable, usersTable, storesTable } from '../db/schema';
import { type CreateStockVerificationInput } from '../schema';
import { createStockVerification } from '../handlers/create_stock_verification';
import { eq } from 'drizzle-orm';

describe('createStockVerification', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let riderId: number;
  let storeId: number;
  let adminId: number;

  beforeEach(async () => {
    // Create prerequisite data - admin user for store owner
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        phone: '+1234567890',
        role: 'administrator'
      })
      .returning()
      .execute();
    adminId = adminResult[0].id;

    // Create rider user
    const riderResult = await db.insert(usersTable)
      .values({
        email: 'rider@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Rider',
        phone: '+1234567891',
        role: 'rider_seller'
      })
      .returning()
      .execute();
    riderId = riderResult[0].id;

    // Create store
    const storeResult = await db.insert(storesTable)
      .values({
        owner_id: adminId,
        name: 'Test Store',
        description: 'A store for testing',
        address: '123 Test Street',
        latitude: '40.7128',
        longitude: '-74.0060',
        phone: '+1234567892',
        operating_hours: '{"monday": "9:00-17:00", "tuesday": "9:00-17:00"}'
      })
      .returning()
      .execute();
    storeId = storeResult[0].id;
  });

  const createValidInput = (): CreateStockVerificationInput => ({
    rider_id: riderId,
    store_id: storeId,
    verification_type: 'start_day',
    stock_data: '{"items": [{"product_id": 1, "quantity": 100}]}',
    photo_urls: '["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]',
    cash_deposit_photo: 'https://example.com/cash_deposit.jpg',
    notes: 'Initial stock verification for the day'
  });

  it('should create a stock verification with start_day type', async () => {
    const input = createValidInput();
    const result = await createStockVerification(input);

    expect(result.rider_id).toEqual(riderId);
    expect(result.store_id).toEqual(storeId);
    expect(result.verification_type).toEqual('start_day');
    expect(result.stock_data).toEqual('{"items": [{"product_id": 1, "quantity": 100}]}');
    expect(result.photo_urls).toEqual('["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]');
    expect(result.cash_deposit_photo).toEqual('https://example.com/cash_deposit.jpg');
    expect(result.status).toEqual('pending');
    expect(result.verified_by).toBeNull();
    expect(result.notes).toEqual('Initial stock verification for the day');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a stock verification with end_day type', async () => {
    const input = createValidInput();
    input.verification_type = 'end_day';
    input.notes = 'End of day stock verification';

    const result = await createStockVerification(input);

    expect(result.verification_type).toEqual('end_day');
    expect(result.notes).toEqual('End of day stock verification');
    expect(result.status).toEqual('pending');
  });

  it('should create a stock verification with restock type', async () => {
    const input = createValidInput();
    input.verification_type = 'restock';
    input.stock_data = '{"items": [{"product_id": 1, "quantity": 50, "restocked": true}]}';
    input.notes = 'Restock verification';

    const result = await createStockVerification(input);

    expect(result.verification_type).toEqual('restock');
    expect(result.stock_data).toEqual('{"items": [{"product_id": 1, "quantity": 50, "restocked": true}]}');
    expect(result.notes).toEqual('Restock verification');
  });

  it('should create stock verification with null optional fields', async () => {
    const input: CreateStockVerificationInput = {
      rider_id: riderId,
      store_id: storeId,
      verification_type: 'start_day',
      stock_data: '{"items": []}',
      photo_urls: null,
      cash_deposit_photo: null,
      notes: null
    };

    const result = await createStockVerification(input);

    expect(result.photo_urls).toBeNull();
    expect(result.cash_deposit_photo).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.stock_data).toEqual('{"items": []}');
  });

  it('should save stock verification to database', async () => {
    const input = createValidInput();
    const result = await createStockVerification(input);

    const stockVerifications = await db.select()
      .from(stockVerificationTable)
      .where(eq(stockVerificationTable.id, result.id))
      .execute();

    expect(stockVerifications).toHaveLength(1);
    const savedVerification = stockVerifications[0];
    expect(savedVerification.rider_id).toEqual(riderId);
    expect(savedVerification.store_id).toEqual(storeId);
    expect(savedVerification.verification_type).toEqual('start_day');
    expect(savedVerification.stock_data).toEqual('{"items": [{"product_id": 1, "quantity": 100}]}');
    expect(savedVerification.status).toEqual('pending');
    expect(savedVerification.created_at).toBeInstanceOf(Date);
    expect(savedVerification.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when rider does not exist', async () => {
    const input = createValidInput();
    input.rider_id = 99999; // Non-existent rider ID

    await expect(createStockVerification(input)).rejects.toThrow(/rider not found/i);
  });

  it('should throw error when user is not a rider', async () => {
    const input = createValidInput();
    input.rider_id = adminId; // Admin user, not a rider

    await expect(createStockVerification(input)).rejects.toThrow(/user is not a rider/i);
  });

  it('should throw error when store does not exist', async () => {
    const input = createValidInput();
    input.store_id = 99999; // Non-existent store ID

    await expect(createStockVerification(input)).rejects.toThrow(/store not found/i);
  });

  it('should create multiple stock verifications for same rider and store', async () => {
    const input1 = createValidInput();
    input1.verification_type = 'start_day';

    const input2 = createValidInput();
    input2.verification_type = 'end_day';

    const result1 = await createStockVerification(input1);
    const result2 = await createStockVerification(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.verification_type).toEqual('start_day');
    expect(result2.verification_type).toEqual('end_day');
    expect(result1.rider_id).toEqual(result2.rider_id);
    expect(result1.store_id).toEqual(result2.store_id);
  });
});
