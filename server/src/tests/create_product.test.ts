
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, usersTable, storesTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

describe('createProduct', () => {
  let testStoreId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user (store owner)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hashed_password',
        first_name: 'Store',
        last_name: 'Owner',
        phone: '+1234567890',
        role: 'store_staff'
      })
      .returning()
      .execute();

    // Create test store
    const storeResult = await db.insert(storesTable)
      .values({
        owner_id: userResult[0].id,
        name: 'Test Store',
        description: 'A test store',
        address: '123 Test St',
        latitude: '40.7128',
        longitude: '-74.0060',
        phone: '+1234567890',
        operating_hours: '{"monday": "9:00-17:00", "tuesday": "9:00-17:00"}',
        status: 'open'
      })
      .returning()
      .execute();

    testStoreId = storeResult[0].id;
  });

  afterEach(resetDB);

  const testInput: CreateProductInput = {
    store_id: 0, // Will be set in tests
    name: 'Test Product',
    description: 'A delicious test product',
    price: 19.99,
    category: 'Food',
    image_url: 'https://example.com/product.jpg'
  };

  it('should create a product', async () => {
    const input = { ...testInput, store_id: testStoreId };
    const result = await createProduct(input);

    // Basic field validation
    expect(result.name).toEqual('Test Product');
    expect(result.description).toEqual('A delicious test product');
    expect(result.price).toEqual(19.99);
    expect(typeof result.price).toBe('number');
    expect(result.category).toEqual('Food');
    expect(result.image_url).toEqual('https://example.com/product.jpg');
    expect(result.store_id).toEqual(testStoreId);
    expect(result.is_available).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database', async () => {
    const input = { ...testInput, store_id: testStoreId };
    const result = await createProduct(input);

    // Query using proper drizzle syntax
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Test Product');
    expect(products[0].description).toEqual('A delicious test product');
    expect(parseFloat(products[0].price)).toEqual(19.99);
    expect(products[0].category).toEqual('Food');
    expect(products[0].image_url).toEqual('https://example.com/product.jpg');
    expect(products[0].store_id).toEqual(testStoreId);
    expect(products[0].is_available).toBe(true);
    expect(products[0].created_at).toBeInstanceOf(Date);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create product with null optional fields', async () => {
    const input: CreateProductInput = {
      store_id: testStoreId,
      name: 'Simple Product',
      description: null,
      price: 9.99,
      category: 'Beverages',
      image_url: null
    };

    const result = await createProduct(input);

    expect(result.name).toEqual('Simple Product');
    expect(result.description).toBeNull();
    expect(result.price).toEqual(9.99);
    expect(result.category).toEqual('Beverages');
    expect(result.image_url).toBeNull();
    expect(result.is_available).toBe(true);
  });

  it('should throw error when store does not exist', async () => {
    const input = { ...testInput, store_id: 99999 };

    await expect(createProduct(input)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should handle decimal prices correctly', async () => {
    const input = { ...testInput, store_id: testStoreId, price: 12.50 };
    const result = await createProduct(input);

    expect(result.price).toEqual(12.50);
    expect(typeof result.price).toBe('number');

    // Verify in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(parseFloat(products[0].price)).toEqual(12.50);
  });
});
